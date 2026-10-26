import express from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';
import { getAvailability } from '../domain/availability.js';

const resourcesRouter = express.Router();

// ========================================
// RESOURCES
// ========================================

const RESOURCES_COLLECTION = "resources";

// GET all resources
resourcesRouter.get('/resources', async (req, res) => {
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
resourcesRouter.get('/resources/:id', async (req, res) => {
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
resourcesRouter.post('/resources', async (req, res) => {
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
resourcesRouter.put('/resources/:id', async (req, res) => {
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
resourcesRouter.delete('/resources/:id', async (req, res) => {
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

// GET availability
resourcesRouter.get('/resources/:id/availability', async (req, res) => {
    const { date } = req.query
    if (!date) {
        return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })
    }
    const slots = await getAvailability(req.params.id, date)
    res.json(slots)
});



export default resourcesRouter;
