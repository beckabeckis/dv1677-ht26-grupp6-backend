import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { ObjectId } from 'mongodb';
import { db } from '../db/database.mjs';
import { broker, BrokerError} from "../config/broker.js";

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

// POST create new booking
bookingsRouter.post('/bookings', requireAuth, async (req, res) => {
    const resourceId = req.body.resource_id
    const user = String(req.body.booked_by)
    const startsAt = req.body.start_time
    const endsAt = req.body.end_time
    const want = req.body.want

    const resource = await db.collection('resources').findOne({ _id: new ObjectId(resourceId) })
    if (!resource) return res.status(404).json({ error: 'Resource not found' })

    const bookingId = new ObjectId()
    const payload = resource.provider === 'maas'
        ? { systemId: resource.externalId, user, startsAt, endsAt, idempotencyKey: String(bookingId) }
        : { want, user, startsAt, endsAt, idempotencyKey: String(bookingId) }


    const start = new Date(startsAt)
    const end = new Date(endsAt)
    if (isNaN(start) || isNaN(end) || start >= end) {
        return res.status(400).json({ error: 'Invalid time range' })
    }

    try {
        const { allocation } = await broker.allocate(resource.provider, payload)

        const booking = {
            _id: bookingId, 
            resource_id: new ObjectId(resourceId),
            booked_by: new ObjectId(user),
            start_time: start,
            end_time: end,
            status: req.body.status || 'confirmed',
            created_at: new Date(),
        };
        

        const result = await db.collection(BOOKINGS_COLLECTION)
            .insertOne({...booking,
            broker: { allocationId: allocation.id, secret: allocation.secret },
            });

        req.io?.to(`resource:${booking.resource_id}`).emit(
            'booking:created',
            {
                _id: result.insertedId,
                ...booking
            }
        );

        res.status(201).json({
            booking
        });
    } catch (err) {
        if (!(err instanceof BrokerError)) throw err
        if (err.status === 409) return res.status(409).json({ error: 'Booking denied', code: err.code })
        return res.status(503).json({ error: 'Booking service unavailable', code: err.code })
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
        let bookingID
        try { bookingID = new ObjectId(req.params.id) } catch { return res.status(400).json({ error: 'Invalid id' }) }


        // Hämta tidigare bokning för att känna till resursen
        const previousBooking = await db.collection(BOOKINGS_COLLECTION)
            .findOne({ _id: bookingID });

        if (!previousBooking) {
            return res.status(404).json({
                error: 'booking not found',
                id: req.params.id
            });
        }

        const resource = await db.collection('resources').findOne({ _id: previousBooking.resourceId })

        if (previousBooking.broker?.secret) {
            try {
                await broker.extend(resource.provider, previousBooking.broker.allocationId, previousBooking.broker.secret, end)
            } catch (err) {
                if (!(err instanceof BrokerError)) throw err
                return res.status(503).json({ error: 'Could not cancel at provider', code: err.code })
            }
        }
         
        const booking = {
            resource_id: new ObjectId(req.body.resource_id),
            booked_by: new ObjectId(req.body.booked_by),
            start_time: start,
            end_time: end,
            status: req.body.status
        };

        const result = await db.collection(BOOKINGS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(bookingID) },
                { $set: booking }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: 'booking not found',
                id: bookingID
            });
        }

        // Socket.io: meddela användare som följer resursen
        req.io?.to(`resource:${booking.resource_id}`).emit(
            'booking:updated',
            updatedBooking
        );

        // Om bokningen flyttats till en annan resurs
        // behöver även den tidigare resursens kalender uppdateras
        if (String(previousBooking.resource_id) !== String(booking.resource_id)) {
            req.io?.to(`resource:${previousBooking.resource_id}`).emit(
                'booking:updated',
                updatedBooking
            );
        }

        res.json({ message: 'PUT ok' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE booking
// bookingsRouter.delete('/booking/delete/:id', requireAuth, requireAdmin, async (req, res) => {
//     try {

//         const bookingId = new ObjectId(req.params.id);
        
//         // Hämta bokningen innan den raderas
//         const booking = await db.collection(BOOKINGS_COLLECTION)
//             .findOne({ _id: bookingId });

//         if (!booking) {
//             return res.status(404).json({
//                 error: 'booking not found'
//             });
//         }

//         const result = await db.collection(BOOKINGS_COLLECTION)
//             .deleteOne({ _id: new ObjectId(bookingId) });

//         if (result.deletedCount === 0) {
//             return res.status(404).json({
//                 error: 'booking not found'
//             });
//         }

//         // Socket.io: meddela att bokningen tagits bort
//         req.io?.to(`resource:${booking.resource_id}`).emit(
//             'booking:deleted',
//             {
//                 _id: booking._id,
//                 resource_id: booking.resource_id
//             }
//         );

//         res.json({ message: 'DELETE ok' });
//     }
//     catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// Cancel booking
bookingsRouter.delete('/booking/cancel/:id', requireAuth, async ( req, res ) => {
    let bookingID
    try { bookingID = new ObjectId(req.params.id) } catch { return res.status(400).json({ error: 'Invalid id' }) }

    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingID) })
    if (!booking) return res.status(404).json({ error: 'Not found' })
    // (kontrollera behörighet precis som i era övriga routes)

    const resource = await db.collection('resources').findOne({ _id: booking.resourceId })

    if (booking.broker?.secret) {
        try {
            await broker.withdraw(resource.provider, booking.broker.allocationId, booking.broker.secret)
        } catch (err) {
            if (!(err instanceof BrokerError)) throw err
            return res.status(503).json({ error: 'Could not cancel at provider', code: err.code })
        }
    }

    await db.collection('bookings').updateOne({ _id: bookingID }, { $set: { status: 'cancelled' } })

    // Socket.io: meddela att bokningen bokats av
    // req.io?.to(`resource:${booking.resource_id}`).emit(
    //     'booking:canceled',
    //     {
    //         _id: booking._id,
    //         resource_id: booking.resource_id
    //     }
    // );

    res.json({ message: 'Booking cancelled' })
})

export default bookingsRouter;