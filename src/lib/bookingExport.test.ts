import { describe, expect, it } from "vitest";
import type { Booking, Trek } from "@/lib/admin";
import type { Database } from "@/integrations/supabase/types";
import { filterBookings, type BookingFilters } from "@/lib/bookingAdmin";
import { buildBookingExportRows, createBookingWorkbook } from "@/lib/bookingExport";

type Member = Database["public"]["Tables"]["booking_members"]["Row"];
const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: "booking-a", trek_id: "trip-a", trek_name: "Trail A", trek_date: "2026-10-12",
  primary_name: "Explorer", primary_phone: "+910012345678", primary_age: 30, primary_gender: "Other",
  primary_email: "explorer@example.test", primary_aadhaar: "secret", created_at: "2026-09-28",
  selected_package_id: "with-travel", selected_package_name: "With travel", payment_status: "partial",
  booking_source: "manual", status: "confirmed", booking_total: 1000, amount_paid: 250,
  seats_booked: 2, package_currency: "INR", ...overrides,
});
const member = { id: "member-1", booking_id: "booking-a", full_name: "Companion", age: null, gender: null, phone: "0012345678", aadhaar_number: "secret" } as Member;
const filters: BookingFilters = { query: "", trek: "all", departure: "all", package: "all", payment: "all", source: "all", status: "all", sort: "newest" };

describe("booking member downloads", () => {
  it("includes primary and additional participants once, with financial totals only on the booking sheet", () => {
    const { memberRows, bookingRows } = buildBookingExportRows([booking(), booking()], [member, member], []);
    expect(memberRows).toHaveLength(2);
    expect(memberRows.map((row) => row.Name)).toEqual(["Explorer", "Companion"]);
    expect(memberRows[1]).toMatchObject({ Age: "", Gender: "", "Phone number": "0012345678", "Package type": "With travel", "Payment status": "Partially paid" });
    expect(bookingRows).toHaveLength(1);
    expect(bookingRows[0]).toMatchObject({ "Total booking amount": 1000, "Amount paid so far": 250, "Remaining balance": 750 });
    expect(JSON.stringify({ memberRows, bookingRows })).not.toContain("secret");
    expect(memberRows[0]).not.toHaveProperty("Total booking amount");
  });

  it("keeps missing member phones blank instead of using the primary phone", () => {
    expect(buildBookingExportRows([booking()], [{ ...member, phone: null }], []).memberRows[1]["Phone number"]).toBe("");
  });

  it("preserves unknown historical amounts as blanks", () => {
    const data = buildBookingExportRows([booking({ booking_total: null, amount_paid: null, payment_status: "paid" })], [], []);
    expect(data.bookingRows[0]).toMatchObject({ "Total booking amount": "", "Amount paid so far": "", "Remaining balance": "", "Payment status": "Paid" });
  });

  it("serializes phone numbers as Excel text including leading zeroes", async () => {
    const { XLSX, workbook } = await createBookingWorkbook([booking()], [member], []);
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const reopened = XLSX.read(bytes, { type: "array" });
    expect(reopened.SheetNames).toEqual(["Members", "Booking payments"]);
    expect(reopened.Sheets.Members.G2).toMatchObject({ t: "s", v: "+910012345678" });
    expect(reopened.Sheets.Members.G3).toMatchObject({ t: "s", v: "0012345678" });
    expect(reopened.Sheets["Booking payments"].I2).toMatchObject({ t: "n", v: 750 });
  });

  it("applies every active filter before building the export", () => {
    const matching = booking();
    const records = [matching, booking({ id: "trip", trek_id: "other" }), booking({ id: "departure", trek_date: "2026-10-13" }),
      booking({ id: "package", selected_package_id: "without-travel" }), booking({ id: "payment", amount_paid: 1000 }),
      booking({ id: "source", booking_source: "online" }), booking({ id: "status", status: "cancelled" }),
      booking({ id: "search", primary_phone: "7777777777" })];
    const selected = filterBookings(records, [], { ...filters, query: "001234", trek: "trip-a", departure: "2026-10-12", package: "with-travel", payment: "partial", source: "manual", status: "confirmed" });
    expect(selected.map((row) => row.id)).toEqual(["booking-a"]);
    expect(buildBookingExportRows(selected, [member], []).memberRows).toHaveLength(2);
  });

  it("exports every match beyond a visible page and excludes unrelated members for a single booking", () => {
    const records = Array.from({ length: 1100 }, (_, index) => booking({ id: `booking-${index}` }));
    expect(buildBookingExportRows(filterBookings(records, [] as Trek[], filters), [], []).memberRows).toHaveLength(1100);
    expect(buildBookingExportRows([booking()], [member, { ...member, id: "unrelated", booking_id: "other" }], []).memberRows).toHaveLength(2);
  });

  it("does not create an empty workbook", async () => {
    await expect(createBookingWorkbook([], [], [])).rejects.toThrow("No bookings");
  });
});
