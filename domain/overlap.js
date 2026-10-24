import { ObjectId } from 'mongodb'
import { db } from '../db/database.mjs'

export function intervalsOverlap(a, b) {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt
}

export async function findConflicts(resourceId, startsAt, endsAt, excludeBookingId = null) {
  const query = {
    resourceId: typeof resourceId === 'string' ? new ObjectId(resourceId) : resourceId,
    status: 'confirmed',
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  }
  if (excludeBookingId) {
    query._id = { $ne: new ObjectId(excludeBookingId) }
  }
  return db.collection('bookings').find(query).toArray()
}