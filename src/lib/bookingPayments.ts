export type PaymentStatus = "pending" | "partial" | "paid";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  partial: "Partially paid",
  paid: "Paid",
};

type PaymentRecord = {
  booking_total?: number | null;
  amount_paid?: number | null;
  payment_status?: string | null;
};

/** Validate currency before converting to integer paise, avoiding floating point comparisons. */
export function moneyInPaise(value: number | string): number {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error("Enter a non-negative amount with at most two decimal places.");
  }
  const [rupees, fraction = ""] = text.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise > 1_000_000_000) {
    throw new Error("Amount cannot exceed 10,000,000.");
  }
  return paise;
}

export function validatePaymentAmounts(total: number | string, paid: number | string) {
  const totalPaise = moneyInPaise(total);
  const paidPaise = moneyInPaise(paid);
  if (paidPaise > totalPaise) throw new Error("Amount paid cannot exceed the total booking amount.");
  return {
    total: totalPaise / 100,
    paid: paidPaise / 100,
    balance: (totalPaise - paidPaise) / 100,
    status: (paidPaise === totalPaise ? "paid" : paidPaise === 0 ? "pending" : "partial") as PaymentStatus,
  };
}

/** Historical unknown amounts stay unknown; never substitute the current trip's price. */
export function getBookingPayment(booking: PaymentRecord) {
  const status: PaymentStatus = booking.payment_status === "paid" || booking.payment_status === "partial"
    ? booking.payment_status : "pending";
  const total = booking.booking_total ?? null;
  const paid = booking.amount_paid ?? null;
  if (total != null && paid != null) {
    try {
      return validatePaymentAmounts(total, paid);
    } catch {
      // Preserve historical records that need an admin's correction, without inventing a balance.
    }
  }
  return { total, paid, balance: null, status };
}
