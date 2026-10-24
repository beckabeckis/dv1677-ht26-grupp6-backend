// export function canCancelBooking(actor, booking) {
//   if (actor.role === 'admin') return true
//   return booking.bookedBy.toString() === actor._id.toString()
// }

// export function canManageResources(actor) {
//   return actor.role === 'admin'
// }

// // Bookings are public — this is a room/resource system, not a medical system.
// export function canViewBooking(actor, booking) {
//   return true
// }

export function controlBookingPolicy(booking, usersBookings) {
  const hours = (booking.end_time - booking.start_time) / 3600000

  if (hours > 4) {
    return { bookingOk: false, policyError: 'Max 4 timmar per bokning' }
  }

  if (booking.start_time < Date.now()) {
    return { bookingOk: false, policyError: 'Kan inte boka bakåt i tiden' }
  }

  if (usersBookings.length >= 3) {
    return { bookingOk: false, policyError: 'Max 3 aktiva bokningar' }
  }

  return { bookingOk: true }
}
