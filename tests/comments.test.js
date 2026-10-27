// tests/comments.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import { readFileSync } from 'fs'
import { connectDB, closeDB, db } from '../db/database.mjs'

const mockResources = [
    {
    "externalId": "dv1677-fakeprox",
    "provider": "proxmox",
    "active": true,
    "capacity": {
      "vcpus": 16,
      "ramMb": 32090.65625,
      "diskGb": 125.78551483154297
    },
    "name": "Proxmox"
  },
  {
    "provider": "maas",
    "externalId": "s3yqcb",
    "active": true,
    "capacity": {
      "vcpus": 2,
      "ramMb": 2048
    },
    "name": "exotic-tomcat"
  },
  {
    "externalId": "d5b1c93f0ef94514a3003c6fb1b0144d",
    "provider": "openstack",
    "active": true,
    "capacity": {
      "vcpus": 20,
      "ramMb": 51200
    },
    "name": "Openstack"
  }
]


let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_URI = mongod.getUri()
    process.env.DATABASE_NAME = 'resourcebooking_test'

    const db = await connectDB()

    const users = JSON.parse(
        readFileSync('./db/users.json', 'utf-8')
    )
    await db.collection('users').insertMany(users)

    await db.collection('resources').insertMany(mockResources)

    const bookings = JSON.parse(
        readFileSync('./db/bookings.json', 'utf-8')
    )

    for (const booking of bookings) {

        const resource = await db.collection('resources').findOne({
            name: booking.resource
        });

        if (!resource) {
            console.log(`Resurs hittades inte: ${booking.resource}`)
            throw new Error(`Resurs hittades inte: ${booking.resource}`);
        }

        const user = await db.collection('users').findOne({
            email: booking.booked_by
        });

        if (!user) {
            console.log(`Användare hittades inte: ${booking.booked_by}`)
            throw new Error(`Användare hittades inte: ${booking.booked_by}`);
        }

        const newBooking = {
            resource_id: resource._id,
            booked_by: user._id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: 'confirmed',
            created_at: new Date(),
        };

        await db.collection('bookings')
            .insertOne({...newBooking,
            broker: { allocationId: "-", secret: "-" },
        });
    }

    const comments = JSON.parse(
        readFileSync('./db/comments.json', 'utf-8')
    )

    for (const comment of comments) {
        const resource = await db.collection("resources").findOne({
            name: comment.resource
        });

        
        const user = await db.collection("users").findOne({
            email: comment.booked_by
        });
        
        const booking = await db.collection("bookings").findOne({
            resource_id: resource._id,
            booked_by: user._id
        });

        const createdAt = new Date(comment.created_at)

        await db.collection("comments").insertOne({
            booking_id: booking._id,
            booked_by: user._id,
            user_email: comment.booked_by,
            text: comment.text,
            created_at: createdAt
        });   
    }

})

afterAll(async () => {
    await closeDB()
    await mongod.stop()
})

describe('GET /api/comments', () => {
    it('svarar med 200 och en array med kommentar', async () => {
        const res = await request(app)
            .get('/api/comments')
            .expect(200)

        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(0)
    })

    it('hämta alla commentarer från en bokning, svarar med 200 och rätt kommentar', async () => {
        const comment = await db.collection('comments').findOne()

        const res = await request(app)
        .get(`/api/comments/booking/${comment.booking_id}`)
        .expect(200)

        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].text).toBe(comment.text)
    })

    it('hämta alla commentarer från en bokning, fel booking_id ska svara med felkod 500', async () => {
        const res = await request(app)
        .get(`/api/comments/booking/123456789`)
        .expect(500)
    })

    it('hämta alla commentarer från en användare, svarar med 200 och rätt kommentar', async () => {
        const comment = await db.collection('comments').findOne()

        const res = await request(app)
        .get(`/api/comments/user/${comment.booked_by}`)
        .expect(200)

        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].text).toBe(comment.text)
    })

    it('hämta alla commentarer från en användare, fel user_id ska svara med felkod 500', async () => {
        const res = await request(app)
        .get(`/api/comments/user/123456789`)
        .expect(500)
    })
})

describe('POST /api/comments', () => {
    it('skapar en kommentar och svarar med 201', async () => {

        const booking = await db.collection("bookings").findOne()
        const user = await db.collection("users").findOne()

        const res = await request(app)
            .post('/api/comments')
            .send({
                "booking_id" : booking._id,
                "booked_by" : user._id,
                "user_email": user.email,
                "text": "It's fine.",
                "created_at": "2026-09-15 12:01"
            })
            .expect(201)

        expect(res.body).toHaveProperty('_id')
        expect(res.body.text).toBe("It's fine.")
    })
})

describe('PUT /api/comments', () => {
    it('ändrar en kommentar och svarar med 200', async () => {
        const booking = await db.collection("bookings").findOne()
        const user = await db.collection("users").findOne()

        const created = await request(app)
            .post('/api/comments')
            .send({
                "booking_id" : booking._id,
                "booked_by" : user._id,
                "user_email": user.email,
                "text": "It's fine.",
                "created_at": "2026-09-15 12:01"
            })
            .expect(201)

        const res = await request(app)
            .put(`/api/comments/${created.body._id}`)
            .send({
                "booking_id" : booking._id,
                "booked_by" : user._id,
                "user_email": user.email,
                "text": "It's finer.",
                "created_at": "2026-09-15 12:01"
            })
            .expect(200)

        expect(res.body).toHaveProperty( 'message', 'PUT ok' )
    })
})

describe('DELETE /api/comments/:id', () => {
    it('tar bort en kommentar och svarar med 201', async () => {
        const booking = await db.collection("bookings").findOne()
        const user = await db.collection("users").findOne()

        const created = await request(app)
            .post('/api/comments')
            .send({
                "booking_id" : booking._id,
                "booked_by" : user._id,
                "user_email": user.email,
                "text": "It's fine.",
                "created_at": "2026-09-15 12:01"
            })

        await request(app)
            .delete(`/api/comments/${created.body._id}`)
            .expect(200)
    })
})