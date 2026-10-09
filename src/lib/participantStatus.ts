export type ParticipantStatus = "pending" | "confirmed" | "cancelled";

export function participantStatus(value: string | null | undefined, bookingStatus: string): ParticipantStatus {
  const status = value ?? bookingStatus;
  return status === "confirmed" || status === "cancelled" ? status : "pending";
}

export function participantSummary(booking: { primary_status?: string; status: string }, members: Array<{ status?: string }>) {
  const statuses = [participantStatus(booking.primary_status, booking.status), ...members.map(m => participantStatus(m.status, booking.status))];
  const counts = { confirmed: 0, pending: 0, cancelled: 0 };
  statuses.forEach(status => counts[status]++);
  return { counts, statuses, label: Object.entries(counts).filter(([, count]) => count > 0).map(([status, count]) => `${count} ${status}`).join(" · "), mixed: new Set(statuses).size > 1 };
}
