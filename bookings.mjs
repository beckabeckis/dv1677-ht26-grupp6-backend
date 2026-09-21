import { db } from "./db/database.mjs";
import { ObjectId } from "mongodb";

const bookings = {
    getByResource: async function getByResource(resourceId) {
        return await db.collection("bookings").find({ resource_id: new ObjectId(resourceId) }).sort({ start_time: 1 }).toArray();

        // return db.prepare(
        //     'SELECT * FROM bookings WHERE resource_id = ? ORDER BY start_time'
        // ).all(resourceId);
    },
    addOne: async function addOne(body) {
        const { resource_id, user, start_time, end_time } = body;
        const result = await db.collection("bookings").insertOne({ 
            resource_id: new ObjectId(resource_id), 
            user: user, 
            start_time: start_time, 
            end_time: end_time 
        });

        return { lastID: result.insertedId };

        // const result = db.prepare(
        //     'INSERT INTO bookings (resource_id, user, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)'
        // ).run(body.resource_id, body.user, body.start_time, body.end_time, 'confirmed');
        // return { lastID: result.lastInsertRowid };
    },
    editOne: async function editOne(body) {
        const { resource_id, user, start_time, end_time, id } = body;

        const result = db.collection("bookings").updateOne({ _id: new ObjectId(id)}, {
            $set: {resource_id: new ObjectId(resource_id), 
            user: user, 
            start_time: start_time, 
            end_time: end_time  }
        });

        return { lastID: result.insertedId };

        // const result = db.prepare(
        //     'UPDATE resources SET name = ?, type = ?, description = ?, capacity = ? WHERE id = ?'
        // ).run(body.name, body.type, body.description, body.capacity, body.resource_id || 1);
        // return { lastID: result.lastInsertRowid };
    },
    deleteOne: async function deleteOne(id) {
        const result = db.collection("bookings").deleteOne({ _id: new ObjectId(id) });

        return { changes: result.deletedCount };

        // const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
        // return { changes: result.changes };
    }
};

export default bookings;
