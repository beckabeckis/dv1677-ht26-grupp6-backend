import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';
import { getBrokerInfo } from '../broker.mjs';

const bookingsRouter = express.Router();

// ========================================
// BOOKINGS
// ========================================

const BOOKINGS_COLLECTION = "bookings";

// GET all bookings
bookingsRouter.get('/bookings', requireAuth, async (req, res) => {
    const query = req.user.role === 'admin' ? {} : { booked_by: req.user._id }
    try {
        const bookings = await db.collection(BOOKINGS_COLLECTION)
            .find(query)
            .sort({ startsAt: 1 })
            .toArray();

        console.log("GET bookings ok");

        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all bookings of a resource
bookingsRouter.get('/bookings/resource/:id', requireAuth, async (req, res) => {
    try {
        const bookings = await db.collection(BOOKINGS_COLLECTION)
            .find({ resource_id: new ObjectId(req.params.id) })
            .sort({ start_time: 1 })
            .toArray();

        console.log("GET bookings ok");

        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one booking
bookingsRouter.get('/bookings/:id', requireAuth, async (req, res) => {
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
bookingsRouter.post('/bookings', requireAuth, async (req, res) => {
    const start = new Date(req.body.start_time)
    const end = new Date(req.body.end_time)
    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ error: 'Invalid time range' })
    }
    try {
        const booking = {
            resource_id: new ObjectId(req.body.resource_id),
            booked_by: new ObjectId(req.body.booked_by),
            start_time: start,
            end_time: end,
            status: req.body.status || 'confirmed',
            created_at: new Date(),
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
bookingsRouter.put('/bookings/:id', requireAuth, async (req, res) => {
    const start = new Date(req.body.start_time)
    const end = new Date(req.body.end_time)
    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ error: 'Invalid time range' })
    }
    try {
        const booking = {
            resource_id: new ObjectId(req.body.resource_id),
            booked_by: new ObjectId(req.body.booked_by),
            start_time: start,
            end_time: end,
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
bookingsRouter.delete('/booking/delete/:id', requireAuth, requireAdmin, async (req, res) => {
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

bookingsRouter.delete('/booking/cancel/:id', requireAuth, async ( req, res ) => {
    let id
    try { id = new ObjectId(req.params.id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

    const booking = await db.collection('bookings').findOne({ _id: id })
    if (!booking) return res.status(404).json({ error: 'Not found' })

    await db.collection('bookings').updateOne({ _id: id }, { $set: { status: 'cancelled' } })


    res.json({ message: 'Booking cancelled' })
})


// ========================================
// BROKER
// ========================================

// GET broker connection information
bookingsRouter.get('/broker/whoami', async (req, res) => {
    try {
        const info = await getBrokerInfo();
        res.json(info);
    }
    catch (error) {
        res.status(502).json({
            error: 'Kunde inte kontakta brokern'
        });
    }
});

export default bookingsRouter;