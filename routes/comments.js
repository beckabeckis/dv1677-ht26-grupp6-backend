import express from "express";
import { ObjectId } from "mongodb";
import { db } from "../db/database.mjs";
import { requireAuth } from "../middleware/auth.js";

const commentsRouter = express.Router();

const COMMENTS_COLLECTION = "comments";
const BOOKINGS_COLLECTION = "bookings";

// ========================================
// HELPERS
// ========================================

// Kontrollera MongoDB-ID
function isValidId(id) {
    return (
        typeof id === "string" &&
        /^[0-9a-fA-F]{24}$/.test(id)
    );
}

// Hämta bokning
async function findBooking(id) {
    return db.collection(BOOKINGS_COLLECTION).findOne({
        _id: new ObjectId(id)
    });
}

// Kontrollera vem som får ändra eller radera
function canManageComment(user, comment) {
    return (
        user.role === "admin" ||
        String(comment.author) === String(user._id)
    );
}

// Skicka Socket.io-händelse
// Vi skickar bara ID så att klienten hämtar
// kommentarerna via det autentiserade API:t.
function emitCommentEvent(req, booking, event, commentId) {
    req.io?.to(`resource:${booking.resource_id}`).emit(
        event,
        {
            booking_id: String(booking._id),
            comment_id: String(commentId)
        }
    );
}

// ========================================
// GET ALL COMMENTS
// ========================================

commentsRouter.get(
    "/comments",
    requireAuth,
    async (req, res) => {
        try {
            const comments = await db
                .collection(COMMENTS_COLLECTION)
                .find({})
                .sort({ created_at: 1 })
                .toArray();

            return res.json(comments);
        } catch (error) {
            console.error("GET comments error:", error);

            return res.status(500).json({
                error: "Could not fetch comments"
            });
        }
    }
);

// ========================================
// GET COMMENTS FOR ONE BOOKING
// ========================================

commentsRouter.get(
    "/comments/booking/:id",
    requireAuth,
    async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({
                    error: "Invalid booking id"
                });
            }

            const booking = await findBooking(
                req.params.id
            );

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found"
                });
            }

            const comments = await db
                .collection(COMMENTS_COLLECTION)
                .find({
                    booking_id: booking._id
                })
                .sort({ created_at: 1 })
                .toArray();

            return res.json(comments);
        } catch (error) {
            console.error(
                "GET booking comments error:",
                error
            );

            return res.status(500).json({
                error: "Could not fetch booking comments"
            });
        }
    }
);

// ========================================
// GET COMMENTS BY USER
// ========================================

commentsRouter.get(
    "/comments/user/:id",
    requireAuth,
    async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({
                    error: "Invalid user id"
                });
            }

            const userId = new ObjectId(
                req.params.id
            );

            // Användaren får se sina egna kommentarer.
            // Administratören får se alla användares.
            if (
                req.user.role !== "admin" &&
                String(req.user._id) !== String(userId)
            ) {
                return res.status(403).json({
                    error: "Forbidden"
                });
            }

            const comments = await db
                .collection(COMMENTS_COLLECTION)
                .find({
                    author: userId
                })
                .sort({ created_at: 1 })
                .toArray();

            return res.json(comments);
        } catch (error) {
            console.error(
                "GET user comments error:",
                error
            );

            return res.status(500).json({
                error: "Could not fetch user comments"
            });
        }
    }
);

// ========================================
// GET ONE COMMENT
// ========================================

commentsRouter.get(
    "/comments/:id",
    requireAuth,
    async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({
                    error: "Invalid comment id"
                });
            }

            const comment = await db
                .collection(COMMENTS_COLLECTION)
                .findOne({
                    _id: new ObjectId(req.params.id)
                });

            if (!comment) {
                return res.status(404).json({
                    error: "Comment not found"
                });
            }

            return res.json(comment);
        } catch (error) {
            console.error(
                "GET comment error:",
                error
            );

            return res.status(500).json({
                error: "Could not fetch comment"
            });
        }
    }
);

// ========================================
// POST CREATE COMMENT
// ========================================

