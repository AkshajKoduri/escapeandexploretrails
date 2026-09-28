import type { Booking, Trek } from "@/lib/admin";
import { trekDates } from "@/lib/admin";

export function resolveBookingDeparture(booking: Booking, treks: Trek[]): string | null {
  if (booking.trek_date) return booking.trek_date;
  const trek = treks.find((item) => item.id === booking.trek_id);
  const dates = trek ? trekDates(trek) : [];
  return dates.length === 1 ? dates[0] : null;
}

export function groupBookingsByDeparture(bookings: Booking[], treks: Trek[]): Map<string, Booking[]> {
  const groups = new Map<string, Booking[]>();
  bookings.forEach((booking) => {
    const key = resolveBookingDeparture(booking, treks) ?? "unknown";
    groups.set(key, [...(groups.get(key) ?? []), booking]);
  });
  return groups;
}
