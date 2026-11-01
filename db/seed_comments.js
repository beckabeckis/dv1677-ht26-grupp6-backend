import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

dotenv.config();

const comments = JSON.parse(readFileSync('./db/comments.json', 'utf-8'));

const client = new MongoClient(process.env.MONGODB_URI);


try {
    await client.connect();

    const db = client.db(process.env.DATABASE_NAME);
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

    const commentsWithIds = [];

    for (const comment of comments) {
        const resource = await resourcesCollection.findOne({
            name: comment.resource
        });

        
        const user = await usersCollection.findOne({
            email: comment.author
        });
        
        const booking = await bookingsCollection.findOne({
            resource_id: resource._id,
            booked_by: user._id
        });
        

        console.log(booking)

        const createdAt = new Date(comment.created_at)

        commentsWithIds.push({
            booking_id: booking._id,
            author: user._id,
            text: comment.text,
            created_at: createdAt
        });   
    }

    const commentsResult = await commentsCollection.insertMany(commentsWithIds);


    console.log(
        `Seeded ${commentsResult.insertedCount} comments into '${process.env.DATABASE_NAME}'`
    );
} finally {
    await client.close();
}
