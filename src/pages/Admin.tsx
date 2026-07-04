import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mountain, Download, ArrowLeft, Plus, Trash2, Pencil, Archive, Users, FileText, X, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Trek = {
  id: string;
  name: string;
  destination: string | null;
  location: string | null;
  trek_date: string | null;
  additional_dates: string[];
  trek_time: string | null;
  difficulty: "Easy" | "Moderate" | "Hard";
  duration: string | null;
  distance: string | null;
  image_url: string | null;
  description: string | null;
  price: number;
  starting_price: number | null;
  starting_price_label: string | null;
  top_end_price: number | null;
  top_end_price_label: string | null;
  max_seats: number;
  meeting_point: string | null;
  instructions: string | null;
  status_override: string | null;
  is_archived: boolean;
  is_draft: boolean;
  album_url: string | null;
  itinerary_url: string | null;
  itinerary_file_path: string | null;
  event_type: "Hike" | "Cycling Ride" | "Outstation Trek";
  trek_difficulty: string | null;
  trek_distance: string | null;
  altitude: string | null;
  region: string | null;
  elevation_gain: string | null;
  mountain_range: string | null;
  base_village: string | null;
  duration_text: string | null;
  stay_location: string | null;
  field_labels: Record<string, string> | null;
};

type Stats = { trek_id: string; max_seats: number; seats_taken: number; seats_remaining: number };

type Booking = any;

const empty: Partial<Trek> = {
  name: "", destination: "", trek_date: "", additional_dates: [], trek_time: "", difficulty: "Easy",
  duration: "", distance: "", description: "", price: 0,
  starting_price: null, starting_price_label: "", top_end_price: null, top_end_price_label: "",
  max_seats: 30,
  meeting_point: "", instructions: "", location: "",
  album_url: "", itinerary_url: "", itinerary_file_path: "", event_type: "Hike",
  trek_difficulty: "", trek_distance: "", altitude: "", region: "",
  elevation_gain: "", mountain_range: "", base_village: "",
  duration_text: "", stay_location: "", field_labels: {},
};


export const OUTSTATION_EXTRA_FIELDS: { key: keyof Trek; label: string; type?: "select"; options?: string[]; placeholder?: string }[] = [
  { key: "trek_difficulty", label: "Trek Difficulty", type: "select", options: ["", "Easy", "Moderate", "Hard", "Very Hard"] },
  { key: "trek_distance", label: "Trek Distance", placeholder: "14 Kms/10 hrs" },
  { key: "altitude", label: "Altitude", placeholder: "1,422 M/4,670 FT" },
  { key: "region", label: "Region", placeholder: "Malshej Ghat, Maharashtra" },
  { key: "elevation_gain", label: "Elevation Gain", placeholder: "700 M/2,297 FT" },
  { key: "mountain_range", label: "Mountain Range", placeholder: "Western Ghats" },
  { key: "base_village", label: "Base Village", placeholder: "Khireshwar" },
  { key: "duration_text", label: "Duration", placeholder: "3D/2N" },
  { key: "stay_location", label: "Stay Location", placeholder: "Khireshwar Village" },
];

