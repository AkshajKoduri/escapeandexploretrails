import { describe, expect, it } from "vitest";
import { manualBookingSnapshot, normalizePayment } from "../../supabase/functions/_shared/bookingPayment";

describe("server payment validation", () => {
  it("derives pending, partial and paid including zero-total bookings", () => {
    const record = { booking_total: 1000, amount_paid: 0, payment_status: "pending" };
    expect(normalizePayment(record, { amount_paid: 0 }).payment_status).toBe("pending");
    expect(normalizePayment(record, { amount_paid: 250.50 }).payment_status).toBe("partial");
    expect(normalizePayment(record, { amount_paid: 1000 }).payment_status).toBe("paid");
    expect(normalizePayment(null, { booking_total: 0, amount_paid: 0 }).payment_status).toBe("paid");
  });
  it.each([-1, 1001, 0.001, NaN, Infinity])("rejects invalid cumulative payment %s", (amount_paid) => {
    expect(() => normalizePayment({ booking_total: 1000 }, { amount_paid })).toThrow();
  });
  it("preserves unknown historic amounts on unrelated edits", () => {
    expect(normalizePayment({ booking_total: null, amount_paid: null, payment_status: "paid" }, { notes: "Called" })).toEqual({ notes: "Called" });
    expect(() => normalizePayment({ booking_total: null, amount_paid: null }, { amount_paid: 20 })).toThrow(/total/);
    expect(normalizePayment({ booking_total: null, amount_paid: null }, { booking_total: 1000, amount_paid: 700 }).payment_status).toBe("partial");
  });
  it("rejects total tampering but permits correcting cumulative receipts", () => {
    expect(() => normalizePayment({ booking_total: 1000 }, { booking_total: 2000, amount_paid: 1500 })).toThrow();
    expect(normalizePayment({ booking_total: 1000, amount_paid: 700 }, { amount_paid: 650 }).payment_status).toBe("partial");
  });
  it("ignores forged prices and snapshots the configured package", () => {
    const trek = { name: "Trip", price: 100, trip_details: { packages: [{ id: "bus", name: "With transport", priceAmount: 1200, priceBasis: "per_person" }] } };
    expect(manualBookingSnapshot({ selected_package_id: "bus", seats_booked: 3, booking_total: 1, package_unit_amount: 1 }, trek)).toMatchObject({ booking_total: 3600, package_unit_amount: 1200, selected_package_name: "With transport" });
    expect(manualBookingSnapshot({ seats_booked: 3 }, { name: "Local", price: 100 })).toMatchObject({ booking_total: 300 });
  });
  it("uses per-booking pricing once and keeps explicitly agreed unpriced totals", () => {
    const trip_details = { packages: [{ id: "tent", priceAmount: 999.99, priceBasis: "per_booking" }] };
    expect(manualBookingSnapshot({ seats_booked: 3 }, { trip_details }).booking_total).toBe(999.99);
    expect(manualBookingSnapshot({ seats_booked: 3, booking_total: 4500 }, { trip_details: { packages: [{ id: "custom", priceAmount: null }] } }).booking_total).toBe(4500);
  });
});
