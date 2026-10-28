// tests/courses.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import { readFileSync } from 'fs'
import { connectDB, closeDB, db } from '../db/database.mjs'

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
})

afterAll(async () => {
    await closeDB()
    await mongod.stop()
})

describe('GET /api/users', () => {
    it('svarar med 200 och en array med användare', async () => {
        const res = await request(app)
            .get('/api/users')
            .expect(200)

        expect(res.body).toBeInstanceOf(Array)
        expect(res.body.length).toBeGreaterThan(1)
    })

    it('svarar med 200 och rätt användare', async () => {
      const user = await db.collection('users').findOne({
        email: 'erik@student.bth.se',
      })

      const res = await request(app)
      .get(`/api/users/${user._id}`)
      .expect(200)

      expect(res.body.name).toBe(user.name)
      expect(String(res.body._id)).toBe(String(user._id))
    })

    it('felaktigt user id svarar med 500', async () => {
      const user = await db.collection('users').findOne({
        email: 'erik@student.bth.se',
      })

      const res = await request(app)
      .get(`/api/users/123456789`)
      .expect(500)
    })
})

describe('POST /api/users', () => {
    it('skapar en användare och svarar med 201', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({
                "email" : "testie@student.bth.se",
                "password": "test123",
                "role" : "student",
                "created_at": "2026-09-08 17:00"
            })
            .expect(201)

        expect(res.body).toHaveProperty('_id')
        expect(res.body.email).toBe('testie@student.bth.se')
    })
})

describe('PUT /api/users', () => {
    it('ändrar en användare och svarar med 201', async () => {
        const created = await request(app)
            .post('/api/users')
            .send({
                "email" : "testie@student.bth.se",
                "password": "test123",
                "role" : "student",
                "created_at": "2026-09-08 17:00"
            })

        const res = await request(app)
            .put(`/api/users/${created.body._id}`)
            .send({
                "email" : "tested@student.bth.se",
                "password": "test123",
                "role" : "student",
                "created_at": "2026-09-08 17:00"
            })  
            .expect(200)        

        expect(res.body).toHaveProperty( 'message', 'PUT ok' )
    })
})

describe('DELETE /api/users/:id', () => {
    it('tar bort en användare och svarar med 201', async () => {
        const created = await request(app)
            .post('/api/users')
            .send({
                "email" : "testie@student.bth.se",
                "password": "test123",
                "role" : "student",
                "created_at": "2026-09-08 17:00"
            })
            .expect(201)

        await request(app)
            .delete(`/api/users/${created.body._id}`)
            .expect(200)
    })
})