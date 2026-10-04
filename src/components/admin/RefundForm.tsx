import { useState, type FormEvent } from "react";
import { adminApi } from "@/lib/adminApi";
import type { Booking } from "@/lib/admin";
import { REFUND_LABELS, validateRefund } from "@/lib/bookingRefunds";

export default function RefundForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [approved, setApproved] = useState(booking.refund_approved == null ? "" : String(booking.refund_approved));
  const [refunded, setRefunded] = useState(booking.amount_refunded == null ? "" : String(booking.amount_refunded));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  let preview: ReturnType<typeof validateRefund> | null = null;
  try { preview = validateRefund(booking.amount_paid, approved, refunded); } catch { /* Show validation on submit. */ }
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try {
      const values = validateRefund(booking.amount_paid, approved, refunded);
      setBusy(true);
      await adminApi("updateRefund", { id: booking.id, approved: values.approved, refunded: values.refunded });
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save refund."); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm">{booking.primary_name} · {booking.trek_name}</p>
    <p className="text-sm text-muted-foreground">Amounts apply to the entire booking. Recording a refund does not send money or change the original amount paid.</p>
    <p>Amount received: {booking.amount_paid == null ? "Not recorded — confirm payment records first" : `${booking.package_currency || "INR"} ${booking.amount_paid}`}</p>
    {booking.refund_approved == null && <p className="text-sm text-muted-foreground">Refund amounts have not been recorded. Enter the actual amounts, including zero where applicable.</p>}
    <label className="field-label">Approved refund amount<input className="field-input mt-1" type="number" min="0" step="0.01" required value={approved} onChange={event => setApproved(event.target.value)} /></label>
    <label className="field-label">Amount refunded so far<input className="field-input mt-1" type="number" min="0" step="0.01" required value={refunded} onChange={event => setRefunded(event.target.value)} /></label>
    <div className="rounded-lg bg-muted p-3 text-sm" aria-live="polite">Status: {preview ? REFUND_LABELS[preview.status] : "Enter valid amounts"}<br />Remaining refund: {preview ? `${booking.package_currency || "INR"} ${preview.remaining.toFixed(2)}` : "—"}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save refund record"}</button>
  </form>;
}
