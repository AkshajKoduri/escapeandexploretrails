import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Eye, EyeOff, X, Search } from "lucide-react";
import { adminApi } from "@/lib/adminApi";
import type { Booking, Trek } from "@/lib/admin";
import { STATUS_CHIP } from "@/lib/admin";
import { maskAadhaar } from "@/lib/treks";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export default function BookingsTab({
  bookings,
  members,
  treks,
  reload,
}: {
  bookings: Booking[];
  members: any[];
  treks: Trek[];
  reload: () => void;
}) {
  const [query, setQuery] = useState("");
  const [trekFilter, setTrekFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "paid">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "online" | "manual">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const membersByBooking = useMemo(() => {
    const m = new Map<string, any[]>();
    members.forEach((x) => {
      const a = m.get(x.booking_id) ?? [];
      a.push(x);
      m.set(x.booking_id, a);
    });
    return m;
  }, [members]);

  const filtered = useMemo(() => {
    let list = [...bookings];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.primary_name, b.primary_phone, b.primary_email, b.trek_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (trekFilter !== "all") list = list.filter((b) => b.trek_id === trekFilter || b.trek_name === trekFilter);
    if (paymentFilter !== "all") list = list.filter((b) => (b.payment_status ?? "pending") === paymentFilter);
    if (sourceFilter !== "all") list = list.filter((b) => (b.booking_source ?? "online") === sourceFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "cancelled") list = list.filter((b) => b.status === "cancelled");
      else if (statusFilter === "confirmed") list = list.filter((b) => b.status === "confirmed");
      else list = list.filter((b) => b.status === "pending");
    }
    list.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "newest" ? -diff : diff;
    });
    return list;
  }, [bookings, query, trekFilter, paymentFilter, sourceFilter, statusFilter, sortDir]);

  const cancelBooking = async () => {
    if (!cancelling) return;
    const b = cancelling;
    setCancelling(null);
    try {
      await adminApi("updateBooking", { id: b.id, patch: { status: "cancelled" } });
      toast.success("Booking cancelled");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const setPaymentStatus = async (b: Booking, value: "pending" | "paid") => {
    try {
      await adminApi("updateBooking", { id: b.id, patch: { payment_status: value } });
      toast.success(`Marked as ${value}`);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Bookings &amp; participants</p>
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Bookings ({filtered.length})</h1>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-accent btn-sm">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add manual booking
        </button>
      </div>

      <div className="surface rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} aria-label="Filter by payment" className="field-input py-2">
          <option value="all">Payment: all</option>
          <option value="pending">Payment: pending</option>
          <option value="paid">Payment: paid</option>
        </select>
        <div className="flex gap-2">
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} aria-label="Filter by source" className="field-input py-2 flex-1">
            <option value="all">Source: all</option>
            <option value="online">Online</option>
            <option value="manual">Manual</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} aria-label="Filter by status" className="field-input py-2 flex-1">
            <option value="all">Status: all</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} aria-label="Sort direction" className="field-input py-2 lg:col-span-1">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground surface rounded-xl p-6">No bookings match the current filters.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((b) => {
            const ms = membersByBooking.get(b.id) ?? [];
            const isGroup = b.is_group || ms.length > 0;
            const isCancelled = b.status === "cancelled";
            const pay = (b.payment_status ?? "pending") as "pending" | "paid";
            const source = (b.booking_source ?? "online") as "online" | "manual";
            const isOpen = expanded === b.id;
            const showAadhaar = revealed[b.id];

            return (
              <li key={b.id} className={cn("surface rounded-xl overflow-hidden", isCancelled && "opacity-70")}>
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
                      {b.trek_name} · {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </button>
                  <span className="text-xs text-muted-foreground hidden md:block">{b.primary_phone}</span>
                  <span className="pill bg-primary/10 text-primary">{b.seats_booked ?? 1} seat{(b.seats_booked ?? 1) > 1 ? "s" : ""}</span>
                  <span className={cn("pill", STATUS_CHIP[pay === "paid" ? "PAID" : "PENDING"])}>{pay === "paid" ? "Paid" : "Pending"}</span>
                  <select
                    value={pay}
                    onChange={(e) => setPaymentStatus(b, e.target.value as "pending" | "paid")}
                    aria-label="Payment status"
                    className="px-2 py-1.5 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
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
                            <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">{m.full_name}</span>
                              <span className="text-muted-foreground">
                                Aadhaar: {revealed[`m-${m.id}`] ? (m.aadhaar_number ?? "—") : maskAadhaar(m.aadhaar_number)}
                              </span>
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
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">Add manual booking</DialogTitle>
          </DialogHeader>
          <ManualBookingForm treks={treks.filter((t) => !t.is_archived && !t.is_draft)} onDone={() => { setAddOpen(false); reload(); }} />
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
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [seats, setSeats] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trekId) return toast.error("Please select a trip");
    if (!fullName.trim()) return toast.error("Full name is required");
    if (!phone.trim()) return toast.error("Phone number is required");
    const trek = treks.find((t) => t.id === trekId);
    if (!trek) return toast.error("Invalid trip");

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
          seats_booked: Math.max(1, Number(seats) || 1),
          payment_status: paymentStatus,
          booking_source: "manual",
          notes: notes.trim() || null,
          status: "pending",
        },
      });
      toast.success("Manual booking added");
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="field-label">Select Trip *</label>
        <select value={trekId} onChange={(e) => setTrekId(e.target.value)} className="field-input" required>
          {treks.length === 0 && <option value="">No active trips</option>}
          {treks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
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
          <label className="field-label">Payment Status</label>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} className="field-input">
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
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