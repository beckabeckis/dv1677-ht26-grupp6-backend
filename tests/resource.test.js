// tests/courses.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import { connectDB, closeDB } from '../db/database.mjs'

let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()

    process.env.MONGODB_URI = mongod.getUri()
    process.env.DATABASE_NAME = 'resourcebooking_test'

    // Seed med resursdata så att testerna har något att arbeta med
    const courses = JSON.parse(
        readFileSync('./db/resources.json', 'utf-8')
    )

    const db = await connectDB()
    await db.collection('resources').insertMany(courses)
})

afterAll(async () => {
    await closeDB()
    await mongod.stop()
})

describe('GET /api/resources', () => {
    it('svarar med 200 och en array med resurser', async () => {
        const res = await request(app)
            .get('/api/resources')
            .expect(200)

        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(0)
    })
})

describe('POST /api/resources', () => {
    it('skapar en kurs och svarar med 201', async () => {
        const res = await request(app)
            .post('/api/resources')
            .send({
                "name": "Test",
                "type": "Testtype",
                "description": "Testing test",
                "created_at": "2026-09-16 12:00",
                "capacity": 1
            })
            .expect(201)

        expect(res.body).toHaveProperty('_id')
        expect(res.body.name).toBe('Test')
    })
})

describe('DELETE /api/resources/:id', () => {
    it('tar bort en resurs och svarar med 200', async () => {
        const created = await request(app)
            .post('/api/resources')
            .send({
                "name": "Delite test",
                "type": "Testtype",
                "description": "Testing test",
                "created_at": "2026-09-16 12:00",
                "capacity": 1
            })
            .expect(201)

        await request(app)
            .delete(`/api/resources/${created.body._id}`)
            .expect(200)
    })
})