import { describe, expect, it } from "vitest";
import { getBookingPayment, validatePaymentAmounts } from "@/lib/bookingPayments";

describe("booking payments", () => {
  it("moves from pending to partially paid to paid, including corrections", () => {
    expect(validatePaymentAmounts(1000, 0)).toEqual({ total: 1000, paid: 0, balance: 1000, status: "pending" });
    expect(validatePaymentAmounts(1000, 250)).toEqual({ total: 1000, paid: 250, balance: 750, status: "partial" });
    expect(validatePaymentAmounts(1000, 1000).status).toBe("paid");
    expect(validatePaymentAmounts(1000, 100).balance).toBe(900);
    expect(validatePaymentAmounts(1000, 0).status).toBe("pending");
  });

  it("handles decimal currency without residual balances and free bookings as paid", () => {
    expect(validatePaymentAmounts("10.30", "10.20").balance).toBe(0.1);
    expect(validatePaymentAmounts("0", "0")).toEqual({ total: 0, paid: 0, balance: 0, status: "paid" });
  });

  it.each([-1, "", "  ", "1.001", Infinity, NaN, "1e2", 10_000_001])("rejects invalid amount %s", (amount) => {
    expect(() => validatePaymentAmounts(1000, amount)).toThrow();
  });

  it("rejects payments above the agreed booking total", () => {
    expect(() => validatePaymentAmounts(100, 100.01)).toThrow("cannot exceed");
  });

  it("preserves historical payment status without inventing amounts or balances", () => {
    expect(getBookingPayment({ payment_status: "paid", booking_total: null, amount_paid: null }))
      .toEqual({ total: null, paid: null, balance: null, status: "paid" });
    expect(getBookingPayment({ payment_status: "paid", booking_total: 2000, amount_paid: null }))
      .toEqual({ total: 2000, paid: null, balance: null, status: "paid" });
  });

  it("derives the display status from known amounts after reopening a booking", () => {
    expect(getBookingPayment({ booking_total: 300, amount_paid: 75, payment_status: "pending" }))
      .toEqual({ total: 300, paid: 75, balance: 225, status: "partial" });
  });
});
