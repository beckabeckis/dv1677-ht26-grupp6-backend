import { ObjectId } from 'mongodb'
import { db } from '../db/database.mjs'

export function intervalsOverlap(a, b) {
  return a.start_time < b.end_time && b.start_time < a.end_time
}

export async function findConflicts(resourceId, startsAt, endsAt, excludeBookingId = null) {
  const query = {
    resource_id: typeof resourceId === 'string' ? new ObjectId(resourceId) : resourceId,
    status: 'confirmed',
    start_time: { $lt: endsAt },
    end_time: { $gt: startsAt },
  }
  if (excludeBookingId) {
    query._id = { $ne: new ObjectId(excludeBookingId) }
  }
  return db.collection('bookings').find(query).toArray()
}