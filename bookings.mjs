import { ObjectId } from 'mongodb';
import { connectDB } from './db/database.mjs';

const bookings = {
    getByResource: async function getByResource(resourceId) {
        const db = await connectDB();

        return db.collection('bookings')
            .find({ resource_id: new ObjectId(resourceId) })
            .sort({ start_time: 1 })
            .toArray();
    },

    addOne: async function addOne(body) {
        const db = await connectDB();

        const result = await db.collection('bookings').insertOne({
            resource_id: new ObjectId(body.resource_id),
            user: body.user,
            start_time: body.start_time,
            end_time: body.end_time,
            status: 'confirmed'
        });

        return { lastID: result.insertedId };
    },

    deleteOne: async function deleteOne(id) {
        const db = await connectDB();

        const result = await db.collection('bookings')
            .deleteOne({ _id: new ObjectId(id) });

        return { changes: result.deletedCount };
    }
};

export default bookings;