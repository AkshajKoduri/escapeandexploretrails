export const SEAT_STATUSES = ["Available", "Filling Fast", "Last Few", "Full", "Waiting List"] as const;
export type SeatStatus = typeof SEAT_STATUSES[number];

export function normalizeDepartureStatuses(value: unknown): Record<string, SeatStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([date, status]) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) && SEAT_STATUSES.includes(status as SeatStatus),
  )) as Record<string, SeatStatus>;
}

// Display-only fallback. Capacity is independently enforced by the booking RPC.
export function departureStatus(trip: { departureStatuses?: Record<string, SeatStatus> }, date?: string): SeatStatus {
  return date ? trip.departureStatuses?.[date] ?? "Available" : "Available";
}

export function publicDepartureDates(dates: string[]): string[] {
  return [...new Set(dates.filter(Boolean))].sort();
}
