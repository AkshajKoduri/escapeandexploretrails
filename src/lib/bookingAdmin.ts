import type { Booking, Trek } from "@/lib/admin";
import { trekDates } from "@/lib/admin";
import { getBookingPayment, type PaymentStatus } from "@/lib/bookingPayments";

export type BookingFilters = {
  query: string;
  trek: string;
  departure: string;
  package: string;
  payment: "all" | PaymentStatus;
  source: "all" | "online" | "manual";
  status: "all" | "pending" | "confirmed" | "cancelled";
  sort: "newest" | "oldest";
};

/** Used for both the visible list and downloads, so no active filter is lost. */
export function filterBookings(bookings: Booking[], treks: Trek[], filters: BookingFilters): Booking[] {
  const query = filters.query.trim().toLowerCase();
  return bookings.filter((booking) => {
    if (query && ![booking.primary_name, booking.primary_phone, booking.primary_email, booking.trek_name]
      .some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
    if (filters.trek !== "all" && booking.trek_id !== filters.trek && booking.trek_name !== filters.trek) return false;
    if (filters.departure !== "all" && (resolveBookingDeparture(booking, treks) ?? "unknown") !== filters.departure) return false;
    if (filters.package !== "all" && (booking.selected_package_id ?? "unknown") !== filters.package) return false;
    if (filters.payment !== "all" && getBookingPayment(booking).status !== filters.payment) return false;
    if (filters.source !== "all" && (booking.booking_source ?? "online") !== filters.source) return false;
    if (filters.status !== "all" && booking.status !== filters.status) return false;
    return true;
  }).sort((a, b) => {
    const difference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return filters.sort === "newest" ? -difference : difference;
  });
}

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
