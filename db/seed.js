import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

dotenv.config();

const resources = JSON.parse(readFileSync('./db/resources.json', 'utf-8'));
const bookings = JSON.parse(readFileSync('./db/bookings.json', 'utf-8'));
const users = JSON.parse(readFileSync('./db/users.json', 'utf-8'));
const comments = JSON.parse(readFileSync('./db/comments.json', 'utf-8'));

const client = new MongoClient(process.env.MONGODB_URI);
try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);
    const resourcesCollection = db.collection('resources');
    const bookingsCollection = db.collection('bookings');
    const usersCollection = db.collection('users');
    const commentsCollection = db.collection('comments');

       // Töm gammal data
    await bookingsCollection.deleteMany({});
    await resourcesCollection.deleteMany({});
    await usersCollection.deleteMany({});
    await commentsCollection.deleteMany({});

    // Seeda users
    const usersResult = await usersCollection.insertMany(users);

    // Seeda resources
    const resourceResult = await resourcesCollection.insertMany(resources);

    // Seeda bookings och koppla dem till rätt resource och rätt user
    const bookingsWithIds = [];

    for (const booking of bookings) {
        const resource = await resourcesCollection.findOne({
            name: booking.resource
        });

        const user = await usersCollection.findOne({
            email: booking.booked_by
        });

        bookingsWithIds.push({
            resource_id: resource._id,
            booked_by: user._id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status
        });
    }

    const bookingResult = await bookingsCollection.insertMany(bookingsWithIds);

    // Seeda comments och koppla dem till rätt resource
    const commentsWithIds = [];

    for (const comment of comments) {
        const resource = await resourcesCollection.findOne({
            name: comment.resource
        });

        const user = await usersCollection.findOne({
            email: comment.booked_by
        });

        const booking = await bookingsCollection.findOne({
            resource_id: resource._id,
            booked_by: user._id
        });



        commentsWithIds.push({
            booking_id: booking._id,
            booked_by: user._id,
            user_email: comment.booked_by,
            text: comment.text,
            created_at: comment.created_at
        });   
    }

    const commentsResult = await commentsCollection.insertMany(commentsWithIds);


    console.log(
        `Seeded ${usersResult.insertedCount} users, ${resourceResult.insertedCount} resources, ${bookingResult.insertedCount} bookings and ${commentsResult.insertedCount} commentsinto '${process.env.DATABASE_NAME}'`
    );
} finally {
    await client.close();
}
