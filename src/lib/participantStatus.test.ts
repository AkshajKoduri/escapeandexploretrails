import { describe, expect, it } from "vitest";
import { participantSummary } from "@/lib/participantStatus";
import { buildBookingExportRows } from "@/lib/bookingExport";
import { filterBookings } from "@/lib/bookingAdmin";
import type { Database } from "@/integrations/supabase/types";

const booking = { id: "group", status: "confirmed", primary_status: "cancelled", primary_name: "Organizer", primary_phone: "123", created_at: "2026-10-01", payment_status: "partial", booking_total: 900, amount_paid: 200 };
const members = [
  { id: "one", booking_id: "group", full_name: "Confirmed", status: "confirmed", no_show: false },
  { id: "two", booking_id: "group", full_name: "Pending", status: "pending", no_show: false },
  { id: "three", booking_id: "group", full_name: "Absent", status: "confirmed", no_show: true },
] as Database["public"]["Tables"]["booking_members"]["Row"][];
describe("participant booking decisions", () => {
  it("summarizes mixed groups without claiming every participant is confirmed", () => {
    expect(participantSummary(booking, members)).toMatchObject({ mixed: true, label: "2 confirmed · 1 pending · 1 cancelled" });
  });
  it("includes mixed groups in each matching status filter", () => {
    const filters = { query: "", trek: "all", departure: "all", package: "all", payment: "all" as const, source: "all" as const, sort: "newest" as const };
    for (const status of ["confirmed", "pending", "cancelled", "active"] as const) {
      expect(filterBookings([booking], [], { ...filters, status }, members)).toHaveLength(1);
    }
  });
  it("exports only confirmed participants, preserving group payment information", () => {
    const { memberRows } = buildBookingExportRows([booking], members);
    expect(memberRows.map(row => row.Name)).toEqual(["Confirmed"]);
    expect(memberRows[0]["Payment Status"]).toBe("Partially paid");
  });
});
