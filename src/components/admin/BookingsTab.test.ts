import { describe, expect, it } from "vitest";
import type { Booking, Trek } from "@/lib/admin";
import { groupBookingsByDeparture, resolveBookingDeparture } from "@/lib/bookingAdmin";

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
