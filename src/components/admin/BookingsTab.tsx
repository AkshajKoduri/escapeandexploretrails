import { Fragment, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Eye, EyeOff, X, Search, Download } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Booking, Trek } from "@/lib/admin";
import { STATUS_CHIP, trekDates } from "@/lib/admin";
import { filterBookings, groupBookingsByDeparture, resolveBookingDeparture } from "@/lib/bookingAdmin";
import { exportBookingMembers } from "@/lib/bookingExport";
import { getBookingPayment, PAYMENT_STATUS_LABEL, validatePaymentAmounts, type PaymentStatus } from "@/lib/bookingPayments";
import { fmtDate, inr, maskAadhaar } from "@/lib/treks";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

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
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [editingPayment, setEditingPayment] = useState<Booking | null>(null);
  const [downloading, setDownloading] = useState(false);

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
  }), [bookings, query, trekFilter, departureFilter, packageFilter, paymentFilter, sourceFilter, statusFilter, sortDir, treks]);

  const departureOptions = useMemo(() => [...new Set(bookings.map((booking) => resolveBookingDeparture(booking, treks)).filter(Boolean) as string[])].sort(), [bookings, treks]);
  const packageOptions = useMemo(() => {
    const pairs = new Map<string, string>();
    bookings.forEach((booking) => { if (booking.selected_package_id) pairs.set(booking.selected_package_id, booking.selected_package_name || booking.selected_package_id); });
    return [...pairs.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  const groupedRows = useMemo(() => {
    return [...groupBookingsByDeparture(filtered, treks).entries()]
      .sort(([a], [b]) => a === "unknown" ? 1 : b === "unknown" ? -1 : a.localeCompare(b))
      .flatMap(([departure, rows]) => rows.map((booking, index) => ({ booking, departure, first: index === 0, count: rows.length, seats: rows.reduce((sum, row) => sum + (row.seats_booked ?? 1), 0) })));
  }, [filtered, treks]);

  const cancelBooking = async () => {
    if (!cancelling) return;
    const b = cancelling;
    setCancelling(null);
    try {
      await adminApi("updateBooking", { id: b.id, patch: { status: "cancelled" } });
      toast.success("Booking cancelled");
      reload();
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Could not cancel booking"));
    }
  };

  const downloadMembers = async (selection: Booking[]) => {
    if (!selection.length) return toast.error("No bookings match the current filters.");
    setDownloading(true);
    try {
      const trips = new Set(selection.map((booking) => booking.trek_name));
      const label = selection.length === 1 ? `booking-${selection[0].id}` : trips.size === 1 ? selection[0].trek_name : "filtered-bookings";
      await exportBookingMembers(selection, members, treks, { label });
      toast.success("Member list downloaded. Booking totals are on the Booking payments sheet.");
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
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Bookings ({filtered.length})</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadMembers(filtered)} disabled={downloading || filtered.length === 0} className="btn-outline btn-sm disabled:opacity-50">
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
            placeholder="Search name, phone or email…"
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "confirmed" | "pending" | "cancelled")} aria-label="Filter by status" className="field-input py-2 flex-1">
            <option value="all">Status: all</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "newest" | "oldest")} aria-label="Sort direction" className="field-input py-2">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {filtered.length === 0 ? (
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
                    className="flex-1 min-w-0 text-left hover:opacity-80 transition"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {isGroup && (
                        <span className="pill bg-primary/10 text-primary">GROUP BOOKING · {ms.length + 1} PEOPLE</span>
                      )}
                      <span className={cn("font-semibold text-foreground", isCancelled && "line-through")}>
                        {b.primary_name}
                      </span>
                      {isCancelled && <span className={cn("pill", STATUS_CHIP.CANCELLED)}>CANCELLED</span>}
                      {source === "manual" && <span className="pill bg-blue-500/15 text-blue-700">MANUAL</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {b.trek_name} · {departure === "unknown" ? "Departure date not recorded" : fmtDate(departure)}
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground hidden md:block">{b.primary_phone}</span>
                  <span className="pill bg-primary/10 text-primary">{b.seats_booked ?? 1} seat{(b.seats_booked ?? 1) > 1 ? "s" : ""}</span>
                  <span className={cn("pill", STATUS_CHIP[pay.toUpperCase()])}>{PAYMENT_STATUS_LABEL[pay]}</span>
                  <button type="button" onClick={() => setEditingPayment(b)} className="btn-outline btn-sm">Update payment</button>
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
                    <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => downloadMembers([b])} disabled={downloading} className="btn-outline btn-sm disabled:opacity-50"><Download className="w-4 h-4" aria-hidden="true" /> Download this booking’s members</button>
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => setCancelling(b)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" /> Cancel booking
                      </button>
                    )}
                    </div>
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

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel this booking?"
        description={
          cancelling
            ? `${cancelling.primary_name}'s ${cancelling.seats_booked ?? 1} seat(s) for ${cancelling.trek_name} will be freed. This can be undone by changing the status back.`
            : ""
        }
        confirmLabel="Cancel booking"
        onConfirm={cancelBooking}
        onClose={() => setCancelling(null)}
      />
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
