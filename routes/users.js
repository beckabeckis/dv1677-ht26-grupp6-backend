import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';

const usersRouter = express.Router();


// ========================================
// USERS
// ========================================

const USERS_COLLECTION = "users";

// GET all users
usersRouter.get('/users', async (req, res) => {
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
usersRouter.get('/users/:id', async (req, res) => {
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
usersRouter.post('/users', async (req, res) => {
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
usersRouter.put('/users/:id', async (req, res) => {
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
usersRouter.delete('/users/:id', async (req, res) => {
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


export default usersRouter;
