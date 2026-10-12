import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';


dotenv.config();

const resources = JSON.parse(readFileSync('./db/resources.json', 'utf-8'));
const bookings = JSON.parse(readFileSync('./db/bookings.json', 'utf-8'));
const users = JSON.parse(readFileSync('./db/users.json', 'utf-8'));
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

    console.log()
    const passwordHash0 = await bcrypt.hash(users[0].password, 10)
    const passwordHash1 = await bcrypt.hash(users[1].password, 10)
    const createdAt0 = new Date(users[0].created_at)
    const createdAt1 = new Date(users[1].created_at)

    const usersResult = await usersCollection.insertMany([
        {
            email: users[0].email,
            password_hash: passwordHash0,
            role: users[0].role,
            created_at: createdAt0,
        },
        {
            email: users[1].email,
            password_hash: passwordHash1,
            role: users[1].role,
            created_at: createdAt1,
        }
    ])

    // Seeda resources
    
    const resourceWithDate = [];
    
    for (const resource of resources) {        
        const createdAt = new Date(resource.created_at)
        
        resourceWithDate.push({
            name: resource.name,
            type: resource.type,
            description: resource.description,
            created_at: createdAt,
            capacity: resource.capacity
        });
    }
    const resourceResult = await resourcesCollection.insertMany(resourceWithDate);

    // Seeda bookings och koppla dem till rätt resource och rätt user
    
    const bookingsWithIds = [];

for (const booking of bookings) {
    const resource = await resourcesCollection.findOne({
        name: booking.resource
    });

    console.log('booking: ', resource)

    if (!resource) {
        throw new Error(`Resurs hittades inte: ${booking.resource}`);
    }

    const user = await usersCollection.findOne({
        email: booking.booked_by
    });

    if (!user) {
        throw new Error(`Användare hittades inte: ${booking.booked_by}`);
    }

    bookingsWithIds.push({
        resource_id: new ObjectId(resource._id),
        booked_by: user._id,
        start_time: new Date(booking.start_time),
        end_time: new Date(booking.end_time),
        status: booking.status,
        created_at: new Date(booking.created_at)
    });

    console.log({
        resource: resource.name,
        resource_id: resource._id.toString()
    });
}

const bookingResult = await bookingsCollection.insertMany(bookingsWithIds);
    
    
    
    // const bookingsWithIds = [];

    // for (const booking of bookings) {
    //     const resource = await resourcesCollection.findOne({
    //         name: booking.resource
    //     });

    //     const user = await usersCollection.findOne({
    //         email: booking.booked_by
    //     });

    //     const createdAt = new Date(booking.created_at)

    //     bookingsWithIds.push({
    //         resource_id: resource._id,
    //         booked_by: user._id,
    //         start_time: booking.start_time,
    //         end_time: booking.end_time,
    //         status: booking.status,
    //         created_at: createdAt
    //     });
    // }

    // const bookingResult = await bookingsCollection.insertMany(bookingsWithIds);

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

        const createdAt = new Date(comment.created_at)

        commentsWithIds.push({
            booking_id: booking._id,
            booked_by: user._id,
            user_email: comment.booked_by,
            text: comment.text,
            created_at: createdAt
        });   
    }

    const commentsResult = await commentsCollection.insertMany(commentsWithIds);


    console.log(
        `Seeded ${usersResult.insertedCount} users, ${resourceResult.insertedCount} resources, ${bookingResult.insertedCount} bookings and ${commentsResult.insertedCount} commentsinto '${process.env.DATABASE_NAME}'`
    );
} finally {
    await client.close();
}
