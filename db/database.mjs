import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectToDatabase() {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log("Connected to MongoDB");
}

export { connectToDatabase, db };







// import Database from 'better-sqlite3';
// import { existsSync, mkdirSync } from 'fs';

// if (!existsSync('./db')) {
//     mkdirSync('./db');
// }

// const dbFilename = process.env.NODE_ENV === 'test'
//     ? './db/test.db'
//     : './db/bookings.db';

// const db = new Database(dbFilename);
// db.pragma('journal_mode = WAL');
// db.pragma('foreign_keys = ON');

// db.exec(`
//     CREATE TABLE IF NOT EXISTS resources (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         name TEXT NOT NULL,
//         type TEXT,
//         description TEXT,
//         capacity INTEGER DEFAULT 1
//     )
// `);

// db.exec(`
//     CREATE TABLE IF NOT EXISTS bookings (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         resource_id INTEGER NOT NULL,
//         user TEXT NOT NULL,
//         start_time TEXT NOT NULL,
//         end_time TEXT NOT NULL,
//         status TEXT DEFAULT 'confirmed',
//         FOREIGN KEY (resource_id) REFERENCES resources(id)
//     )
// `);

// const count = db.prepare("SELECT COUNT(*) AS n FROM resources").get().n;

// if (count === 0) {
//     const seed = db.transaction(() => {
//         db.prepare(
//             "INSERT INTO resources (name, type, description, capacity) VALUES (?, ?, ?, ?)"
//         ).run("VM-01", "vm", "Ubuntu 24.04 – 4 vCPU, 8 GB RAM", 1);

//         db.prepare(
//             "INSERT INTO resources (name, type, description, capacity) VALUES (?, ?, ?, ?)"
//         ).run("VM-02", "vm", "Debian 12 – 2 vCPU, 4 GB RAM", 1);

//         db.prepare(
//             "INSERT INTO resources (name, type, description, capacity) VALUES (?, ?, ?, ?)"
//         ).run("GPU-server-1", "gpu", "NVIDIA T4 – för ML-arbetsbelastningar", 1);

//         db.prepare(
//             "INSERT INTO bookings (resource_id, user, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)"
//         ).run(1, "anna@student.bth.se", "2026-09-15 08:00", "2026-09-15 12:00", "confirmed");

//         db.prepare(
//             "INSERT INTO bookings (resource_id, user, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)"
//         ).run(2, "erik@student.bth.se", "2026-09-15 13:00", "2026-09-15 17:00", "confirmed");
//     });
//     seed();
// }

// export default db;
