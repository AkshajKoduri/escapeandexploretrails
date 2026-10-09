import type { Booking, Trek } from "@/lib/admin";
import { trekDates } from "@/lib/admin";
import { getBookingPayment, type PaymentStatus } from "@/lib/bookingPayments";
import { participantSummary } from "@/lib/participantStatus";

export type BookingFilters = {
  query: string;
  trek: string;
  departure: string;
  package: string;
  payment: "all" | PaymentStatus;
  source: "all" | "online" | "manual";
  status: "active" | "all" | "pending" | "confirmed" | "cancelled";
  sort: "newest" | "oldest";
  participantAge?: string;
  participantGender?: string;
};

/** Used for both the visible list and downloads, so no active filter is lost. */
export function filterBookings(bookings: Booking[], treks: Trek[], filters: BookingFilters, members: Array<{ booking_id: string; status?: string; full_name?: string | null; phone?: string | null; email?: string | null; age?: number | null; gender?: string | null }> = []): Booking[] {
  const query = filters.query.trim().toLowerCase();
  return bookings.filter((booking) => {
    const participantRows = [
      { name: booking.primary_name, phone: booking.primary_phone, email: booking.primary_email, age: booking.primary_age, gender: booking.primary_gender },
      ...members.filter(member => member.booking_id === booking.id).map(member => ({ name: member.full_name, phone: member.phone, email: member.email, age: member.age, gender: member.gender })),
    ];
    if (query && ![booking.trek_name, booking.selected_package_name, ...participantRows.flatMap(person => [person.name, person.phone, person.email])]
      .some((value) => String(value ?? "").toLowerCase().includes(query))) return false;
    if ((filters.participantAge && filters.participantAge !== "all") || (filters.participantGender && filters.participantGender !== "all")) {
      if (!participantRows.some(person => (filters.participantAge === "all" || !filters.participantAge || String(person.age ?? "unknown") === filters.participantAge)
        && (filters.participantGender === "all" || !filters.participantGender || String(person.gender ?? "unknown") === filters.participantGender))) return false;
    }
    if (filters.trek !== "all" && booking.trek_id !== filters.trek && booking.trek_name !== filters.trek) return false;
    if (filters.departure !== "all" && (resolveBookingDeparture(booking, treks) ?? "unknown") !== filters.departure) return false;
    if (filters.package !== "all" && (booking.selected_package_id ?? "unknown") !== filters.package) return false;
    if (filters.payment !== "all" && getBookingPayment(booking).status !== filters.payment) return false;
    if (filters.source !== "all" && (booking.booking_source ?? "online") !== filters.source) return false;
    const statuses = participantSummary(booking, members.filter(member => member.booking_id === booking.id)).statuses;
    if (filters.status === "active" ? statuses.every(status => status === "cancelled") : filters.status !== "all" && !statuses.includes(filters.status)) return false;
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

export function sortBookingGroups(
  groups: Map<string, Booking[]>,
  direction: "newest" | "oldest",
): Array<[string, Booking[]]> {
  const sign = direction === "newest" ? -1 : 1;
  const timestamp = (booking: Booking) => {
    const value = Date.parse(booking.created_at);
    return Number.isFinite(value) ? value : 0;
  };
  return [...groups.entries()]
    .map(([departure, rows]) => [departure, [...rows].sort((a, b) => sign * (timestamp(a) - timestamp(b)))] as [string, Booking[]])
    .sort(([departureA, rowsA], [departureB, rowsB]) => {
      const newestA = timestamp(rowsA[0]);
      const newestB = timestamp(rowsB[0]);
      const difference = sign * (newestA - newestB);
      return difference || departureA.localeCompare(departureB);
    });
}
