import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';
import { getBrokerInfo } from '../broker.mjs';
import { register, login } from '../controllers/authController.js'

const router = express.Router();

// ========================================
// RESOURCES
// ========================================

const RESOURCES_COLLECTION = "resources";

// GET all resources
router.get('/resources', async (req, res) => {
    try {
        const resources = await db.collection(RESOURCES_COLLECTION)
            .find({})
            .toArray();

        console.log("GET resources ok");

        res.json(resources);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one resource
router.get('/resources/:id', async (req, res) => {
    try {
        const resource = await db.collection(RESOURCES_COLLECTION)
            .findOne({ _id: new ObjectId(req.params.id) });

        if (!resource) {
            return res.status(404).json({
                error: 'resource could not be found'
            });
        }

        console.info(`GET /api/resources/:id -> ${req.params.id} ok`);

        res.json(resource);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST resource
router.post('/resources', async (req, res) => {
    try {
        const result = await db.collection(RESOURCES_COLLECTION)
            .insertOne(req.body);

        res.status(201).json({
            _id: result.insertedId,
            ...req.body
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT resource
router.put('/resources/:id', async (req, res) => {
    try {
        const result = await db.collection(RESOURCES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'resource not found',
                id: req.params.id
            });
        }

        res.json({ message: 'PUT ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE resource
router.delete('/resources/:id', async (req, res) => {
    try {
        const result = await db.collection(RESOURCES_COLLECTION)
            .deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'resource not found'
            });
        }

        res.json({ message: 'DELETE ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ========================================
// USERS
// ========================================

const USERS_COLLECTION = "users";

// GET all users
router.get('/users', async (req, res) => {
    try {
        const users = await db.collection(USERS_COLLECTION)
            .find({})
            .toArray();

        console.log("GET users ok");

        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one user
router.get('/users/:id', async (req, res) => {
    try {
        const user = await db.collection(USERS_COLLECTION)
            .findOne({ _id: new ObjectId(req.params.id) });

        if (!user) {
            return res.status(404).json({
                error: 'user could not be found'
            });
        }

        console.info(`GET /api/users/:id -> ${req.params.id} ok`);

        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST user
router.post('/users', async (req, res) => {
    try {
        const result = await db.collection(USERS_COLLECTION)
            .insertOne(req.body);

        res.status(201).json({
            _id: result.insertedId,
            ...req.body
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT user
router.put('/users/:id', async (req, res) => {
    try {
        const result = await db.collection(USERS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'user not found',
                id: req.params.id
            });
        }

        res.json({ message: 'PUT ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
    try {
        const result = await db.collection(USERS_COLLECTION)
            .deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'user not found'
            });
        }

        res.json({ message: 'DELETE ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// COMMENTS
// ========================================

const COMMENTS_COLLECTION = "comments";

// GET all comments
router.get('/comments', async (req, res) => {
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
router.get('/comments/booking/:id', async (req, res) => {
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
router.get('/comments/user/:id', async (req, res) => {
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
router.get('/comments/:id', async (req, res) => {
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
router.post('/comments', async (req, res) => {
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
router.put('/comments/:id', async (req, res) => {
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
router.delete('/comments/:id', async (req, res) => {
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



export default router;
