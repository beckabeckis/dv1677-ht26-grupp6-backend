import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
// import { broker, BrokerError } from '../config/broker.js'
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
);

dotenv.config({
    path: path.join(projectRoot, '.env'),
});

const { broker, BrokerError } = await import('../config/broker.js');


const bookings = JSON.parse(readFileSync('./db/bookings.json', 'utf-8'));
const users = JSON.parse(readFileSync('./db/users.json', 'utf-8'));
const comments = JSON.parse(readFileSync('./db/comments.json', 'utf-8'));

const client = new MongoClient(process.env.MONGODB_URI);

async function seedResources(resourcesCollection) {
    const sources = { proxmox: 'nodes', maas: 'machines', openstack: 'projects' }
    let count = 0
    for (const [provider, key] of Object.entries(sources)) {
    const inventory = await broker.inventory(provider)
    for (const r of inventory[key] ?? []) {
        await resourcesCollection.updateOne(
        { provider, externalId: r.id },
        { $set: { name: r.name, capacity: r.capacity, active: true } },
        { upsert: true },
        )
        count++
    }
    }
    return count
}

async function seedBookings (resourcesCollection, usersCollection, bookingsCollection, bookings) {
    let count = 0
    
    for (const booking of bookings) {

        const resource = await resourcesCollection.findOne({
            name: booking.resource
        });

        if (!resource) {
            console.log(`Resurs hittades inte: ${booking.resource}`)
            throw new Error(`Resurs hittades inte: ${booking.resource}`);
        }

        const user = await usersCollection.findOne({
            email: booking.booked_by
        });

        if (!user) {
            console.log(`Användare hittades inte: ${booking.booked_by}`)
            throw new Error(`Användare hittades inte: ${booking.booked_by}`);
        }

        const start = new Date(booking.start_time)
        const end = new Date(booking.end_time)
        if (isNaN(start) || isNaN(end) || start >= end) {
            console.log(`Ogiltigt tidsintervall för bokningen: ${booking.resource}`)

            throw new Error(`Ogiltigt tidsintervall för bokningen: ${booking.resource}`);
        }


        let want = {}

        if (resource.provider === "proxmox") {
            want = {"vcpus":Number(booking.want.vcpus), "ramMb":Number(booking.want.ramMb), "diskGb":Number(booking.want.diskGb)}
        } else if (resource.provider === "openstack") {
            want = {"vcpus":Number(booking.want.vcpus), "ramMb":Number(booking.want.ramMb)}
        }
        
        const bookingId = new ObjectId()
        const payload = resource.provider === 'maas'
            ? { systemId: resource.externalId, 
                user: user._id, 
                startsAt: start, 
                endsAt: end, 
                idempotencyKey: String(bookingId) }
            : { want: want, 
                user: user._id, 
                startsAt: start, 
                endsAt: end, 
                idempotencyKey: String(bookingId) }
        
        try {
            const { allocation } = await broker.allocate(resource.provider, payload)

            console.log(allocation)

            const newBooking = {
                _id: bookingId, 
                resource_id: resource._id,
                booked_by: user._id,
                start_time: start,
                end_time: end,
                status: 'confirmed',
                created_at: new Date(),
            };
            
            await bookingsCollection
                .insertOne({...newBooking,
                broker: { allocationId: allocation.id, secret: allocation.secret },
                });

            count++
            

        } catch (err) {
            console.log(err)
            console.log("last")
            if (!(err instanceof BrokerError)) throw err
            return { error: 'Booking service unavailable', code: err.code }
        }
    }
    return count

}

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
    
    const resourcesResult = await seedResources(resourcesCollection)

    // Seeda bookings och koppla dem till rätt resource och rätt user
    

    const bookingResult = await seedBookings (resourcesCollection, usersCollection, bookingsCollection, bookings)

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
        

        console.log(booking)

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
        `Seeded ${usersResult.insertedCount} users, ${resourcesResult} resources, ${bookingResult} bookings and ${commentsResult.insertedCount} commentsinto '${process.env.DATABASE_NAME}'`
    );
} finally {
    await client.close();
}