function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  const v = u.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function deriveStatus(t: Trek): "Upcoming" | "Ongoing" | "Completed" | "Archived" | "Draft" {
  if (t.is_archived) return "Archived";
  if (t.is_draft) return "Draft";
  if (t.status_override) return t.status_override as any;
  const today = new Date().toISOString().slice(0, 10);
  const allDates = [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[];
  if (allDates.length === 0) return "Upcoming";
  const latest = allDates.reduce((a, b) => (a > b ? a : b));
  if (latest > today) return "Upcoming";
  if (allDates.includes(today)) return "Ongoing";
  return "Completed";
}


const statusColor: Record<string, string> = {
  Upcoming: "bg-green-500/15 text-green-700 dark:text-green-300",
  Ongoing: "bg-accent/15 text-accent",
  Completed: "bg-muted text-muted-foreground",
  Archived: "bg-secondary/20 text-secondary-foreground",
  Draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

export default function Admin() {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [stats, setStats] = useState<Map<string, Stats>>(new Map());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const loadAll = async () => {
    const [{ data: trekData }, { data: statsData }, { data: bData }, { data: mData }] = await Promise.all([
      supabase.from("upcoming_treks").select("*").order("trek_date", { ascending: true }),
      supabase.rpc("get_trek_seat_stats"),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("booking_members").select("*"),
    ]);
    if (trekData) setTreks(trekData as Trek[]);
    const sm = new Map<string, Stats>();
    (statsData ?? []).forEach((s: any) => sm.set(s.trek_id, s));
    setStats(sm);
    setBookings(bData ?? []);
    setMembers(mData ?? []);
  };

  useEffect(() => {
    document.title = "Admin — E2 Trails";
    loadAll();
  }, []);

  const activeTreks = useMemo(() => treks.filter((t) => !t.is_archived && !t.is_draft), [treks]);
  const draftTreks = useMemo(() => treks.filter((t) => t.is_draft && !t.is_archived), [treks]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-trail border border-primary/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Mountain className="w-7 h-7 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-primary">Trek Lead Dashboard</h1>
          </div>

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-xl">
              <TabsTrigger value="trips">Trips</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-6">
              <TripsTab treks={activeTreks} stats={stats} reload={loadAll} />
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <BookingsTab bookings={bookings} members={members} treks={treks} stats={stats} reload={loadAll} />
            </TabsContent>

            <TabsContent value="drafts" className="mt-6">
              <DraftsTab treks={draftTreks} reload={loadAll} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

/* ===================== Trips Tab ===================== */

function TripsTab({ treks, stats, reload, userId }: { treks: Trek[]; stats: Map<string, Stats>; reload: () => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trek | null>(null);

  const startCreate = () => { setEditing(null); setOpen(true); };
  const startEdit = (t: Trek) => { setEditing(t); setOpen(true); };

  const archiveTrek = async (id: string) => {
    if (!confirm("Move this trek to Past Trips?")) return;
    const { error } = await supabase.from("upcoming_treks").update({ is_archived: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved to Past Trips");
    reload();
  };

  const deleteTrek = async (id: string) => {
    if (!confirm("Permanently delete this trek?")) return;
    const { error } = await supabase.from("upcoming_treks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trek deleted");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-heading font-bold text-lg text-primary">Active treks ({treks.length})</h2>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-secondary transition"
        >
          <Plus className="w-4 h-4" /> Add trip
        </button>
      </div>

      {treks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active treks. Click "Add trip" to create one.</p>
      ) : (
        <div className="space-y-3">
          {treks.map((t) => {
            const s = stats.get(t.id);
            const taken = s?.seats_taken ?? 0;
            const max = t.max_seats;
            const status = deriveStatus(t);
            return (
              <div key={t.id} className="rounded-xl border border-border bg-background p-4 flex flex-col md:flex-row md:items-center gap-4">
                {t.image_url ? (
                  <img src={t.image_url} alt={t.name} className="w-full md:w-24 h-24 rounded-lg object-cover" />
                ) : (
                  <div className="w-full md:w-24 h-24 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                    <Mountain className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{t.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColor[status]}`}>{status}</span>
                    {taken >= max && <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/15 text-destructive font-bold">FULL</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const dates = [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[];
                      const dateStr = dates.length ? dates.map((d) => new Date(d).toLocaleDateString()).join(", ") : "No date";
                      return <>{dateStr}{t.trek_time ? ` • ${t.trek_time}` : ""} • {t.difficulty}{t.destination ? ` • ${t.destination}` : ""}</>;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    💰 {t.starting_price != null || t.top_end_price != null
                      ? [t.starting_price, t.top_end_price].filter((x) => x != null).map((p) => `₹${Number(p).toLocaleString("en-IN")}`).join(" – ")
                      : t.price > 0 ? `₹${Number(t.price).toLocaleString("en-IN")}` : "—"} • 🪑 {taken}/{max} seats
                  </div>

                </div>
                <div className="flex gap-1 self-end md:self-auto">
                  <button onClick={() => startEdit(t)} className="p-2 rounded-lg text-primary hover:bg-primary/10" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => archiveTrek(t.id)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted" title="Archive"><Archive className="w-4 h-4" /></button>
                  <button onClick={() => deleteTrek(t.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit trip" : "Add new trip"}</DialogTitle>
          </DialogHeader>
          <TripForm
            initial={editing ?? (empty as Trek)}
            isEdit={!!editing}
            userId={userId}
            currentSeatsTaken={editing ? stats.get(editing.id)?.seats_taken ?? 0 : 0}
            onDone={() => { setOpen(false); reload(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripForm({ initial, isEdit, userId, currentSeatsTaken, onDone }: { initial: Trek; isEdit: boolean; userId: string; currentSeatsTaken: number; onDone: () => void }) {
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
    await supabase.storage.from("itineraries").remove([f.itinerary_file_path]);
    if (isEdit) await supabase.from("upcoming_treks").update({ itinerary_file_path: null }).eq("id", f.id);
    set({ itinerary_file_path: null });
    toast.success("Itinerary removed");
  };

  const submit = async (e: React.FormEvent) => {
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
        const { error: upErr } = await supabase.storage.from("trek-images").upload(path, imageFile);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("trek-images").getPublicUrl(path).data.publicUrl;
      }

      let itineraryPath = f.itinerary_file_path;
      if (itineraryFile) {
        const path = `trips/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage.from("itineraries").upload(path, itineraryFile, {
          contentType: "application/pdf", upsert: false,
        });
        if (upErr) throw upErr;
        if (f.itinerary_file_path) {
          await supabase.storage.from("itineraries").remove([f.itinerary_file_path]);
        }
        itineraryPath = path;
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
        starting_price_label: f.starting_price_label?.trim() || null,
        top_end_price: topPrice,
        top_end_price_label: f.top_end_price_label?.trim() || null,
        max_seats: Number(f.max_seats) || 1,
        meeting_point: f.meeting_point?.trim() || null,
        instructions: f.instructions?.trim() || null,
        status_override: f.status_override || null,
        image_url: imageUrl ?? null,
        album_url: normalizeUrl(f.album_url),
        itinerary_url: normalizeUrl(f.itinerary_url),
        itinerary_file_path: itineraryPath || null,
        event_type: f.event_type || "Hike",
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
        const { error } = await supabase.from("upcoming_treks").update(payload).eq("id", f.id);
        if (error) throw error;
        toast.success("Trip updated");
      } else {
        const { error } = await supabase.from("upcoming_treks").insert(payload);
        if (error) throw error;
        toast.success("Trip added");
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
  const isOutstation = et === "Outstation Trek";

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <FF label="Event Type *" full>
        <select className={inp} value={et} onChange={(e) => set({ event_type: e.target.value as any })}>
          <option value="Hike">Hike</option>
          <option value="Cycling Ride">Cycling Ride</option>
          <option value="Outstation Trek">Outstation Trek</option>
        </select>
      </FF>

      <FF label="Trip name *" full><input className={inp} value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} required /></FF>

      {isOutstation ? (
        <FF label="Destination"><input className={inp} value={f.destination ?? ""} onChange={(e) => set({ destination: e.target.value })} placeholder="Bhongir, Telangana" /></FF>
      ) : null}

      <FF label={isOutstation ? "Dates" : "Date *"} full>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={inp}
              value={f.trek_date ?? ""}
              onChange={(e) => set({ trek_date: e.target.value })}
              required={!isOutstation}
            />
          </div>
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

      {(isCycling || isHike) && (
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

      <FF label="Starting Price (₹)" full>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
          <input type="number" min={0} className={inp} value={f.starting_price ?? ""} onChange={(e) => set({ starting_price: e.target.value === "" ? null : Number(e.target.value) })} placeholder="6999" />
          <input className={inp} value={f.starting_price_label ?? ""} onChange={(e) => set({ starting_price_label: e.target.value })} placeholder="e.g. 6,999 - Non-AC Sleeper Train" />
        </div>
      </FF>
      <FF label="Top End Price (₹)" full>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
          <input type="number" min={0} className={inp} value={f.top_end_price ?? ""} onChange={(e) => set({ top_end_price: e.target.value === "" ? null : Number(e.target.value) })} placeholder="8500" />
          <input className={inp} value={f.top_end_price_label ?? ""} onChange={(e) => set({ top_end_price_label: e.target.value })} placeholder="e.g. 8,500 - 3AC Sleeper Train" />
        </div>
      </FF>

      <FF label={isOutstation ? "Description" : "Description *"} full><textarea rows={3} className={inp} value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} required={!isOutstation} /></FF>
      <FF label="Special instructions (what to carry, wear etc.)" full><textarea rows={2} className={inp} value={f.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value })} placeholder="Carry 2L water, sturdy shoes..." /></FF>


      {isOutstation && (
        <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="text-sm font-semibold text-primary">Outstation trek details (optional)</div>
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
                    <input
                      className={inp}
                      value={value}
                      onChange={(e) => set({ [key]: e.target.value } as any)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {isOutstation && (
        <>
          <FF label="Photo album link (Google Drive / any URL)" full>
            <input type="url" className={inp} value={f.album_url ?? ""} onChange={(e) => set({ album_url: e.target.value })} placeholder="https://drive.google.com/drive/folders/..." />
          </FF>

          <div className="md:col-span-2 rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="w-4 h-4" /> Itinerary (shown on the booking page)
            </div>
            <FF label="Itinerary link (optional)" full>
              <input type="url" className={inp} value={f.itinerary_url ?? ""} onChange={(e) => set({ itinerary_url: e.target.value })} placeholder="https://drive.google.com/file/d/..." />
            </FF>
            <FF label="Or upload an itinerary PDF (max 10MB)" full>
              <input
                type="file" accept="application/pdf"
                onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:bg-gold"
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
        </>
      )}

      <FF label="Cover image (optional)" full>
        <input
          type="file" accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:bg-gold"
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
        <button type="submit" disabled={busy} className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-secondary transition disabled:opacity-60">
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add trip to homepage"}
        </button>
      </div>
    </form>
  );
}


const inp = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent";

function FF({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold mb-1 text-muted-foreground">{label}</label>
      {children}
    </div>
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

/* ===================== Bookings Tab ===================== */

function bookingsToRows(bookingsList: Booking[], membersByBooking: Map<string, any[]>) {
  const rows: any[] = [];
  bookingsList.forEach((b, idx) => {
    const groupMembers = membersByBooking.get(b.id) ?? [];
    const isGroup = b.is_group || groupMembers.length > 0;
    rows.push({
      "Booking ID": b.id, Trek: b.trek_name,
      "Booking Date": new Date(b.created_at).toLocaleString(),
      Status: b.status,
      Role: isGroup ? "⭐ GROUP LEADER (Booked By)" : "Primary",
      "Full Name": isGroup ? `⭐ ${b.primary_name}` : b.primary_name,
      Age: b.primary_age, Gender: b.primary_gender,
      Phone: b.primary_phone, Email: b.primary_email ?? "",
      "Aadhaar Number": b.primary_aadhaar, "Aadhaar Photo Path": b.primary_aadhaar_photo,
      "Group Booking": isGroup ? "Yes" : "No", "Seats Booked": b.seats_booked ?? 1,
    });
    groupMembers.forEach((m, i) => {
      rows.push({
        "Booking ID": b.id, Trek: b.trek_name,
        "Booking Date": new Date(b.created_at).toLocaleString(),
        Status: b.status, Role: `   Member ${i + 1} (under ${b.primary_name})`,
        "Full Name": `    ↳ ${m.full_name}`,
        Age: "", Gender: "", Phone: "", Email: "",
        "Aadhaar Number": m.aadhaar_number, "Aadhaar Photo Path": m.aadhaar_photo,
        "Group Booking": "Yes", "Seats Booked": "",
      });
    });
    if (idx < bookingsList.length - 1) {
      rows.push({ "Booking ID": "", Trek: "", "Booking Date": "", Status: "", Role: "", "Full Name": "", Age: "", Gender: "", Phone: "", Email: "", "Aadhaar Number": "", "Aadhaar Photo Path": "", "Group Booking": "", "Seats Booked": "" });
    }
  });
  return rows;
}

function downloadTrekExcel(trek: Trek, bookingsList: Booking[], membersByBooking: Map<string, any[]>) {
  const trekBookings = bookingsList.filter((b) => b.trek_id === trek.id || b.trek_name === trek.name);
  if (trekBookings.length === 0) {
    toast.error("No bookings for this trek yet");
    return;
  }
  const rows = bookingsToRows(trekBookings, membersByBooking);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 32 }, { wch: 28 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Trekkers");
  const slug = trek.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "trek";
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `e2trails-${slug}-${ts}.xlsx`);
  toast.success("Excel file downloaded");
}

function BookingsTab({ bookings, members, treks, stats, reload }: { bookings: Booking[]; members: any[]; treks: Trek[]; stats: Map<string, Stats>; reload: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const membersByBooking = useMemo(() => {
    const m = new Map<string, any[]>();
    members.forEach((x) => {
      const a = m.get(x.booking_id) ?? [];
      a.push(x); m.set(x.booking_id, a);
    });
    return m;
  }, [members]);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.trek_id === filter || b.trek_name === filter);

  const cancelBooking = async (b: Booking) => {
    if (!confirm(`Cancel booking for ${b.primary_name}? Their ${b.seats_booked ?? 1} seat(s) will be freed.`)) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="font-heading font-bold text-lg text-primary flex items-center gap-2">
          <Users className="w-5 h-5" /> Bookings ({filtered.length})
        </h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inp + " max-w-xs"}>
          <option value="all">All treks</option>
          {treks.filter((t) => !t.is_archived).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Per-trek seat summary + download */}
      <p className="text-xs text-muted-foreground">Each card below downloads only that trek's bookings.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {treks.filter((t) => !t.is_archived && !t.is_draft).map((t) => {
          const s = stats.get(t.id);
          const taken = s?.seats_taken ?? 0;
          const max = t.max_seats;
          const full = taken >= max;
          const trekBookingCount = bookings.filter((b) => (b.trek_id === t.id || b.trek_name === t.name) && b.status !== "cancelled").length;
          return (
            <div key={t.id} className="rounded-xl border border-border bg-background p-3 flex flex-col gap-2">
              <div>
                <div className="text-sm font-semibold text-primary truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.trek_date).toLocaleDateString()}</div>
                <div className={`mt-1 text-sm font-bold ${full ? "text-destructive" : "text-foreground"}`}>{taken} / {max} seats {full && "• FULL"}</div>
              </div>
              <button
                onClick={() => downloadTrekExcel(t, bookings, membersByBooking)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-orange text-accent-foreground text-xs font-semibold shadow-glow hover:scale-[1.02] transition"
              >
                <Download className="w-3.5 h-3.5" /> Download bookings for this trek ({trekBookingCount})
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const ms = membersByBooking.get(b.id) ?? [];
            const isOpen = expanded === b.id;
            const isCancelled = b.status === "cancelled";
            return (
              <div key={b.id} className={`rounded-xl border border-border bg-background ${isCancelled ? "opacity-70" : ""}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  className="w-full p-4 text-left flex flex-wrap items-center gap-3 hover:bg-muted/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span className={isCancelled ? "line-through" : ""}>{b.primary_name}</span>
                      {isCancelled && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-destructive/15 text-destructive font-bold">CANCELLED</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.trek_name} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{b.primary_phone}</div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                    {b.seats_booked ?? 1} seat{(b.seats_booked ?? 1) > 1 ? "s" : ""}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-border p-4 text-sm space-y-2 bg-muted/20">
                    <div><strong>Email:</strong> {b.primary_email ?? "—"}</div>
                    <div><strong>Age / Gender:</strong> {b.primary_age} / {b.primary_gender}</div>
                    <div><strong>Aadhaar:</strong> {b.primary_aadhaar}</div>
                    {ms.length > 0 && (
                      <div>
                        <div className="font-semibold mt-2 mb-1">Group members ({ms.length}):</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {ms.map((m) => (
                            <li key={m.id}>{m.full_name} — Aadhaar: {m.aadhaar_number}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!isCancelled && (
                      <div className="pt-3">
                        <button
                          onClick={() => cancelBooking(b)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel booking
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== Drafts Tab ===================== */

function DraftsTab({ treks, reload }: { treks: Trek[]; reload: () => void }) {
  const publish = async (id: string) => {
    const { error } = await supabase.from("upcoming_treks").update({ is_draft: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trip published to homepage");
    reload();
  };
  const moveToPast = async (id: string) => {
    if (!confirm("Move this draft to Past Trips?")) return;
    const { error } = await supabase.from("upcoming_treks").update({ is_archived: true, is_draft: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Moved to Past Trips");
    reload();
  };
  const deleteDraft = async (id: string) => {
    if (!confirm("Permanently delete this draft?")) return;
    const { error } = await supabase.from("upcoming_treks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Draft deleted");
    reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-bold text-lg text-primary">Drafts ({treks.length})</h2>
      <p className="text-sm text-muted-foreground">Drafts are hidden from the homepage and booking page. Publish them to make them visible, or move them back to Past Trips.</p>
      {treks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drafts. Restoring a past trip will land it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treks.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-background overflow-hidden flex">
              {t.image_url ? (
                <img src={t.image_url} alt={t.name} className="w-32 h-32 object-cover" />
              ) : (
                <div className="w-32 h-32 bg-muted grid place-items-center text-muted-foreground"><Mountain className="w-8 h-8" /></div>
              )}
              <div className="p-3 flex-1 min-w-0 flex flex-col gap-2">
                <div>
                  <div className="font-semibold text-foreground truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.trek_date).toLocaleDateString()}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">Draft</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button onClick={() => publish(t.id)} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-secondary">
                    Publish
                  </button>
                  <button onClick={() => moveToPast(t.id)} className="px-3 py-1.5 rounded-full border border-border text-xs hover:bg-muted">
                    Move to Past Trips
                  </button>
                  <button onClick={() => deleteDraft(t.id)} className="px-2 py-1.5 rounded-full text-destructive hover:bg-destructive/10" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

