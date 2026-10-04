import { describe, expect, it } from "vitest";
import type { Booking, Trek } from "@/lib/admin";
import { filterBookings, groupBookingsByDeparture, resolveBookingDeparture } from "@/lib/bookingAdmin";

const trek = (dates: string[]): Trek => ({
  id: "trek-1",
  name: "Badami",
  trek_date: dates[0] ?? null,
  additional_dates: dates.slice(1),
} as Trek);

describe("booking departure grouping", () => {
  it("keeps bookings for the same trip in separate departure groups", () => {
    const bookings = [
      { id: "a", trek_id: "trek-1", trek_date: "2026-10-02", seats_booked: 2 },
      { id: "b", trek_id: "trek-1", trek_date: "2026-10-16", seats_booked: 1 },
    ] as Booking[];

    const groups = groupBookingsByDeparture(bookings, [trek(["2026-10-02", "2026-10-16"])]);
    expect([...groups.keys()]).toEqual(["2026-10-02", "2026-10-16"]);
    expect(groups.get("2026-10-02")?.map((booking) => booking.id)).toEqual(["a"]);
  });

  it("uses a single-date fallback but never infers a multi-date historical booking", () => {
    const historical = { id: "old", trek_id: "trek-1", trek_date: null } as Booking;
    expect(resolveBookingDeparture(historical, [trek(["2026-10-02"])])).toBe("2026-10-02");
    expect(resolveBookingDeparture(historical, [trek(["2026-10-02", "2026-10-16"])])).toBeNull();
  });
});

describe("booking participant filters", () => {
  it("searches group members and applies age and gender before presenting bookings", () => {
    const bookings = [{ id: "group", trek_id: "trek-1", trek_name: "Badami", status: "confirmed", created_at: "2026-09-01", primary_name: "Organizer", primary_age: 40, primary_gender: "Other" }] as Booking[];
    const members = [{ booking_id: "group", full_name: "Ravi", phone: "555123", email: null, age: 24, gender: "Male" }];
    const filters = { query: "ravi", trek: "all", departure: "all", package: "all", payment: "all" as const, source: "all" as const, status: "active" as const, sort: "newest" as const, participantAge: "24", participantGender: "Male" };
    expect(filterBookings(bookings, [trek(["2026-10-02"])], filters, members).map(row => row.id)).toEqual(["group"]);
    expect(filterBookings(bookings, [trek(["2026-10-02"])], { ...filters, participantGender: "Female" }, members)).toEqual([]);
  });
  it("hides cancelled bookings by default while showing them for an explicit cancelled filter", () => {
    const bookings = ["confirmed", "cancelled"].map(status => ({ id: status, status, created_at: "2026-09-01" })) as Booking[];
    const base = { query: "", trek: "all", departure: "all", package: "all", payment: "all" as const, source: "all" as const, sort: "newest" as const };
    expect(filterBookings(bookings, [], { ...base, status: "active" }).map(row => row.status)).toEqual(["confirmed"]);
    expect(filterBookings(bookings, [], { ...base, status: "cancelled" }).map(row => row.status)).toEqual(["cancelled"]);
  });
});
