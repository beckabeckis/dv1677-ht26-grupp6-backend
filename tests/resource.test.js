// tests/courses.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
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
    await db.collection('resources').insertMany(mockResources)
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
        expect(res.body.length).toBeGreaterThan(2)
    })

    it('svarar med 200 och rätt resurs', async () => {
      const resource = await db.collection('resources').findOne({
        name: 'exotic-tomcat',
      })

      const res = await request(app)
        .get(`/api/resources/${resource._id}`)
        .expect(200)

      expect(res.body.name).toBe(resource.name)
      expect(String(res.body._id)).toBe(String(resource._id))
    })

    it('fel resource id ska ge felkod 500', async () => {
      const resource = await db.collection('resources').findOne({
        name: 'exotic-tomcat',
      })

      const res = await request(app)
        .get(`/api/resources/123456789`)
        .expect(500)
    })
})

