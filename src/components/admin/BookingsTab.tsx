import { Fragment, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Eye, EyeOff, Search, Download, WalletCards } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Booking, Trek } from "@/lib/admin";
import { STATUS_CHIP, trekDates } from "@/lib/admin";
import { filterBookings, groupBookingsByDeparture, resolveBookingDeparture, sortBookingGroups } from "@/lib/bookingAdmin";
import { buildBookingExportRows, bookingExportFilename, exportBookingMembers } from "@/lib/bookingExport";
import { getBookingPayment, PAYMENT_STATUS_LABEL, validatePaymentAmounts, type PaymentStatus } from "@/lib/bookingPayments";
import { REFUND_LABELS } from "@/lib/bookingRefunds";
import { fmtDate, inr, maskAadhaar } from "@/lib/treks";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import RefundForm from "@/components/admin/RefundForm";

type BookingMember = Database["public"]["Tables"]["booking_members"]["Row"];
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const formatPaymentAmount = (amount: number, currency?: string | null) => `${currency || "INR"} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function paymentPreview(total: number | string | null, paid: string) {
  if (total == null || total === "" || paid.trim() === "") return null;
  try { return validatePaymentAmounts(total, paid); } catch { return null; }
}

function PaymentForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const current = getBookingPayment(booking);
  const [total, setTotal] = useState(current.total == null ? "" : String(current.total));
  const [paid, setPaid] = useState(current.paid == null ? "" : String(current.paid));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = paymentPreview(total, paid);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const payment = validatePaymentAmounts(total, paid);
      setBusy(true);
      await adminApi("updateBooking", {
        id: booking.id,
        patch: { amount_paid: payment.paid, ...(current.total == null ? { booking_total: payment.total } : {}) },
      });
      toast.success("Booking payment updated");
      onDone();
    } catch (cause) {
      setError(errorMessage(cause, "Could not update payment. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{booking.primary_name} · {booking.trek_name}</p>
      {current.total == null ? (
        <div>
          <label htmlFor="payment-total" className="field-label">Total booking amount ({booking.package_currency || "INR"})</label>
          <input id="payment-total" type="number" min="0" max="10000000" step="0.01" inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} className="field-input" required aria-describedby="payment-total-help" />
          <p id="payment-total-help" className="text-xs text-muted-foreground mt-1">This historical booking has no recorded total. Enter its actual agreed total for all participants before recording payment.</p>
        </div>
      ) : <p className="font-medium">Total booking amount: {formatPaymentAmount(current.total, booking.package_currency)}</p>}
      {current.paid == null && <p className="text-sm text-muted-foreground">Previous status: {PAYMENT_STATUS_LABEL[current.status]}. The amount received was not recorded. Confirm the cumulative amount from your payment records.</p>}
      <div>
        <label htmlFor="payment-paid" className="field-label">Amount paid so far ({booking.package_currency || "INR"})</label>
        <input id="payment-paid" type="number" min="0" max={total || "10000000"} step="0.01" inputMode="decimal" value={paid} onChange={(event) => setPaid(event.target.value)} className="field-input" required aria-describedby="payment-paid-help" />
        <p id="payment-paid-help" className="mt-1 text-xs text-muted-foreground">Enter the cumulative amount received for this whole booking, including earlier payments. This replaces the saved amount.</p>
      </div>
      <div className="rounded-lg bg-muted p-3 text-sm space-y-1" aria-live="polite">
        <p>Payment status: <strong>{preview ? PAYMENT_STATUS_LABEL[preview.status] : "Enter valid amounts"}</strong></p>
        <p>Remaining balance: <strong>{preview ? formatPaymentAmount(preview.balance, booking.package_currency) : "—"}</strong></p>
        {preview?.total === 0 && <p>No payment is due for this zero-total booking.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end"><button type="submit" disabled={busy} className="btn-primary btn-sm disabled:opacity-60">{busy ? "Saving…" : "Save payment"}</button></div>
    </form>
  );
}

export default function BookingsTab({
  bookings,
  members,
  treks,
  reload,
}: {
  bookings: Booking[];
  members: BookingMember[];
  treks: Trek[];
  reload: () => void;
}) {
  const [query, setQuery] = useState("");
  const [trekFilter, setTrekFilter] = useState("all");
  const [departureFilter, setDepartureFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentStatus>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "online" | "manual">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "confirmed" | "pending" | "cancelled">("active");
  const [participantAgeFilter, setParticipantAgeFilter] = useState("all");
  const [participantGenderFilter, setParticipantGenderFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "no_show" | "not_marked">("all");
  const [refundFilter, setRefundFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Booking | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [statusBooking, setStatusBooking] = useState<Booking | null>(null);
  const [statusAction, setStatusAction] = useState<"confirm" | "cancel">("confirm");
  const [statusBusy, setStatusBusy] = useState(false);

  const membersByBooking = useMemo(() => {
    const m = new Map<string, BookingMember[]>();
    members.forEach((x) => {
      const a = m.get(x.booking_id) ?? [];
      a.push(x);
      m.set(x.booking_id, a);
    });
    return m;
  }, [members]);

  const filtered = useMemo(() => filterBookings(bookings, treks, {
    query, trek: trekFilter, departure: departureFilter, package: packageFilter,
    payment: paymentFilter, source: sourceFilter, status: statusFilter, sort: sortDir,
    participantAge: participantAgeFilter, participantGender: participantGenderFilter,
  }, members), [bookings, members, query, trekFilter, departureFilter, packageFilter, paymentFilter, sourceFilter, statusFilter, participantAgeFilter, participantGenderFilter, sortDir, treks]);
  const attendanceFiltered = useMemo(() => filtered.filter(booking => {
    const group = membersByBooking.get(booking.id) ?? [];
    if (attendanceFilter === "no_show" && !booking.primary_no_show && !group.some(member => member.no_show)) return false;
    if (attendanceFilter === "not_marked" && (booking.primary_no_show || group.some(member => member.no_show))) return false;
    return refundFilter === "all" || (booking.refund_status ?? "not_applicable") === refundFilter;
  }), [filtered, membersByBooking, attendanceFilter, refundFilter]);

  const departureOptions = useMemo(() => [...new Set(bookings.map((booking) => resolveBookingDeparture(booking, treks)).filter(Boolean) as string[])].sort(), [bookings, treks]);
  const packageOptions = useMemo(() => {
    const pairs = new Map<string, string>();
    bookings.forEach((booking) => { if (booking.selected_package_id) pairs.set(booking.selected_package_id, booking.selected_package_name || booking.selected_package_id); });
    return [...pairs.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookings]);
  const ageOptions = useMemo(() => [...new Set([
    ...bookings.map(booking => booking.primary_age), ...members.map(member => member.age),
  ].filter((age): age is number => typeof age === "number" && Number.isFinite(age)))].sort((a, b) => a - b), [bookings, members]);

  const groupedRows = useMemo(() => {
    return sortBookingGroups(groupBookingsByDeparture(attendanceFiltered, treks), sortDir)
      .flatMap(([departure, rows]) => rows.map((booking, index) => ({ booking, departure, first: index === 0, count: rows.length, seats: rows.reduce((sum, row) => sum + (row.seats_booked ?? 1), 0) })));
  }, [attendanceFiltered, treks, sortDir]);

  const updateStatus = async () => {
    if (!statusBooking) return;
    const booking = statusBooking; setStatusBusy(true);
    try {
      await adminApi("updateBooking", { id: booking.id, patch: { status: statusAction === "cancel" ? "cancelled" : "confirmed" } });
      toast.success(statusAction === "cancel" ? "Booking cancelled" : "Booking confirmed"); setStatusBooking(null); reload();
    } catch (error) { toast.error(errorMessage(error, "Could not update booking status")); }
    finally { setStatusBusy(false); }
  };
  const markAttendance = async (bookingId: string, memberId: string | null, noShow: boolean) => {
    try { await adminApi("setAttendance", { id: bookingId, memberId, noShow }); toast.success(noShow ? "Participant marked no-show" : "No-show marking removed"); reload(); }
    catch (error) { toast.error(errorMessage(error, "Could not update attendance")); }
  };

  const exportRows = useMemo(() => {
    const allowedStatus = ["active", "all", "confirmed"].includes(statusFilter);
    const eligible = allowedStatus && attendanceFilter !== "no_show" ? attendanceFiltered.filter(booking => booking.status === "confirmed") : [];
    return buildBookingExportRows(eligible, members, treks, { query, age: participantAgeFilter, gender: participantGenderFilter });
  }, [attendanceFiltered, members, treks, statusFilter, attendanceFilter, query, participantAgeFilter, participantGenderFilter]);

  const downloadMembers = async () => {
    if (trekFilter === "all" || departureFilter === "all" || departureFilter === "unknown") return toast.error("Select one trip and one departure date before downloading.");
    if (!exportRows.memberRows.length) return;
    setDownloading(true);
    try {
      const selected = attendanceFiltered.filter(booking => booking.status === "confirmed");
      await exportBookingMembers(selected, members, treks, { tripId: trekFilter, departure: departureFilter, filters: { query, age: participantAgeFilter, gender: participantGenderFilter } });
      toast.success("Confirmed participant list downloaded."); setExportOpen(false);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Could not download member list"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Bookings &amp; participants</p>
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Bookings ({attendanceFiltered.length})</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setExportOpen(true)} disabled={downloading} className="btn-outline btn-sm disabled:opacity-50">
            <Download className="w-4 h-4" aria-hidden="true" /> {downloading ? "Preparing download…" : "Download member list"}
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-accent btn-sm">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add manual booking
          </button>
        </div>
      </div>

      <div className="surface rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participant name, phone or email…"
            aria-label="Search bookings"
            className="field-input py-2 pl-9"
          />
        </div>
        <select value={trekFilter} onChange={(e) => setTrekFilter(e.target.value)} aria-label="Filter by trip" className="field-input py-2">
          <option value="all">All trips</option>
          {treks.filter((t) => !t.is_archived).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={departureFilter} onChange={(e) => setDepartureFilter(e.target.value)} aria-label="Filter by departure date" className="field-input py-2">
          <option value="all">All departure dates</option>
          {departureOptions.map((date) => <option key={date} value={date}>{fmtDate(date)}</option>)}
          <option value="unknown">Date not recorded</option>
        </select>
        <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} aria-label="Filter by package" className="field-input py-2">
          <option value="all">All packages</option>
          {packageOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          <option value="unknown">Package not recorded</option>
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as "all" | PaymentStatus)} aria-label="Filter by payment" className="field-input py-2">
          <option value="all">Payment: all</option>
          <option value="pending">Payment: pending</option>
          <option value="partial">Payment: partially paid</option>
          <option value="paid">Payment: paid</option>
        </select>
        <div className="flex gap-2">
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "all" | "online" | "manual")} aria-label="Filter by source" className="field-input py-2 flex-1">
            <option value="all">Source: all</option>
            <option value="online">Online</option>
            <option value="manual">Manual</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filter by status" className="field-input py-2 flex-1">
            <option value="active">Status: all except cancelled</option>
            <option value="all">Status: all, including cancelled</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value as typeof attendanceFilter)} aria-label="Filter by participant attendance" className="field-input py-2">
          <option value="all">Attendance: all</option><option value="no_show">Has no-show participants</option><option value="not_marked">No no-shows marked</option>
        </select>
        <select value={refundFilter} onChange={e => setRefundFilter(e.target.value)} aria-label="Filter by refund status" className="field-input py-2">
          <option value="all">Refund: all</option><option value="not_applicable">Not applicable</option><option value="pending">Refund pending</option><option value="partial">Partially refunded</option><option value="refunded">Refunded</option>
        </select>
        <select value={participantAgeFilter} onChange={e => setParticipantAgeFilter(e.target.value)} aria-label="Filter participants by age" className="field-input py-2">
          <option value="all">Age: all</option>{ageOptions.map(age => <option key={age} value={String(age)}>{age} years</option>)}<option value="unknown">Age not recorded</option>
        </select>
        <select value={participantGenderFilter} onChange={e => setParticipantGenderFilter(e.target.value)} aria-label="Filter participants by gender" className="field-input py-2">
          <option value="all">Gender: all</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option><option value="unknown">Not recorded</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "newest" | "oldest")} aria-label="Sort direction" className="field-input py-2">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {attendanceFiltered.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No bookings match the current filters.</p>
      ) : (
        <div className="space-y-2">
          {groupedRows.map(({ booking: b, departure, first, count, seats }) => {
            const ms = membersByBooking.get(b.id) ?? [];
            const isGroup = b.is_group || ms.length > 0;
            const isCancelled = b.status === "cancelled";
            const payment = getBookingPayment(b);
            const pay = payment.status;
            const source = (b.booking_source ?? "online") as "online" | "manual";
            const isOpen = expanded === b.id;
            const showAadhaar = revealed[b.id];

            return (
              <Fragment key={b.id}>
              {first && (
                <div className="flex flex-wrap items-end justify-between gap-2 pt-5 first:pt-0">
                  <div><p className="kicker">Departure</p><h2 className="font-display text-xl font-bold text-primary">{departure === "unknown" ? "Departure date not recorded" : fmtDate(departure)}</h2></div>
                  <p className="text-sm text-muted-foreground">{count} booking{count === 1 ? "" : "s"} · {seats} seat{seats === 1 ? "" : "s"}</p>
                </div>
              )}
              <article className={cn("surface rounded-xl overflow-hidden", isCancelled && "opacity-70")}>
                <div className="w-full flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    aria-expanded={isOpen}
                    className="min-w-0 basis-full text-left hover:opacity-80 transition md:basis-auto md:flex-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {isGroup && (
                        <span className="pill bg-primary/10 text-primary">GROUP BOOKING · {ms.length + 1} PEOPLE</span>
                      )}
                      <span className={cn("font-semibold text-foreground", isCancelled && "line-through")}>
                        {b.primary_name}
                      </span>
                      <span className={cn("pill", STATUS_CHIP[b.status.toUpperCase()] ?? "bg-muted text-muted-foreground")}>{b.status.toUpperCase()}</span>
                      {(b.primary_no_show || ms.some(member => member.no_show)) && <span className="pill bg-amber-500/15 text-amber-800">NO SHOW · {[b.primary_no_show, ...ms.map(member => member.no_show)].filter(Boolean).length}</span>}
                      <span className="pill bg-muted text-foreground">{REFUND_LABELS[b.refund_status as keyof typeof REFUND_LABELS] ?? REFUND_LABELS.not_applicable}</span>
                      {source === "manual" && <span className="pill bg-blue-500/15 text-blue-700">MANUAL</span>}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs text-muted-foreground">
                      <span className="min-w-0 break-words">{b.trek_name}</span>
                      <span aria-hidden="true">·</span>
                      <span className={departure === "unknown" ? "break-words" : "whitespace-nowrap"}>{departure === "unknown" ? "Departure date not recorded" : fmtDate(departure)}</span>
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground hidden md:block">{b.primary_phone}</span>
                  <span className="pill bg-primary/10 text-primary">{b.seats_booked ?? 1} seat{(b.seats_booked ?? 1) > 1 ? "s" : ""}</span>
                  <span className={cn("pill", STATUS_CHIP[pay.toUpperCase()])}>{PAYMENT_STATUS_LABEL[pay]}</span>
                  <button type="button" onClick={() => setEditingPayment(b)} className="btn-outline btn-sm">Update payment</button>
                  <button type="button" onClick={() => setRefundBooking(b)} className="btn-outline btn-sm" aria-label={`Update refund for ${b.primary_name}`}><WalletCards className="h-4 w-4" />Refund</button>
                  {b.status === "pending" ? (
                    <>
                      <button type="button" onClick={() => { setStatusAction("confirm"); setStatusBooking(b); }} className="btn-outline btn-sm">Confirm booking</button>
                      <button type="button" onClick={() => { setStatusAction("cancel"); setStatusBooking(b); }} className="btn-outline btn-sm">Cancel booking</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setStatusAction(b.status === "confirmed" ? "cancel" : "confirm"); setStatusBooking(b); }} className="btn-outline btn-sm">{b.status === "confirmed" ? "Cancel booking" : "Confirm booking"}</button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    aria-label={isOpen ? "Collapse details" : "Expand details"}
                    className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-muted/30 p-4 md:p-5 text-sm space-y-3">
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                      <p><span className="text-muted-foreground">Departure:</span> <span className="font-medium">{departure === "unknown" ? "Departure date not recorded" : fmtDate(departure)}</span></p>
                      <p><span className="text-muted-foreground">Package:</span> <span className="font-medium">{b.selected_package_name || "Package not recorded"}</span></p>
                      {b.package_unit_amount != null && <p><span className="text-muted-foreground">Unit price:</span> <span className="font-medium">{inr(b.package_unit_amount)} {b.package_price_basis === "per_booking" ? "per booking" : "per participant"}</span></p>}
                      <p><span className="text-muted-foreground">Total booking amount:</span> <span className="font-medium">{payment.total == null ? "Not recorded" : formatPaymentAmount(payment.total, b.package_currency)}</span></p>
                      <p><span className="text-muted-foreground">Amount paid so far:</span> <span className="font-medium">{payment.paid == null ? "Not recorded" : formatPaymentAmount(payment.paid, b.package_currency)}</span></p>
                      <p><span className="text-muted-foreground">Remaining balance:</span> <span className="font-medium">{payment.balance == null ? "Not recorded" : formatPaymentAmount(payment.balance, b.package_currency)}</span></p>
                      <p><span className="text-muted-foreground">Attendance:</span> <span className="font-medium">{b.primary_no_show ? "No show" : "Not marked"}</span>{b.status === "confirmed" && <button type="button" className="ml-2 text-xs font-semibold text-accent underline" onClick={() => void markAttendance(b.id, null, !b.primary_no_show)}>{b.primary_no_show ? "Undo no-show" : "Mark no-show"}</button>}</p>
                      <p><span className="text-muted-foreground">Refund (whole booking):</span> <span className="font-medium">{REFUND_LABELS[b.refund_status as keyof typeof REFUND_LABELS] ?? REFUND_LABELS.not_applicable}</span>{b.refund_approved != null && <span> · Remaining {formatPaymentAmount(Math.max(0, b.refund_approved - (b.amount_refunded ?? 0)), b.package_currency)}</span>}</p>
                      <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{b.primary_email ?? "—"}</span></p>
                      <p><span className="text-muted-foreground">Age / Gender:</span> <span className="font-medium">{b.primary_age ?? "—"} / {b.primary_gender ?? "—"}</span></p>
                      <p>
                        <span className="text-muted-foreground">Aadhaar:</span>{" "}
                        <span className="font-medium tabular-nums">{showAadhaar ? (b.primary_aadhaar ?? "—") : maskAadhaar(b.primary_aadhaar)}</span>{" "}
                        {b.primary_aadhaar && (
                          <button
                            type="button"
                            onClick={() => setRevealed((r) => ({ ...r, [b.id]: !r[b.id] }))}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                            aria-label={showAadhaar ? "Hide Aadhaar number" : "Reveal Aadhaar number"}
                          >
                            {showAadhaar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {showAadhaar ? "Hide" : "Reveal"}
                          </button>
                        )}
                      </p>
                      <p><span className="text-muted-foreground">Source:</span> <span className="font-medium">{source === "manual" ? "Manual" : "Online"}</span></p>
                    </div>
                    {b.notes && <p><span className="text-muted-foreground">Notes:</span> <span className="font-medium whitespace-pre-wrap">{b.notes}</span></p>}
                    {ms.length > 0 && (
                      <div>
                        <p className="font-semibold text-foreground mb-2">Group members ({ms.length})</p>
                        <ul className="space-y-1.5">
                          {ms.map((m) => (
                            <li key={m.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                              <p className="font-medium">{m.full_name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Attendance: {m.no_show ? "No show" : "Not marked"}{b.status === "confirmed" && <button type="button" className="ml-2 font-semibold text-accent underline" onClick={() => void markAttendance(b.id, m.id, !m.no_show)}>{m.no_show ? "Undo no-show" : "Mark no-show"}</button>}</p>
                              <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                                <div><dt className="inline">Age: </dt><dd className="inline text-foreground">{m.age ?? "Not provided"}</dd></div>
                                <div><dt className="inline">Gender: </dt><dd className="inline text-foreground">{m.gender || "Not provided"}</dd></div>
                                <div><dt className="inline">Phone: </dt><dd className="inline text-foreground">{m.phone || "Not provided"}</dd></div>
                                <div><dt className="inline">Email: </dt><dd className="inline text-foreground">{m.email || "Not provided"}</dd></div>
                              </dl>
                              {m.aadhaar_number && (
                                <button
                                  type="button"
                                  onClick={() => setRevealed((r) => ({ ...r, [`m-${m.id}`]: !r[`m-${m.id}`] }))}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                                  aria-label={revealed[`m-${m.id}`] ? "Hide Aadhaar number" : "Reveal Aadhaar number"}
                                >
                                  {revealed[`m-${m.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  {revealed[`m-${m.id}`] ? "Hide" : "Reveal"}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setRefundBooking(b)} className="btn-outline btn-sm">Update refund record</button></div>
                  </div>
                )}
              </article>
              </Fragment>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">Add manual booking</DialogTitle>
          </DialogHeader>
          <ManualBookingForm treks={treks.filter((t) => !t.is_archived && !t.is_draft)} onDone={() => { setAddOpen(false); reload(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPayment} onOpenChange={(open) => { if (!open) setEditingPayment(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl text-primary">Update booking payment</DialogTitle></DialogHeader>
          {editingPayment && <PaymentForm key={editingPayment.id} booking={editingPayment} onDone={() => { setEditingPayment(null); reload(); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!refundBooking} onOpenChange={open => { if (!open) setRefundBooking(null); }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Update refund record</DialogTitle></DialogHeader>{refundBooking && <RefundForm key={refundBooking.id} booking={refundBooking} onDone={() => { setRefundBooking(null); reload(); toast.success("Refund record saved"); }} />}</DialogContent>
      </Dialog>
      <ConfirmDialog open={!!statusBooking} title={statusAction === "cancel" ? "Cancel this booking?" : "Confirm this booking?"}
        description={statusBooking ? statusAction === "cancel"
          ? statusBooking.status === "confirmed" ? `${statusBooking.seats_booked ?? 1} seat(s) will be released. Payments, refunds and attendance records will be preserved.` : `Cancel ${statusBooking.primary_name}'s booking request for ${statusBooking.trek_name}?`
          : `Confirm ${statusBooking.primary_name}'s booking for ${statusBooking.trek_name}? Available capacity will be checked.` : ""}
        confirmLabel={statusAction === "cancel" ? "Cancel booking" : "Confirm booking"} destructive={statusAction === "cancel"} busy={statusBusy} onConfirm={() => void updateStatus()} onClose={() => setStatusBooking(null)} />
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Confirm member list filters</DialogTitle></DialogHeader>
          <p className="text-sm">Trip: <strong>{treks.find(trip => trip.id === trekFilter)?.name ?? "All trips"}</strong></p>
          <p className="text-sm">Departure: <strong>{departureFilter === "all" ? "All dates" : departureFilter === "unknown" ? "Not recorded" : fmtDate(departureFilter)}</strong></p>
          <p className="text-sm">Booking status: {statusFilter}; attendance: {attendanceFilter}; refund: {refundFilter}; age: {participantAgeFilter}; gender: {participantGenderFilter}; package: {packageFilter}; payment: {paymentFilter}; source: {sourceFilter}{query.trim() ? `; name/phone search: ${query.trim()}` : ""}</p>
          <p className="rounded-lg bg-muted p-3 text-sm">Only participants from confirmed bookings are included. Participants marked as no-show are excluded.</p>
          <p role="status" className="font-medium">{exportRows.bookingCount} eligible booking(s) · {exportRows.memberRows.length} eligible participant(s)</p>
          {trekFilter !== "all" && departureFilter !== "all" && departureFilter !== "unknown" && <p className="text-sm text-muted-foreground">Filename: {bookingExportFilename(treks.find(trip => trip.id === trekFilter)?.name ?? "Trip", departureFilter)}</p>}
          {!exportRows.memberRows.length && <p className="text-sm text-muted-foreground">No confirmed participants match all selected filters. No file will be downloaded.</p>}
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setExportOpen(false)}>Back to filters</button><button className="btn-primary" disabled={downloading || !exportRows.memberRows.length || trekFilter === "all" || departureFilter === "all" || departureFilter === "unknown"} onClick={() => void downloadMembers()}>{downloading ? "Preparing…" : "Confirm and download"}</button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================== */
/* Manual booking form                                                 */
/* ================================================================== */

function ManualBookingForm({ treks, onDone }: { treks: Trek[]; onDone: () => void }) {
  const [trekId, setTrekId] = useState<string>(treks[0]?.id ?? "");
  const selectedTrek = treks.find((trek) => trek.id === trekId);
  const availableDates = selectedTrek ? trekDates(selectedTrek) : [];
  const packages = selectedTrek?.trip_details.packages ?? [];
  const [departureDate, setDepartureDate] = useState<string>(() => availableDates.length === 1 ? availableDates[0] : "");
  const [packageId, setPackageId] = useState<string>(() => packages.length === 1 ? packages[0].id : "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [seats, setSeats] = useState(1);
  const [amountPaid, setAmountPaid] = useState("0");
  const [bookingTotal, setBookingTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const configuredTotal = !packages.length && selectedTrek ? Math.round(selectedTrek.price * 100) * seats / 100 : selectedPackage?.priceAmount == null ? null
    : selectedPackage.priceBasis === "per_booking" ? selectedPackage.priceAmount : Math.round(selectedPackage.priceAmount * 100) * seats / 100;
  const preview = paymentPreview(configuredTotal ?? bookingTotal, amountPaid);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trekId) return toast.error("Please select a trip");
    if (!fullName.trim()) return toast.error("Full name is required");
    if (!phone.trim()) return toast.error("Phone number is required");
    const trek = treks.find((t) => t.id === trekId);
    if (!trek) return toast.error("Invalid trip");
    if (!departureDate) return toast.error("Please select a departure date");
    const selectedPackage = trek.trip_details.packages.find((item) => item.id === packageId) ?? null;
    if (trek.trip_details.packages.length > 0 && !selectedPackage) return toast.error("Please select a package");
    const seatCount = Math.max(1, Number(seats) || 1);
    const total = !packages.length ? Math.round(trek.price * 100) * seatCount / 100 : selectedPackage?.priceAmount == null ? bookingTotal : selectedPackage.priceBasis === "per_booking" ? selectedPackage.priceAmount : Math.round(selectedPackage.priceAmount * 100) * seatCount / 100;
    let payment: ReturnType<typeof validatePaymentAmounts>;
    try { payment = validatePaymentAmounts(total, amountPaid); }
    catch (cause) { return toast.error(errorMessage(cause, "Please check the booking amounts")); }

    setBusy(true);
    try {
      await adminApi("insertBooking", {
        row: {
          trek_id: trek.id,
          trek_name: trek.name,
          primary_name: fullName.trim(),
          primary_phone: phone.trim(),
          primary_email: email.trim() || null,
          primary_age: age ? Number(age) : null,
          primary_gender: gender || null,
          seats_booked: seatCount,
          trek_date: departureDate,
          selected_package_id: selectedPackage?.id ?? null,
          selected_package_name: selectedPackage?.name || null,
          package_unit_amount: selectedPackage?.priceAmount ?? null,
          package_price_basis: selectedPackage?.priceAmount != null ? selectedPackage.priceBasis : null,
          package_currency: selectedPackage?.priceAmount != null ? selectedPackage.currency : null,
          booking_total: payment.total,
          amount_paid: payment.paid,
          booking_source: "manual",
          notes: notes.trim() || null,
          status: "pending",
        },
      });
      toast.success("Manual booking added");
      onDone();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to add booking"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="field-label">Select Trip *</label>
        <select value={trekId} onChange={(e) => { const nextId = e.target.value; const nextTrek = treks.find((trek) => trek.id === nextId); const dates = nextTrek ? trekDates(nextTrek) : []; const nextPackages = nextTrek?.trip_details.packages ?? []; setTrekId(nextId); setDepartureDate(dates.length === 1 ? dates[0] : ""); setPackageId(nextPackages.length === 1 ? nextPackages[0].id : ""); setBookingTotal(""); setAmountPaid("0"); }} className="field-input" required>
          {treks.length === 0 && <option value="">No active trips</option>}
          {treks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="field-label">Departure date *</label>
          <select value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="field-input" required>
            <option value="">Select departure</option>
            {availableDates.map((date) => <option key={date} value={date}>{fmtDate(date)}</option>)}
          </select>
        </div>
        {packages.length > 0 && (
          <div>
            <label className="field-label">Package *</label>
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className="field-input" required>
              <option value="">Select package</option>
              {packages.map((item) => <option key={item.id} value={item.id}>{item.name || "Trip package"}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="field-label">Full Name *</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input" required />
        </div>
        <div>
          <label className="field-label">Phone Number *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input" required />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Age</label>
          <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="field-input">
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="field-label">Number of people</label>
          <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="field-input" />
        </div>
        <div className="sm:col-span-2">
          {configuredTotal == null ? <>
            <label htmlFor="manual-booking-total" className="field-label">Total booking amount ({selectedPackage?.currency || "INR"}) *</label>
            <input id="manual-booking-total" type="number" min="0" max="10000000" step="0.01" inputMode="decimal" value={bookingTotal} onChange={(event) => setBookingTotal(event.target.value)} className="field-input" required />
            <p className="mt-1 text-xs text-muted-foreground">Enter the agreed total for the selected package and all participants.</p>
          </> : <p className="text-sm font-medium">Total booking amount: {formatPaymentAmount(configuredTotal, selectedPackage?.currency)}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="manual-amount-paid" className="field-label">Amount paid so far ({selectedPackage?.currency || "INR"}) *</label>
          <input id="manual-amount-paid" type="number" min="0" max={configuredTotal ?? (bookingTotal || "10000000")} step="0.01" inputMode="decimal" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} className="field-input" required aria-describedby="manual-paid-help" />
          <p id="manual-paid-help" className="mt-1 text-xs text-muted-foreground">The cumulative amount received for this whole booking, including all earlier payments.</p>
          <div className="mt-3 rounded-lg bg-muted p-3 text-sm space-y-1" aria-live="polite">
            <p>Payment status: <strong>{preview ? PAYMENT_STATUS_LABEL[preview.status] : "Enter valid amounts"}</strong></p>
            <p>Remaining balance: <strong>{preview ? formatPaymentAmount(preview.balance, selectedPackage?.currency) : "—"}</strong></p>
            {preview?.total === 0 && <p>No payment is due for this zero-total booking.</p>}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="field-input" rows={3} placeholder="e.g. Paid via UPI to trek lead" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={busy} className="btn-primary btn-sm disabled:opacity-60">
          {busy ? "Saving…" : "Add booking"}
        </button>
      </div>
    </form>
  );
}
