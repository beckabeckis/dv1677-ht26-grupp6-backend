import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

dotenv.config();

const resources = JSON.parse(readFileSync('./db/resources.json', 'utf-8'));
const bookings = JSON.parse(readFileSync('./db/bookings.json', 'utf-8'));

const client = new MongoClient(process.env.MONGODB_URI);
try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);
    const resourcesCollection = db.collection('resources');
    const bookingsCollection = db.collection('bookings');

       // Töm gammal data
    await bookingsCollection.deleteMany({});
    await resourcesCollection.deleteMany({});

    // Seeda resources
    const resourceResult = await resourcesCollection.insertMany(resources);

    // Seeda bookings och koppla dem till rätt resource
    const bookingsWithIds = [];

    for (const booking of bookings) {
        const resource = await resourcesCollection.findOne({
            name: booking.resource
        });

        bookingsWithIds.push({
            resource_id: resource._id,
            user: booking.user,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status
        });
    }

    const bookingResult = await bookingsCollection.insertMany(bookingsWithIds);

    console.log(
        `Seeded ${resourceResult.insertedCount} resources and ${bookingResult.insertedCount} bookings into '${process.env.DATABASE_NAME}'`
    );
} finally {
    await client.close();
}
