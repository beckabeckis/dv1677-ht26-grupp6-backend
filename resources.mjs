import { ObjectId } from 'mongodb';
import { connectDB } from './db/database.mjs';

const resources = {
    getAll: async function getAll() {
        const db = await connectDB();

        return db.collection('resources')
            .find({})
            .toArray();
    },

    getOne: async function getOne(id) {
        const db = await connectDB();

        return await db.collection('resources')
            .findOne({ _id: new ObjectId(id) }) || {};
    },

    addOne: async function addOne(body) {
        const db = await connectDB();

        const result = await db.collection('resources').insertOne({
            name: body.name,
            type: body.type,
            description: body.description,
            capacity: body.capacity || 1
        });

        return { lastID: result.insertedId };
    },

    editOne: async function editOne(id, body) {
        const db = await connectDB();

        const result = await db.collection('resources').updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    name: body.name,
                    type: body.type,
                    description: body.description,
                    capacity: body.capacity
                }
            }
        );

        return { changes: result.modifiedCount };
    },

    deleteOne: async function deleteOne(id) {
        const db = await connectDB();

        const result = await db.collection('resources')
            .deleteOne({ _id: new ObjectId(id) });

        return { changes: result.deletedCount };
    }
};

export default resources;