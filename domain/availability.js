import { ObjectId } from 'mongodb'
import { db } from '../db/database.mjs'
import { intervalsOverlap } from './overlap.js'
import { fromZonedTime } from "date-fns-tz";

export async function getAvailability(resourceId, date) {
  const dayStart = fromZonedTime(
    `${date}T08:00:00`,
    "Europe/Stockholm"
  );
  const dayEnd = fromZonedTime(
    `${date}T18:00:00`,
    "Europe/Stockholm"
  );

  const rid = typeof resourceId === 'string' ? new ObjectId(resourceId) : resourceId

  const bookings = await db.collection('bookings').find({
    resourceId: rid,
    status: 'confirmed',
    startsAt: { $lt: dayEnd },
    endsAt: { $gt: dayStart },
  }).toArray()

  const slots = []
  for (let h = 8; h < 18; h++) {
    const slotStart = fromZonedTime(
      `${date}T${String(h).padStart(2, "0")}:00:00`,
      "Europe/Stockholm"
    );
    const slotEnd = fromZonedTime(
      `${date}T${String(h + 1).padStart(2, "0")}:00:00`,
      "Europe/Stockholm"
    );

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