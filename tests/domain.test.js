import { describe, it, expect } from 'vitest'
import { intervalsOverlap } from '../domain/overlap.js'
import { controlBookingPolicy } from '../domain/policy.js'

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const testUserBookingToLong = {
  name: "testBooking",
  start_time:  new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
    8, 0
  ),
  end_time: new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
    13, 0
  )
}

const testUserBookingToEarly = {
  name: "testBooking",
  start_time: new Date("2026-10-15 08:00"),
  end_time: new Date("2026-10-15 09:00")
}

const testUserBookingOk = {
  name: "testBooking",
  start_time:  new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
    8, 0
  ),
  end_time:  new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate(),
    9, 0
  )
}

const testBookingsOk = [
    {
      name: "testBooking1",
      start_time: "2026-10-13 15:00",
      end_time: "2026-10-13 16:00"
    }
]

const testBookingsToMany = [
    {
      name: "testBooking1",
      start_time: "2026-10-13 15:00",
      end_time: "2026-10-13 16:00"
    },
    {
      name: "testBooking2",
      start_time: "2026-10-14 15:00",
      end_time: "2026-10-14 16:00"
    },
    {
      name: "testBooking3",
      start_time: "2026-10-16 15:00",
      end_time: "2026-10-16 16:00"
    }
]

describe('controlBookingPolicy', () => {
  it("För lång bokning", () =>{
    expect(controlBookingPolicy(testUserBookingToLong, testBookingsOk))
    .toEqual({ bookingOk: false, policyError: 'Max 4 timmar per bokning' })
  })

  it("Bokingen i dåtid", () =>{
    expect(controlBookingPolicy(testUserBookingToEarly, testBookingsOk))
    .toEqual({ bookingOk: false, policyError: 'Kan inte boka bakåt i tiden' })
  })

  it("Användare har för många bokningar", () =>{
    expect(controlBookingPolicy(testUserBookingOk, testBookingsToMany))
    .toEqual({ bookingOk: false, policyError: 'Max 3 aktiva bokningar' })
  })
})


describe('intervalsOverlap', () => {
  it('två bokningar som korsar varandra krockar', () => {
    expect(intervalsOverlap(
      { start_time: 10, end_time: 12 },
      { start_time: 11, end_time: 13 }
    )).toBe(true)
  })

  it('kant i kant krockar INTE', () => {
    expect(intervalsOverlap(
      { start_time: 10, end_time: 12 },
      { start_time: 12, end_time: 14 }
    )).toBe(false)
  })

  it('en bokning helt inuti en annan krockar', () => {
    expect(intervalsOverlap(
      { start_time: 10, end_time: 16 },
      { start_time: 12, end_time: 13 }
    )).toBe(true)
  })
})
