import { db } from "./db/database.mjs";
import { ObjectId } from "mongodb";

const resources = {
    getAll: async function getAll() {
        return await db.collection("resources").find().toArray();

        // res.json({ data: documents });

        // return db.prepare('SELECT * FROM resources').all();
    },
    getOne: async function getOne(id) {
        return await db.collection("resources").findOne({ _id: new ObjectId(id) });

        // return db.prepare('SELECT * FROM resources WHERE id = ?').get(id) || {};
    },
    addOne: async function addOne(body) {
        const { name, type, description, capacity } = body;
        const result = await db.collection("resources").insertOne({ 
            name: name, 
            type: type, 
            description: description, 
            capacity: capacity 
        });

        return { lastID: result.insertedId };
        // const result = db.prepare(
        //     'INSERT INTO resources (name, type, description, capacity) VALUES (?, ?, ?, ?)'
        // ).run(body.name, body.type, body.description, body.capacity || 1);
        // return { lastID: result.lastInsertRowid };
    },
    editOne: async function editOne(body) {
        const { name, type, description, capacity, id } = body;

        const result = db.collection("resources").updateOne({ _id: new ObjectId(id)}, {
            $set: {name: name, 
            type: type, 
            description: description, 
            capacity: capacity }
        });

        return { lastID: result.insertedId };

        // const result = db.prepare(
        //     'UPDATE resources SET name = ?, type = ?, description = ?, capacity = ? WHERE id = ?'
        // ).run(body.name, body.type, body.description, body.capacity, body.resource_id || 1);
        // return { lastID: result.lastInsertRowid };
    },
    deleteOne: async function deleteOne(id) {
        return db.collection("resources").deleteOne({ _id: new ObjectId(id) });
        // const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id);
        // return { changes: result.changes };
    }
};

export default resources;