commentsRouter.post(
    "/comments",
    requireAuth,
    async (req, res) => {
        try {
            const { booking_id, text } = req.body;

            if (!isValidId(booking_id)) {
                return res.status(400).json({
                    error: "Invalid booking id"
                });
            }

            if (
                typeof text !== "string" ||
                text.trim().length === 0
            ) {
                return res.status(400).json({
                    error: "Comment text is required"
                });
            }

            if (text.trim().length > 2000) {
                return res.status(400).json({
                    error:
                        "Comment is too long (max 2000 characters)"
                });
            }

            const booking = await findBooking(
                booking_id
            );

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found"
                });
            }

            const comment = {
                booking_id: booking._id,
                author: new ObjectId(
                    String(req.user._id)
                ),
                text: text.trim(),
                created_at: new Date()
            };

            const result = await db
                .collection(COMMENTS_COLLECTION)
                .insertOne(comment);

            const savedComment = {
                ...comment,
                _id: result.insertedId
            };

            emitCommentEvent(
                req,
                booking,
                "comment:created",
                savedComment._id
            );

            return res.status(201).json(
                savedComment
            );
        } catch (error) {
            console.error(
                "POST comment error:",
                error
            );

            return res.status(500).json({
                error: "Could not create comment"
            });
        }
    }
);

// ========================================
// PUT UPDATE COMMENT
// ========================================

commentsRouter.put(
    "/comments/:id",
    requireAuth,
    async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({
                    error: "Invalid comment id"
                });
            }

            const { text } = req.body;

            if (
                typeof text !== "string" ||
                text.trim().length === 0
            ) {
                return res.status(400).json({
                    error: "Comment text is required"
                });
            }

            if (text.trim().length > 2000) {
                return res.status(400).json({
                    error:
                        "Comment is too long (max 2000 characters)"
                });
            }

            const comment = await db
                .collection(COMMENTS_COLLECTION)
                .findOne({
                    _id: new ObjectId(req.params.id)
                });

            if (!comment) {
                return res.status(404).json({
                    error: "Comment not found"
                });
            }

            if (
                !canManageComment(
                    req.user,
                    comment
                )
            ) {
                return res.status(403).json({
                    error:
                        "You cannot edit this comment"
                });
            }

            const booking = await db
                .collection(BOOKINGS_COLLECTION)
                .findOne({
                    _id: comment.booking_id
                });

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found"
                });
            }

            const updatedAt = new Date();

            await db
                .collection(COMMENTS_COLLECTION)
                .updateOne(
                    {
                        _id: comment._id
                    },
                    {
                        $set: {
                            text: text.trim(),
                            updated_at: updatedAt
                        }
                    }
                );

            const updatedComment = {
                ...comment,
                text: text.trim(),
                updated_at: updatedAt
            };

            emitCommentEvent(
                req,
                booking,
                "comment:updated",
                updatedComment._id
            );

            return res.json(updatedComment);
        } catch (error) {
            console.error(
                "PUT comment error:",
                error
            );

            return res.status(500).json({
                error: "Could not update comment"
            });
        }
    }
);

// ========================================
// DELETE COMMENT
// ========================================

commentsRouter.delete(
    "/comments/:id",
    requireAuth,
    async (req, res) => {
        try {
            if (!isValidId(req.params.id)) {
                return res.status(400).json({
                    error: "Invalid comment id"
                });
            }

            const comment = await db
                .collection(COMMENTS_COLLECTION)
                .findOne({
                    _id: new ObjectId(req.params.id)
                });

            if (!comment) {
                return res.status(404).json({
                    error: "Comment not found"
                });
            }

            if (
                !canManageComment(
                    req.user,
                    comment
                )
            ) {
                return res.status(403).json({
                    error:
                        "You cannot delete this comment"
                });
            }

            const booking = await db
                .collection(BOOKINGS_COLLECTION)
                .findOne({
                    _id: comment.booking_id
                });

            if (!booking) {
                return res.status(404).json({
                    error: "Booking not found"
                });
            }

            const result = await db
                .collection(COMMENTS_COLLECTION)
                .deleteOne({
                    _id: comment._id
                });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    error: "Comment not found"
                });
            }

            emitCommentEvent(
                req,
                booking,
                "comment:deleted",
                comment._id
            );

            return res.json({
                message: "Comment deleted",
                id: comment._id
            });
        } catch (error) {
            console.error(
                "DELETE comment error:",
                error
            );

            return res.status(500).json({
                error: "Could not delete comment"
            });
        }
    }
);

export default commentsRouter;