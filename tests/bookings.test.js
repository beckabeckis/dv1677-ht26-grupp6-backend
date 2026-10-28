import { broker, BrokerError } from '../config/broker.js'
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import { connectDB, closeDB } from '../db/database.mjs'
import jwt from 'jsonwebtoken'

let mongod
let db

function getAuthToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
    )
}

const resourceMock = [
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
let testResource
let testUserStudent
let testUserAdmin
let testUserEmpty
let authTokenStudent
let authTokenAdmin
let authTokenEmpty


beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_URI = mongod.getUri()
    process.env.DATABASE_NAME = 'resourcebooking_test'

    db = await connectDB()

    await db.collection('resources').insertMany(resourceMock)

    testResource = await db.collection('resources').findOne({
        name: 'exotic-tomcat',
    })

    const users = JSON.parse(
        readFileSync('./db/users.json', 'utf-8')
    )
    await db.collection('users').insertMany(users)

    await db.collection('users').insertOne({
        "email" : "testempty@student.bth.se",
        "password": "test123",
        "role" : "student",
        "created_at": "2026-09-08 17:00"
    })

    testUserStudent = await db.collection('users').findOne({
        email: 'erik@student.bth.se',
    })
    
    testUserAdmin = await db.collection('users').findOne({
        email: 'anna@student.bth.se',
    })

    testUserEmpty = await db.collection('users').findOne({
        email: 'testempty@student.bth.se',
    })

    authTokenStudent = getAuthToken(testUserStudent)
    authTokenAdmin = getAuthToken(testUserAdmin)
    authTokenEmpty = getAuthToken(testUserEmpty)

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


})

afterAll(async () => {
    await closeDB()
    await mongod.stop()
    vi.restoreAllMocks()
})

/// Broker connection tester

describe("Broker connection", () => {
    it('en nekad bokning ger 409', async () => {
        vi.spyOn(broker, 'allocate').mockRejectedValue(
            new BrokerError(409, 'CAPACITY_EXCEEDED', 'full'),
        )

        const beforeCount = await db.collection('bookings').countDocuments()

        await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserAdmin._id,
                "start_time": "2026-12-15 08:00",
                "end_time": "2026-12-15 09:00",
            })
            .expect(409)

        const afterCount = await db.collection('bookings').countDocuments()

        expect(afterCount).toBe(beforeCount)
    })

    it('brokern nere ger 503', async () => {
        vi.spyOn(broker, 'allocate').mockRejectedValue(
            new BrokerError(0, 'UNREACHABLE', 'timeout')
        )

        const beforeCount = await db.collection('bookings').countDocuments()

        await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserAdmin._id,
                "start_time": "2026-12-15 08:00",
                "end_time": "2026-12-15 09:00",
            })
            .expect(503)

        const afterCount = await db.collection('bookings').countDocuments()

        expect(afterCount).toBe(beforeCount)
    })
})




/// Booking tester

describe("GET Booking", () => {
    it('hämta alla bokningar med 200 som svar', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        const res = await request(app)
            .get('/api/bookings')
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .expect(200)

        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(1)
    })

    it('hämta alla bokningar från en resurs med 200 som svar', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        const resource = await db.collection('resources').findOne({
            "name": "Proxmox"
        })

        const res = await request(app)
            .get(`/api/bookings/resource/${resource._id}`)
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .expect(200)

        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(0)
    })

    it('hämta en bokning med id med 200 som svar', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        const booking = await db.collection('bookings').findOne()

        const res = await request(app)
            .get(`/api/bookings/${booking._id}`)
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .expect(200)

        expect(String(booking._id)).toEqual(String(res.body._id))
    })
})


