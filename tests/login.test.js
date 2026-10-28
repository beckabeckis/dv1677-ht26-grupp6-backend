import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { connectDB, closeDB } from '../db/database.mjs'

let mongod

beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
  
    process.env.MONGODB_URI = mongod.getUri()
    process.env.DATABASE_NAME = 'resourcebooking_test'

    const db = await connectDB()
})

afterAll(async () => {
    await closeDB()
    await mongod.stop()
})

describe('POST /api/auth/register', () => {
  it('regristrera en ny användare', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.email).toBe('test@example.com')
    expect(res.body.user.role).toBe('student')
  })

  it('får inte ha samma email som annan användare', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(409)
  })

  it('får inte sakna fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'only@example.com' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('logga in med rätt uppgifter', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('får inte ha fel lösenord', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})