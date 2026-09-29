import { MongoClient } from "mongodb";

let client;
let db;

async function connectDB() {
    client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    db = client.db(process.env.DATABASE_NAME || process.env.DB_NAME);

    console.log("Connected to MongoDB");

    return db;
}

async function closeDB() {
    if (client) {
        await client.close();
    }
}

// Behålls för Beckas befintliga kod
async function connectToDatabase() {
    await connectDB();
}

export {
    connectToDatabase,
    connectDB,
    closeDB,
    db
};