describe("POST Booking", () => {
    it('skapar en bokning på en ledig tid', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        const beforeCount = await db.collection('bookings').countDocuments()

        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserEmpty._id,
                "start_time": "2026-12-15 08:00",
                "end_time": "2026-12-15 09:00",
            })
            .expect(201)

        const afterCount = await db.collection('bookings').countDocuments()


        expect(beforeCount).not.toBe(afterCount)
        expect(res.body).toHaveProperty('booking')
        expect(res.body.booking).toHaveProperty('_id')
    })

    it('vägrar boka en tid som redan är tagen', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        
        await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokenEmpty}`)
        .send({
            "resource_id" : testResource._id,
            "booked_by" : testUserEmpty._id,
            "start_time": "2026-12-15 08:00",
            "end_time": "2026-12-15 09:00",
        })
        
        const beforeCount = await db.collection('bookings').countDocuments()
        
        const res = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserEmpty._id,
                "start_time": "2026-12-15 08:30",
                "end_time": "2026-12-15 09:30",
            })
            .expect(409)

        const afterCount = await db.collection('bookings').countDocuments()


        expect(beforeCount).toBe(afterCount)
        expect(res.body.error).toMatch('Time slot already booked')
    })
})

describe('PUT Bookings', () => {
    it('ändra en bokning och få svar 200', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        vi.spyOn(broker, 'extend').mockResolvedValue(
            undefined
        )

        const created = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserEmpty._id,
                "start_time": "2026-12-06T08:00:00.000Z",
                "end_time": "2026-12-06T09:00:00.000Z",
            })
            .expect(201)

        const res = await request(app)
            .put(`/api/bookings/${created.body.booking._id}`)
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "end_time": "2026-12-06T10:00:00.000Z",
            })
            expect(200)

        expect(res.body.message).toBe('PUT ok');
    })

     it('ändra en bokning så att den blir för lång och svarar med 409', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        vi.spyOn(broker, 'extend').mockResolvedValue(
            undefined
        )

        const created = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserEmpty._id,
                "start_time": "2026-12-01T08:00:00.000Z",
                "end_time": "2026-12-01T09:00:00.000Z",
            })
            .expect(201)

        const res = await request(app)
            .put(`/api/bookings/${created.body.booking._id}`)
            .set('Authorization', `Bearer ${authTokenEmpty}`)
            .send({
                "end_time": "2026-12-01T13:00:00.000Z",
            })
            expect(409)
    })
})

describe('DELETE Bookings', () => {
    it('Avboka en bokning och få svar 200', async () => {
        vi.spyOn(broker, 'allocate').mockResolvedValue({
            allocation: {
                id: 'test-allocation-id',
                secret: 'test-secret'
            }
        })

        vi.spyOn(broker, 'withdraw').mockResolvedValue(
            undefined
        )

        const created = await request(app)
            .post('/api/bookings')
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .send({
                "resource_id" : testResource._id,
                "booked_by" : testUserAdmin._id,
                "start_time": "2026-12-06T15:00:00.000Z",
                "end_time": "2026-12-06T16:00:00.000Z",
            })
            .expect(201)
        
        const res = await request(app)
            .delete(`/api/booking/cancel/${created.body.booking._id}`)
            .set('Authorization', `Bearer ${authTokenAdmin}`)
            .expect(200)

        expect(res.body.message).toBe('Booking cancelled');
    })
})


/// JWT autentisering tester

describe("JWT autentisering", () => {
    it('ger 401 utan token', async () => {
        await request(app)
            .get('/api/bookings')
            .expect(401)
    })

    it('ger 401 med påhittad token', async () => {
        await request(app)
            .get('/api/bookings')
            .set('Authorization', 'Bearer inte-en-riktig-token')
            .expect(401)
    })

    it('visar bara användarens egna bokningar', async () => {
        const res = await request(app)
            .get('/api/bookings')
            .set('Authorization', `Bearer ${authTokenStudent}`)

        expect(res.body.every(d => String(d.booked_by) === String(testUserStudent._id))).toBe(true)
    })

    it('student ska inte kunna avboka', async () => {
        vi.spyOn(broker, 'allocate').mockRejectedValue(
            new BrokerError(0, 'UNREACHABLE', 'timeout')
        )

        const beforeCount = await db.collection('bookings').countDocuments()
        const booking = await db.collection('bookings').findOne({
            booked_by: testUserStudent._id,
        })

        await request(app)
            .delete(`/api/booking/cancel/${booking._id}`)
            .set('Authorization', `Bearer ${authTokenStudent}`)
            .expect(403)

        const afterCount = await db.collection('bookings').countDocuments()

        expect(afterCount).toBe(beforeCount)
    })
})
