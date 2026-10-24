import { ObjectId } from 'mongodb'
import { db } from '../db/database.mjs'
import { intervalsOverlap } from './overlap.js'

export async function getAvailability(resourceId, date) {
  const dayStart = new Date(date)
  dayStart.setUTCHours(8, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setUTCHours(18, 0, 0, 0)

  const rid = typeof resourceId === 'string' ? new ObjectId(resourceId) : resourceId

  const bookings = await db.collection('bookings').find({
    resourceId: rid,
    status: 'confirmed',
    startsAt: { $lt: dayEnd },
    endsAt: { $gt: dayStart },
  }).toArray()

  const slots = []
  for (let h = 8; h < 18; h++) {
    const slotStart = new Date(date)
    slotStart.setUTCHours(h, 0, 0, 0)
    const slotEnd = new Date(date)
    slotEnd.setUTCHours(h + 1, 0, 0, 0)

    const conflict = bookings.find(b =>
      intervalsOverlap(
        { startsAt: b.startsAt, endsAt: b.endsAt },
        { startsAt: slotStart, endsAt: slotEnd }
      )
    )

    slots.push({
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      available: !conflict,
      bookingId: conflict?._id?.toString() ?? null,
    })
  }
  return slots
}