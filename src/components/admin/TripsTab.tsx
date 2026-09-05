import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Archive,
  Copy,
  ArrowLeft,
  Download,
  Users,
  FileText,
  X,
  Check,
} from "lucide-react";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import type { Trek, SeatStats, Booking } from "@/lib/admin";
import {
  OUTSTATION_EXTRA_FIELDS,
  STATUS_CHIP,
  TREK_CATEGORIES,
  emptyTrek,
  isPastTrip,
  normalizeUrl,
  seatStatus,
  trekDateLabel,
  trekDates,
} from "@/lib/admin";
import { fmtDate, maskAadhaar } from "@/lib/treks";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

/* ================================================================== */
/* Trips tab                                                           */
/* ================================================================== */

export default function TripsTab({
  treks,
  stats,
  bookings,
  members,
  reload,
}: {
  treks: Trek[];
  stats: Map<string, SeatStats>;
  bookings: Booking[];
  members: any[];
  reload: () => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Trek | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trek | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "archive" | "delete"; trek: Trek }>(null);

  const visible = useMemo(() => {
    let list = [...treks];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.name, t.destination, t.location, t.region].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => {
        if (statusFilter === "draft") return t.is_draft;
        if (statusFilter === "archived") return t.is_archived;
        if (statusFilter === "full") {
          const s = stats.get(t.id);
          return (s?.seats_taken ?? 0) >= t.max_seats;
        }
        const s = stats.get(t.id);
        return seatStatus(t, s?.seats_taken ?? 0) === statusFilter && !t.is_draft && !t.is_archived;
      });
    }
    return list.sort((a, b) => (trekDates(a)[0] ?? "").localeCompare(trekDates(b)[0] ?? ""));
  }, [treks, query, statusFilter, stats]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: Trek) => { setEditing(t); setFormOpen(true); };

  const duplicate = async (t: Trek) => {
    try {
      const copy: any = { ...t };
      delete copy.id;
      delete copy.created_at;
      const row = {
        name: `${t.name} (copy)`,
        destination: t.destination,
        location: t.location,
        trek_date: t.trek_date,
        additional_dates: t.additional_dates,
        trek_time: t.trek_time,
        difficulty: t.difficulty,
        duration: t.duration,
        distance: t.distance,
        description: t.description,
        price: t.price,
        starting_price: t.starting_price,
        starting_price_label: t.starting_price_label,
        top_end_price: t.top_end_price,
        top_end_price_label: t.top_end_price_label,
        max_seats: t.max_seats,
        meeting_point: t.meeting_point,
        instructions: t.instructions,
        status_override: t.status_override,
        image_url: t.image_url,
        album_url: t.album_url,
        itinerary_url: t.itinerary_url,
        itinerary_days: t.itinerary_days,
        event_type: t.event_type,
        trek_category: t.trek_category,
        trek_difficulty: t.trek_difficulty,
        trek_distance: t.trek_distance,
        altitude: t.altitude,
        region: t.region,
        elevation_gain: t.elevation_gain,
        mountain_range: t.mountain_range,
        base_village: t.base_village,
        duration_text: t.duration_text,
        stay_location: t.stay_location,
        field_labels: t.field_labels,
        is_draft: true,
      };
      await adminApi("insertTrek", { row });
      toast.success("Duplicated as a draft");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const archiveTrek = async () => {
    if (!confirm) return;
    const t = confirm.trek;
    setConfirm(null);
    try {
      await adminApi("updateTrek", { id: t.id, patch: { is_archived: true } });
      toast.success("Moved to past trips");
      if (selected?.id === t.id) setSelected(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTrek = async () => {
    if (!confirm) return;
    const t = confirm.trek;
    setConfirm(null);
    try {
      await adminApi("deleteTrek", { id: t.id });
      toast.success("Trip deleted");
      if (selected?.id === t.id) setSelected(null);
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /* ---------- Trip detail view ---------- */
  if (selected) {
    return (
      <TripDetailView
        trek={selected}
        stats={stats}
        bookings={bookings}
        members={members}
        onBack={() => setSelected(null)}
        onEdit={() => openEdit(selected)}
        onArchive={() => setConfirm({ kind: "archive", trek: selected })}
        onDelete={() => setConfirm({ kind: "delete", trek: selected })}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Trip management</p>
          <h1 className="font-display font-bold text-3xl text-primary mt-1">Trips</h1>
        </div>
        <button onClick={openCreate} className="btn-accent btn-sm">
          <Plus className="w-4 h-4" aria-hidden="true" /> Create trip
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or location…"
          aria-label="Search trips"
          className="field-input max-w-xs py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter trips by status"
          className="field-input w-auto py-2"
        >
          <option value="all">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="ALMOST FULL">Almost full</option>
          <option value="FULL">Full</option>
          <option value="COMPLETED">Completed</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="surface rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Trip</span>
          <span>Date</span>
          <span>Location</span>
          <span>Booked</span>
          <span>Price</span>
          <span>Status</span>
        </div>
        {visible.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No trips match the current filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((t) => {
              const s = stats.get(t.id);
              const taken = s?.seats_taken ?? 0;
              const max = t.max_seats || 1;
              const full = taken >= max;
              const status = t.is_draft ? "DRAFT" : t.is_archived ? "COMPLETED" : isPastTrip(t) ? "COMPLETED" : seatStatus(t, taken);
              const price =
                t.starting_price != null || t.top_end_price != null
                  ? [t.starting_price, t.top_end_price].filter((x) => x != null).map((p) => `₹${Number(p).toLocaleString("en-IN")}`).join(" – ")
                  : t.price > 0
                    ? `₹${Number(t.price).toLocaleString("en-IN")}`
                    : "—";
              return (
                <li key={t.id}>
                  <div className="grid md:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_1fr_auto] gap-x-4 gap-y-2 px-5 py-4 items-center hover:bg-muted/40 transition-colors">
                    <button type="button" onClick={() => setSelected(t)} className="text-left min-w-0 group">
                      <span className="font-semibold text-foreground group-hover:text-accent transition-colors block truncate">
                        {t.name}
                      </span>
                      <span className="text-xs text-muted-foreground block md:hidden">{trekDateLabel(t)}</span>
                    </button>
                    <span className="text-sm text-muted-foreground hidden md:block">{trekDateLabel(t)}</span>
                    <span className="text-sm text-muted-foreground truncate">{t.destination || t.location || t.region || "—"}</span>
                    <span className={cn("text-sm font-semibold", full ? "text-destructive" : "text-foreground")}>
                      {taken}/{max}
                    </span>
                    <span className="text-sm text-muted-foreground">{price}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("pill", STATUS_CHIP[status])}>{status}</span>
                      <div className="flex gap-0.5">
                        <button onClick={() => setSelected(t)} title="View trip" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => duplicate(t)} title="Duplicate" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
                          <Copy className="w-4 h-4" />
                        </button>
                        {!t.is_archived && (
                          <button onClick={() => setConfirm({ kind: "archive", trek: t })} title="Archive" className="p-1.5 rounded-md text-muted-foreground hover:bg-muted">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setConfirm({ kind: "delete", trek: t })} title="Delete" className="p-1.5 rounded-md text-destructive/70 hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">
              {editing ? "Edit trip" : "Create trip"}
            </DialogTitle>
          </DialogHeader>
          <TripForm
            initial={editing ?? (emptyTrek as Trek)}
            isEdit={!!editing}
            currentSeatsTaken={editing ? stats.get(editing.id)?.seats_taken ?? 0 : 0}
            onDone={() => { setFormOpen(false); reload(); }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm?.kind === "archive"}
        title="Archive this trip?"
        description={`"${confirm?.trek.name ?? ""}" will be moved to past trips and hidden from the public site. Its bookings stay intact.`}
        confirmLabel="Archive trip"
        onConfirm={archiveTrek}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete"}
        title="Delete this trip?"
        description={`"${confirm?.trek.name ?? ""}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete trip"
        onConfirm={deleteTrek}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

/* ================================================================== */
/* Trip detail view                                                    */
/* ================================================================== */

function TripDetailView({
  trek,
  stats,
  bookings,
  members,
  onBack,
  onEdit,
  onArchive,
  onDelete,
}: {
  trek: Trek;
  stats: Map<string, SeatStats>;
  bookings: Booking[];
  members: any[];
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const s = stats.get(trek.id);
  const taken = s?.seats_taken ?? 0;
  const max = trek.max_seats || 1;
  const remaining = s?.seats_remaining ?? max - taken;
  const status = trek.is_draft ? "DRAFT" : trek.is_archived ? "COMPLETED" : isPastTrip(trek) ? "COMPLETED" : seatStatus(trek, taken);

  const trekBookings = useMemo(
    () => bookings.filter((b) => (b.trek_id === trek.id || b.trek_name === trek.name) && b.status !== "cancelled"),
    [bookings, trek],
  );

  const membersByBooking = useMemo(() => {
    const m = new Map<string, any[]>();
    members.forEach((x) => {
      const a = m.get(x.booking_id) ?? [];
      a.push(x);
      m.set(x.booking_id, a);
    });
    return m;
  }, [members]);

  const price =
    trek.starting_price != null || trek.top_end_price != null
      ? [trek.starting_price, trek.top_end_price].filter((x) => x != null).map((p) => `₹${Number(p).toLocaleString("en-IN")}`).join(" – ")
      : trek.price > 0
        ? `₹${Number(trek.price).toLocaleString("en-IN")}`
        : "—";

  const overview = [
    { label: "Date", value: trekDateLabel(trek) },
    { label: "Location", value: trek.destination || trek.location || trek.region || "—" },
    { label: "Duration", value: trek.duration || "—" },
    { label: "Difficulty", value: trek.difficulty },
    { label: "Price", value: price },
    { label: "Capacity", value: `${max} seats` },
    { label: "Available", value: `${remaining} seats` },
    { label: "Status", value: status },
  ];

  const downloadExcel = async () => {
    if (trekBookings.length === 0) {
      toast.error("No bookings for this trip yet");
      return;
    }
    // Load xlsx (~400 KB) only when exporting — never on admin startup.
    const XLSX = await import("xlsx");
    const rows: any[] = [];
    trekBookings.forEach((b, idx) => {
      const ms = membersByBooking.get(b.id) ?? [];
      rows.push({
        "Booking ID": b.id,
        Trek: b.trek_name,
        "Booking Date": new Date(b.created_at).toLocaleString(),
        Status: b.status,
        "Payment Status": (b.payment_status ?? "pending") === "paid" ? "Paid" : "Pending",
        "Booking Source": b.booking_source === "manual" ? "Manual" : "Online",
        Role: ms.length > 0 ? "GROUP LEADER (Booked By)" : "Primary",
        "Full Name": b.primary_name,
        Age: b.primary_age ?? "",
        Gender: b.primary_gender ?? "",
        Phone: b.primary_phone,
        Email: b.primary_email ?? "",
        "Aadhaar Number": b.primary_aadhaar ?? "",
        "Group Booking": ms.length > 0 ? "Yes" : "No",
        "Seats Booked": b.seats_booked ?? 1,
      });
      ms.forEach((m, i) => {
        rows.push({
          "Booking ID": b.id,
          Trek: "",
          "Booking Date": "",
          Status: "",
          "Payment Status": "",
          "Booking Source": "",
          Role: `   Member ${i + 1} (under ${b.primary_name})`,
          "Full Name": m.full_name,
          Age: "",
          Gender: "",
          Phone: "",
          Email: "",
          "Aadhaar Number": m.aadhaar_number ?? "",
          "Group Booking": "Yes",
          "Seats Booked": "",
        });
      });
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Trekkers");
    const slug = trek.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "trek";
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `e2trails-${slug}-${ts}.xlsx`);
    toast.success("Excel file downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All trips
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={onEdit} className="btn-outline btn-sm"><Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit</button>
          {!trek.is_archived && (
            <button onClick={onArchive} className="btn-outline btn-sm"><Archive className="w-3.5 h-3.5" aria-hidden="true" /> Archive</button>
          )}
          <button onClick={onDelete} className="btn-danger btn-sm"><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete</button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display font-bold text-3xl text-primary">{trek.name}</h1>
          <span className={cn("pill", STATUS_CHIP[status])}>{status}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Trip overview</p>
      </div>

      {trek.image_url && (
        <img src={trek.image_url} alt={trek.name} className="w-full h-48 md:h-64 object-cover rounded-xl" />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden">
        {overview.map((o) => (
          <div key={o.label} className="bg-card p-4">
            <p className="meta-label">{o.label}</p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">{o.value}</p>
          </div>
        ))}
      </div>

      {/* Bookings for this trip */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold text-lg text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" aria-hidden="true" />
            Bookings ({trekBookings.length})
          </h2>
          <button onClick={downloadExcel} className="btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export Excel
          </button>
        </div>
        {trekBookings.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No confirmed bookings for this trip yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {trekBookings.map((b) => {
              const ms = membersByBooking.get(b.id) ?? [];
              return (
                <li key={b.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {ms.length > 0 && (
                      <span className="pill bg-primary/10 text-primary">GROUP BOOKING · {ms.length + 1} PEOPLE</span>
                    )}
                    <span className="font-semibold text-foreground">{b.primary_name}</span>
                    <span className="text-xs text-muted-foreground">{b.primary_phone}</span>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                    <span className={cn("pill", STATUS_CHIP[(b.payment_status ?? "pending") === "paid" ? "PAID" : "PENDING"])}>
                      {(b.payment_status ?? "pending") === "paid" ? "Paid" : "Pending"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground ml-auto">{b.seats_booked ?? 1} seat(s)</span>
                  </div>
                  {ms.length > 0 && (
                    <ul className="mt-2 pl-4 border-l-2 border-border space-y-1">
                      {ms.map((m) => (
                        <li key={m.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{m.full_name}</span>
                          <span className="text-muted-foreground/60">Aadhaar: {maskAadhaar(m.aadhaar_number)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Trip form (create / edit)                                           */
/* ================================================================== */

const inp = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent";

function FF({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TripForm({
  initial,
  isEdit,
  currentSeatsTaken,
  onDone,
}: {
  initial: Trek;
  isEdit: boolean;
  currentSeatsTaken: number;
  onDone: () => void;
}) {
  const [f, setF] = useState<Trek>(initial);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [itineraryFile, setItineraryFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Trek>) => setF((p) => ({ ...p, ...patch }));

  const isValidUrl = (v: string) => {
    try { new URL(v); return true; } catch { return false; }
  };

  const removeItineraryFile = async () => {
    if (!f.itinerary_file_path) return;
    if (!confirm("Remove the uploaded itinerary PDF?")) return;
    try {
      await adminRemove("itineraries", f.itinerary_file_path);
      if (isEdit) await adminApi("updateTrek", { id: f.id, patch: { itinerary_file_path: null } });
      set({ itinerary_file_path: null });
      toast.success("Itinerary removed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name?.trim()) return toast.error("Trip name is required");
    if (f.max_seats < currentSeatsTaken) {
      return toast.error(`Can't set max seats below current bookings (${currentSeatsTaken})`);
    }
    if (f.album_url && !isValidUrl(f.album_url)) return toast.error("Album link must be a valid URL");
    if (f.itinerary_url && !isValidUrl(f.itinerary_url)) return toast.error("Itinerary link must be a valid URL");
    if (itineraryFile) {
      if (itineraryFile.type !== "application/pdf") return toast.error("Itinerary must be a PDF file");
      if (itineraryFile.size > 10 * 1024 * 1024) return toast.error("Itinerary PDF must be under 10MB");
    }

    setBusy(true);
    try {
      let imageUrl = f.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `trips/${crypto.randomUUID()}.${ext}`;
        const up = await adminUpload("trek-images", path, imageFile);
        imageUrl = up.publicUrl ?? imageUrl;
      }

      let itineraryPath = f.itinerary_file_path;
      if (itineraryFile) {
        const path = `trips/${crypto.randomUUID()}.pdf`;
        const up = await adminUpload("itineraries", path, itineraryFile);
        if (f.itinerary_file_path) {
          try { await adminRemove("itineraries", f.itinerary_file_path); } catch { /* ignore */ }
        }
        itineraryPath = up.path;
      }

      const cleanDates = (f.additional_dates ?? []).map((d) => (d ?? "").trim()).filter(Boolean);
      const startPrice = f.starting_price != null && !Number.isNaN(Number(f.starting_price)) ? Number(f.starting_price) : null;
      const topPrice = f.top_end_price != null && !Number.isNaN(Number(f.top_end_price)) ? Number(f.top_end_price) : null;

      const payload: any = {
        name: f.name.trim(),
        destination: f.destination?.trim() || null,
        location: f.location?.trim() || null,
        trek_date: f.trek_date || null,
        additional_dates: cleanDates,
        trek_time: f.trek_time?.trim() || null,
        difficulty: f.difficulty,
        duration: f.duration?.trim() || null,
        distance: f.distance?.trim() || null,
        description: f.description?.trim() || null,
        price: startPrice ?? (Number(f.price) || 0),
        starting_price: startPrice,
        starting_price_label: null,
        top_end_price: null,
        top_end_price_label: null,
        max_seats: Number(f.max_seats) || 1,
        meeting_point: f.meeting_point?.trim() || null,
        instructions: f.instructions?.trim() || null,
        status_override: f.status_override || null,
        image_url: imageUrl ?? null,
        album_url: normalizeUrl(f.album_url),
        itinerary_url: normalizeUrl(f.itinerary_url),
        itinerary_file_path: itineraryPath || null,
        itinerary_days: (f.itinerary_days ?? [])
          .map((d) => ({ title: (d.title ?? "").trim(), description: (d.description ?? "").trim() }))
          .filter((d) => d.title || d.description),
        event_type: f.event_type || "Hike",
        trek_category: f.trek_category?.trim() || null,
        trek_difficulty: f.trek_difficulty?.trim() || null,
        trek_distance: f.trek_distance?.trim() || null,
        altitude: f.altitude?.trim() || null,
        region: f.region?.trim() || null,
        elevation_gain: f.elevation_gain?.trim() || null,
        mountain_range: f.mountain_range?.trim() || null,
        base_village: f.base_village?.trim() || null,
        duration_text: f.duration_text?.trim() || null,
        stay_location: f.stay_location?.trim() || null,
        field_labels: f.field_labels ?? {},
      };

      if (isEdit) {
        await adminApi("updateTrek", { id: f.id, patch: payload });
        toast.success("Trip updated");
      } else {
        await adminApi("insertTrek", { row: payload });
        toast.success("Trip created");
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const et = f.event_type ?? "Hike";
  const isCycling = et === "Cycling Ride";
  const isHike = et === "Hike";
  const isOutstation = et === "Monsoon Trek";
  const isBikeRide = et === "Bike Ride";

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <FF label="Event Type *" full>
        <select className={inp} value={et} onChange={(e) => set({ event_type: e.target.value as any })}>
          <option value="Hike">Hike</option>
          <option value="Cycling Ride">Cycling Ride</option>
          <option value="Bike Ride">Bike Ride</option>
          <option value="Monsoon Trek">Monsoon Trek</option>
        </select>
      </FF>

      <FF label="Trip name *" full><input className={inp} value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} required /></FF>

      {isOutstation ? (
        <>
          <FF label="Trek Category">
            <select className={inp} value={f.trek_category ?? ""} onChange={(e) => set({ trek_category: e.target.value })}>
              <option value="">— none —</option>
              {TREK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FF>
          <FF label="Destination"><input className={inp} value={f.destination ?? ""} onChange={(e) => set({ destination: e.target.value })} placeholder="Bhongir, Telangana" /></FF>
        </>
      ) : null}

      <FF label={isOutstation ? "Dates" : "Date *"} full>
        <div className="space-y-2">
          <input
            type="date"
            className={inp}
            value={f.trek_date ?? ""}
            onChange={(e) => set({ trek_date: e.target.value })}
            required={!isOutstation}
          />
          {(f.additional_dates ?? []).map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="date"
                className={inp}
                value={d}
                onChange={(e) => {
                  const next = [...(f.additional_dates ?? [])];
                  next[i] = e.target.value;
                  set({ additional_dates: next });
                }}
              />
              <button
                type="button"
                onClick={() => set({ additional_dates: (f.additional_dates ?? []).filter((_, j) => j !== i) })}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                title="Remove date"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ additional_dates: [...(f.additional_dates ?? []), ""] })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add another date
          </button>
        </div>
      </FF>

      <FF label={isOutstation ? "Assembly Time" : "Assembly Time *"}><input className={inp} value={f.trek_time ?? ""} onChange={(e) => set({ trek_time: e.target.value })} placeholder="6:00 AM" required={!isOutstation} /></FF>
      <FF label={isOutstation ? "Meeting point" : "Meeting point *"} full><input className={inp} value={f.meeting_point ?? ""} onChange={(e) => set({ meeting_point: e.target.value })} placeholder="Hitech City Metro, 5:00 AM" required={!isOutstation} /></FF>

      {isHike && (
        <FF label="Trail name / Location *" full><input className={inp} value={f.location ?? ""} onChange={(e) => set({ location: e.target.value })} placeholder="Ananthagiri Hills Trail" required /></FF>
      )}

      {(isCycling || isHike || isBikeRide) && (
        <>
          <FF label="Distance (km) *"><input className={inp} value={f.distance ?? ""} onChange={(e) => set({ distance: e.target.value })} placeholder="25 km" required /></FF>
          <FF label="Duration (hours) *"><input className={inp} value={f.duration ?? ""} onChange={(e) => set({ duration: e.target.value })} placeholder="4 hours" required /></FF>
        </>
      )}

      {isOutstation && (
        <>
          <FF label="Duration (days)"><input className={inp} value={f.duration ?? ""} onChange={(e) => set({ duration: e.target.value })} placeholder="2 Days" /></FF>
          <FF label="Distance from Hyderabad"><input className={inp} value={f.distance ?? ""} onChange={(e) => set({ distance: e.target.value })} placeholder="350 km from Hyd" /></FF>
        </>
      )}

      <FF label={isOutstation ? "Difficulty" : "Difficulty *"}>
        <select className={inp} value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value as any })}>
          <option>Easy</option><option>Moderate</option><option>Hard</option>
        </select>
      </FF>
      <FF label={isOutstation ? "Max seats" : `Max seats *${currentSeatsTaken > 0 ? ` (${currentSeatsTaken} booked)` : ""}`}>
        <input type="number" min={1} className={inp} value={f.max_seats ?? 30} onChange={(e) => set({ max_seats: Number(e.target.value) })} required={!isOutstation} />
      </FF>

      <FF label="Starting Price (₹)">
        <input type="number" min={0} className={inp} value={f.starting_price ?? ""} onChange={(e) => set({ starting_price: e.target.value === "" ? null : Number(e.target.value) })} placeholder="15800" />
      </FF>

      <FF label={isOutstation ? "Description" : "Description *"} full><textarea rows={3} className={inp} value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} required={!isOutstation} /></FF>
      <FF label="Special instructions (what to carry, wear etc.)" full><textarea rows={2} className={inp} value={f.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value })} placeholder="Carry 2L water, sturdy shoes..." /></FF>

      {isOutstation && (
        <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold text-primary">Monsoon trek details (optional)</div>
          <p className="text-xs text-muted-foreground">Click the pencil next to any label to rename it. Leave a field blank to hide it from the public trip page.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OUTSTATION_EXTRA_FIELDS.map((field) => {
              const key = field.key as string;
              const currentLabel = (f.field_labels && f.field_labels[key]) || field.label;
              const value = (f as any)[key] ?? "";
              return (
                <div key={key}>
                  <EditableLabel
                    value={currentLabel}
                    defaultValue={field.label}
                    onChange={(newLabel) => {
                      const labels = { ...(f.field_labels ?? {}) };
                      if (!newLabel || newLabel === field.label) delete labels[key];
                      else labels[key] = newLabel;
                      set({ field_labels: labels } as any);
                    }}
                  />
                  {field.type === "select" ? (
                    <select className={inp} value={value} onChange={(e) => set({ [key]: e.target.value } as any)}>
                      {(field.options ?? []).map((o) => (
                        <option key={o} value={o}>{o || "— none —"}</option>
                      ))}
                    </select>
                  ) : (
                    <input className={inp} value={value} onChange={(e) => set({ [key]: e.target.value } as any)} placeholder={field.placeholder} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOutstation && (
        <FF label="Photo album link (Google Drive / any URL)" full>
          <input type="url" className={inp} value={f.album_url ?? ""} onChange={(e) => set({ album_url: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." />
        </FF>
      )}

      <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <FileText className="w-4 h-4" /> Itinerary (shown on the trip page)
        </div>
        <FF label="Itinerary link (optional)" full>
          <input type="url" className={inp} value={f.itinerary_url ?? ""} onChange={(e) => set({ itinerary_url: e.target.value })} placeholder="https://drive.google.com/file/d/..." />
        </FF>
        <div>
          <label className="block text-xs font-semibold mb-2 text-muted-foreground">Day-wise itinerary (structured)</label>
          <div className="space-y-3">
            {(f.itinerary_days ?? []).map((day, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Day {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => set({ itinerary_days: (f.itinerary_days ?? []).filter((_, i) => i !== idx) })}
                    className="ml-auto text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  className={inp}
                  placeholder="Day title (e.g. Day 1: Arrival & Trek Start)"
                  value={day.title}
                  onChange={(e) => {
                    const next = [...(f.itinerary_days ?? [])];
                    next[idx] = { ...next[idx], title: e.target.value };
                    set({ itinerary_days: next });
                  }}
                />
                <textarea
                  className={`${inp} min-h-[80px]`}
                  placeholder="Day description"
                  value={day.description}
                  onChange={(e) => {
                    const next = [...(f.itinerary_days ?? [])];
                    next[idx] = { ...next[idx], description: e.target.value };
                    set({ itinerary_days: next });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ itinerary_days: [...(f.itinerary_days ?? []), { title: "", description: "" }] })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted"
            >
              <Plus className="w-4 h-4" /> Add day
            </button>
          </div>
        </div>

        <FF label="Optional: upload a PDF fallback (max 10MB)" full>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:brightness-110"
          />
          {f.itinerary_file_path && !itineraryFile && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground truncate flex-1">📄 Current: {f.itinerary_file_path.split("/").pop()}</span>
              <button type="button" onClick={removeItineraryFile} className="px-2 py-1 rounded-md text-destructive hover:bg-destructive/10">
                Remove
              </button>
            </div>
          )}
        </FF>
      </div>

      <FF label="Cover image (optional)" full>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:brightness-110"
        />
        {f.image_url && !imageFile && <img src={f.image_url} alt="" className="mt-2 w-24 h-24 rounded-lg object-cover" />}
      </FF>

      <FF label="Status override (admin)" full>
        <select className={inp} value={f.status_override ?? ""} onChange={(e) => set({ status_override: e.target.value || null })}>
          <option value="">Auto (by date)</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </FF>

      <div className="md:col-span-2">
        <button type="submit" disabled={busy} className="w-full btn-primary disabled:opacity-60">
          {busy ? "Saving…" : isEdit ? "Save changes" : "Create trip"}
        </button>
      </div>
    </form>
  );
}

function EditableLabel({ value, defaultValue, onChange }: { value: string; defaultValue: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    const v = draft.trim();
    onChange(v || defaultValue);
    setEditing(false);
  };
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {editing ? (
        <>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
            className="text-xs font-semibold px-2 py-0.5 rounded border border-input bg-background flex-1"
          />
          <button type="button" onClick={commit} className="p-1 text-primary hover:bg-primary/10 rounded" title="Save label"><Check className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => { setDraft(value); setEditing(false); }} className="p-1 text-muted-foreground hover:bg-muted rounded" title="Cancel"><X className="w-3.5 h-3.5" /></button>
        </>
      ) : (
        <>
          <label className="block text-xs font-semibold text-muted-foreground">{value}</label>
          <button type="button" onClick={() => setEditing(true)} className="p-0.5 text-muted-foreground hover:text-primary" title="Rename label">
            <Pencil className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}