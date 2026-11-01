export function controlBookingPolicy(booking, usersBookings, putRoute=false) {
  const hours = (booking.end_time - booking.start_time) / 3600000

  if (hours > 4) {
    return { bookingOk: false, policyError: 'Max 4 timmar per bokning' }
  }

  if (!putRoute){
    if (booking.start_time < Date.now()) {
      return { bookingOk: false, policyError: 'Kan inte boka bakåt i tiden' }
    }
    
    if (usersBookings.length >= 3) {
      return { bookingOk: false, policyError: 'Max 3 aktiva bokningar' }
    }
  }

  return { bookingOk: true }
}
