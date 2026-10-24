
import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';
import { broker, BrokerError } from '../config/broker.js';

const bookingsRouter = express.Router();

const BOOKINGS_COLLECTION = 'bookings';

// GET all bookings
bookingsRouter.get('/bookings', requireAuth, async (req, res) => {
    const query = req.user.role === 'admin'
        ? {}
        : { booked_by: req.user._id };

    try {
        const bookings = await db.collection(BOOKINGS_COLLECTION)
            .find(query)
            .sort({ start_time: 1 })
            .project({ broker: 0 })
            .toArray();

        console.log('GET bookings ok');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all bookings of a resource
bookingsRouter.get('/bookings/resource/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid resource id' });
        }

        const bookings = await db.collection(BOOKINGS_COLLECTION)
            .find({ resource_id: new ObjectId(req.params.id) })
            .sort({ start_time: 1 })
            .project({ broker: 0 })
            .toArray();

        console.log('GET resource bookings ok');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one booking
bookingsRouter.get('/bookings/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid booking id' });
        }

        const booking = await db.collection(BOOKINGS_COLLECTION)
            .findOne({ _id: new ObjectId(req.params.id) });

        if (!booking) {
            return res.status(404).json({
                error: 'booking could not be found'
            });
        }

        if (
            req.user.role !== 'admin' &&
            String(booking.booked_by) !== String(req.user._id)
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { broker: brokerData, ...publicBooking } = booking;

        res.json(publicBooking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create new booking
bookingsRouter.post('/bookings', requireAuth, async (req, res) => {
    try {
        const resourceId = req.body.resource_id;
        const user = String(req.body.booked_by);
        const startsAt = req.body.start_time;
        const endsAt = req.body.end_time;
        const want = req.body.want;

        if (
            !ObjectId.isValid(resourceId) ||
            !ObjectId.isValid(user)
        ) {
            return res.status(400).json({
                error: 'Invalid resource or user id'
            });
        }

        if (
            req.user.role !== 'admin' &&
            user !== String(req.user._id)
        ) {
            return res.status(403).json({
                error: 'You can only book for yourself'
            });
        }

        const start = new Date(startsAt);
        const end = new Date(endsAt);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start >= end
        ) {
            return res.status(400).json({
                error: 'Invalid time range'
            });
        }

        const resource = await db.collection('resources')
            .findOne({ _id: new ObjectId(resourceId) });

        if (!resource) {
            return res.status(404).json({
                error: 'Resource not found'
            });
        }

        const bookingId = new ObjectId();

        // Beckas brokerintegration
        const payload = resource.provider === 'maas'
            ? {
                systemId: resource.externalId,
                user,
                startsAt,
                endsAt,
                idempotencyKey: String(bookingId)
            }
            : {
                want,
                user,
                startsAt,
                endsAt,
                idempotencyKey: String(bookingId)
            };

        let allocation;

        try {
            const result = await broker.allocate(
                resource.provider,
                payload
            );

            allocation = result.allocation;
        } catch (err) {
            if (!(err instanceof BrokerError)) {
                throw err;
            }

            if (err.status === 409) {
                return res.status(409).json({
                    error: 'Booking denied',
                    code: err.code
                });
            }

            return res.status(503).json({
                error: 'Booking service unavailable',
                code: err.code
            });
        }

        const booking = {
            _id: bookingId,
            resource_id: new ObjectId(resourceId),
            booked_by: new ObjectId(user),
            start_time: start,
            end_time: end,
            status: req.body.status || 'confirmed',
            created_at: new Date(),
            broker: {
                allocationId: allocation.id,
                secret: allocation.secret
            }
        };

        await db.collection(BOOKINGS_COLLECTION).insertOne(booking);

        const { broker: brokerData, ...publicBooking } = booking;

        // Socket.io: ny bokning
        req.io?.to(`resource:${booking.resource_id}`).emit(
            'booking:created',
            publicBooking
        );

        res.status(201).json({ booking: publicBooking });
    } catch (error) {
        console.error('POST booking error:', error);

        res.status(500).json({
            error: 'Could not create booking'
        });
    }
});

// PUT update booking
bookingsRouter.put('/bookings/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid booking id'
            });
        }

        const bookingID = new ObjectId(req.params.id);
        const end = new Date(req.body.end_time);

        if (Number.isNaN(end.getTime())) {
            return res.status(400).json({
                error: 'Invalid end time'
            });
        }

        const previousBooking = await db.collection(BOOKINGS_COLLECTION)
            .findOne({ _id: bookingID });

        if (!previousBooking) {
            return res.status(404).json({
                error: 'booking not found',
                id: req.params.id
            });
        }

        if (
            req.user.role !== 'admin' &&
            String(previousBooking.booked_by) !== String(req.user._id)
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (previousBooking.status === 'cancelled') {
            return res.status(409).json({
                error: 'Cannot update a cancelled booking'
            });
        }

        if (end <= new Date(previousBooking.start_time)) {
            return res.status(400).json({
                error: 'End time must be after start time'
            });
        }

        // Rättat: resource_id i stället för resourceId
        const resource = await db.collection('resources')
            .findOne({ _id: previousBooking.resource_id });

        if (!resource) {
            return res.status(404).json({
                error: 'Resource not found'
            });
        }

        // Beckas brokerintegration
        if (previousBooking.broker?.secret) {
            try {
                await broker.extend(
                    resource.provider,
                    previousBooking.broker.allocationId,
                    previousBooking.broker.secret,
                    end
                );
            } catch (err) {
                if (!(err instanceof BrokerError)) {
                    throw err;
                }

                return res.status(503).json({
                    error: 'Could not extend time',
                    code: err.code
                });
            }
        }

        const result = await db.collection(BOOKINGS_COLLECTION)
            .updateOne(
                { _id: bookingID },
                { $set: { end_time: end } }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'booking not found',
                id: req.params.id
            });
        }

        // Rättat: updatedBooking definieras innan den används
        const updatedBooking = {
            ...previousBooking,
            end_time: end
        };

        const { broker: brokerData, ...publicBooking } = updatedBooking;

        // Socket.io: uppdaterad bokning
        req.io?.to(`resource:${previousBooking.resource_id}`).emit(
            'booking:updated',
            publicBooking
        );

        res.json({ message: 'PUT ok' });
    } catch (error) {
        console.error('PUT booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE cancel booking
bookingsRouter.delete('/booking/cancel/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                error: 'Invalid booking id'
            });
        }

        const bookingID = new ObjectId(req.params.id);

        const booking = await db.collection(BOOKINGS_COLLECTION)
            .findOne({ _id: bookingID });

        if (!booking) {
            return res.status(404).json({
                error: 'Not found'
            });
        }

        if (
            req.user.role !== 'admin' &&
            String(booking.booked_by) !== String(req.user._id)
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (booking.status === 'cancelled') {
            return res.status(409).json({
                error: 'Booking already cancelled'
            });
        }

        // Rättat: resource_id i stället för resourceId
        const resource = await db.collection('resources')
            .findOne({ _id: booking.resource_id });

        if (!resource) {
            return res.status(404).json({
                error: 'Resource not found'
            });
        }

        // Beckas brokerintegration
        if (booking.broker?.secret) {
            try {
                await broker.withdraw(
                    resource.provider,
                    booking.broker.allocationId,
                    booking.broker.secret
                );
            } catch (err) {
                if (!(err instanceof BrokerError)) {
                    throw err;
                }

                return res.status(503).json({
                    error: 'Could not cancel at provider',
                    code: err.code
                });
            }
        }

        await db.collection(BOOKINGS_COLLECTION)
            .updateOne(
                { _id: bookingID },
                { $set: { status: 'cancelled' } }
            );

        const cancelledBooking = {
            ...booking,
            status: 'cancelled'
        };

        const { broker: brokerData, ...publicBooking } = cancelledBooking;

        // Socket.io: avbokning
        req.io?.to(`resource:${booking.resource_id}`).emit(
            'booking:canceled',
            publicBooking
        );

        // Frontenden lyssnar även på booking:updated
        req.io?.to(`resource:${booking.resource_id}`).emit(
            'booking:updated',
            publicBooking
        );

        res.json({ message: 'Booking cancelled' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default bookingsRouter;
