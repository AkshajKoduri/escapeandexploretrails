import { validatePaymentAmounts } from "./bookingPayments";
export const REFUND_LABELS = { not_applicable: "Not applicable", pending: "Refund pending", partial: "Partially refunded", refunded: "Refunded" } as const;
export type RefundStatus = keyof typeof REFUND_LABELS;
export function refundStatus(approved?: number | null, refunded?: number | null): RefundStatus {
  return !approved ? "not_applicable" : !refunded ? "pending" : refunded < approved ? "partial" : "refunded";
}
export function validateRefund(received: number | null, approved: string, refunded: string) {
  const result = validatePaymentAmounts(approved, refunded);
  if (result.total > (received ?? 0)) throw new Error("Approved refund cannot exceed the recorded amount received.");
  return { approved: result.total, refunded: result.paid, remaining: result.balance, status: refundStatus(result.total, result.paid) };
}
