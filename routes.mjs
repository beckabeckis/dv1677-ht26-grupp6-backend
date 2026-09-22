import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from './db/database.mjs';

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
// BOOKINGS
// ========================================

const BOOKINGS_COLLECTION = "bookings";

// GET all bookings
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await db.collection(BOOKINGS_COLLECTION)
            .find({})
            .toArray();

        console.log("GET bookings ok");

        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one booking
router.get('/bookings/:id', async (req, res) => {
    try {
        const booking = await db.collection(BOOKINGS_COLLECTION)
            .findOne({ _id: new ObjectId(req.params.id) });

        if (!booking) {
            return res.status(404).json({
                error: 'booking could not be found'
            });
        }

        console.info(`GET /api/bookings/:id -> ${req.params.id} ok`);

        res.json(booking);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST booking
router.post('/bookings', async (req, res) => {
    try {
        const booking = {
            resource_id: new ObjectId(req.body.resource_id),
            user: req.body.user,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            status: req.body.status || 'confirmed'
        };

        const result = await db.collection(BOOKINGS_COLLECTION)
            .insertOne(booking);

        res.status(201).json({
            _id: result.insertedId,
            ...booking
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT booking
router.put('/bookings/:id', async (req, res) => {
    try {
        const booking = {
            resource_id: new ObjectId(req.body.resource_id),
            user: req.body.user,
            start_time: req.body.start_time,
            end_time: req.body.end_time,
            status: req.body.status
        };

        const result = await db.collection(BOOKINGS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: booking }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'booking not found',
                id: req.params.id
            });
        }

        res.json({ message: 'PUT ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE booking
router.delete('/bookings/:id', async (req, res) => {
    try {
        const result = await db.collection(BOOKINGS_COLLECTION)
            .deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: 'booking not found'
            });
        }

        res.json({ message: 'DELETE ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;