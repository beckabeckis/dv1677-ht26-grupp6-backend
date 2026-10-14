import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';

const commentsRouter = express.Router();


// ========================================
// COMMENTS
// ========================================

const COMMENTS_COLLECTION = "comments";

// GET all comments
commentsRouter.get('/comments', async (req, res) => {
    try {
        const comments = await db.collection(COMMENTS_COLLECTION)
            .find({})
            .toArray();

        console.log("GET comments ok");

        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all comments of a booking
commentsRouter.get('/comments/booking/:id', async (req, res) => {
    try {
        const comments = await db.collection(COMMENTS_COLLECTION)
            .find({ booking_id: new ObjectId(req.params.id) })
            .sort({ start_time: 1 })
            .toArray();

        console.log("GET comments ok");

        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all comments of a user
commentsRouter.get('/comments/user/:id', async (req, res) => {
    try {
        const comments = await db.collection(COMMENTS_COLLECTION)
            .find({ booked_by: new ObjectId(req.params.id) })
            .sort({ start_time: 1 })
            .toArray();

        console.log("GET comments ok");

        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one comment
commentsRouter.get('/comments/:id', async (req, res) => {
    try {
        const comment = await db.collection(COMMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(req.params.id) });

        if (!comment) {
            return res.status(404).json({
                error: 'comment could not be found'
            });
        }

        console.info(`GET /api/comments/:id -> ${req.params.id} ok`);

        res.json(comment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST comment
commentsRouter.post('/comments', async (req, res) => {
    try {
        const comment = {
            booking_id: new ObjectId(req.body.booking_id),
            booked_by: new ObjectId(req.body.booked_by),
            user_email: req.body.user_email,
            text: req.body.text,
            created_at: req.body.created_at
        };

        const result = await db.collection(COMMENTS_COLLECTION)
            .insertOne(comment);

        res.status(201).json({
            _id: result.insertedId,
            ...comment
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT comment
commentsRouter.put('/comments/:id', async (req, res) => {
    try {
        const comment = {
            booking_id: new ObjectId(req.body.booking_id),
            booked_by: new ObjectId(req.body.booked_by),
            user_email: req.body.user_email,
            text: req.body.text,
            created_at: req.body.created_at
        };

        const result = await db.collection(COMMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: comment }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'comment not found',
                id: req.params.id
            });
        }

        res.json({ message: 'PUT ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE comment
commentsRouter.delete('/comments/:id', async (req, res) => {
    try {
        const result = await db.collection(COMMENTS_COLLECTION)
            .deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'comment not found'
            });
        }

        res.json({ message: 'DELETE ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});



export default commentsRouter;
