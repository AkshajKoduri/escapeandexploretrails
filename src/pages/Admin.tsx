import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { adminApi, adminRemove, adminUpload } from "@/lib/adminApi";
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
  itinerary_days: { title: string; description: string }[];
  event_type: "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride";
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
  album_url: "", itinerary_url: "", itinerary_file_path: "", itinerary_days: [], event_type: "Hike",
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
    try {
      const [{ data: trekData }, { data: statsData }, bRes, mRes] = await Promise.all([
        supabase.from("upcoming_treks").select("*").order("trek_date", { ascending: true }),
        supabase.rpc("get_trek_seat_stats"),
        adminApi<{ data: Booking[] }>("listBookings"),
        adminApi<{ data: any[] }>("listBookingMembers"),
      ]);
      if (trekData) setTreks(trekData as unknown as Trek[]);
      const sm = new Map<string, Stats>();
      (statsData ?? []).forEach((s: any) => sm.set(s.trek_id, s));
      setStats(sm);
      setBookings(bRes?.data ?? []);
      setMembers(mRes?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load admin data");
    }
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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 max-w-4xl">
              <TabsTrigger value="trips">Trips</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="callbacks">Callbacks</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="trail-log">Trail Log</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-6">
              <TripsTab treks={activeTreks} stats={stats} reload={loadAll} />
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <BookingsTab bookings={bookings} members={members} treks={treks} stats={stats} reload={loadAll} />
            </TabsContent>

            <TabsContent value="callbacks" className="mt-6">
              <CallbacksTab />
            </TabsContent>

            <TabsContent value="drafts" className="mt-6">
              <DraftsTab treks={draftTreks} reload={loadAll} />
            </TabsContent>

            <TabsContent value="gallery" className="mt-6">
              <GalleryTab />
            </TabsContent>

            <TabsContent value="trail-log" className="mt-6">
              <TrailLogTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

/* ===================== Trips Tab ===================== */

function TripsTab({ treks, stats, reload }: { treks: Trek[]; stats: Map<string, Stats>; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Trek | null>(null);

  const startCreate = () => { setEditing(null); setOpen(true); };
  const startEdit = (t: Trek) => { setEditing(t); setOpen(true); };

  const archiveTrek = async (id: string) => {
    if (!confirm("Move this trek to Past Trips?")) return;
    try {
      await adminApi("updateTrek", { id, patch: { is_archived: true } });
      toast.success("Moved to Past Trips");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteTrek = async (id: string) => {
    if (!confirm("Permanently delete this trek?")) return;
    try {
      await adminApi("deleteTrek", { id });
      toast.success("Trek deleted");
      reload();
    } catch (err: any) {
      toast.error(err.message);
    }
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
            
            currentSeatsTaken={editing ? stats.get(editing.id)?.seats_taken ?? 0 : 0}
            onDone={() => { setOpen(false); reload(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripForm({ initial, isEdit, currentSeatsTaken, onDone }: { initial: Trek; isEdit: boolean; currentSeatsTaken: number; onDone: () => void }) {
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
        itinerary_days: (f.itinerary_days ?? [])
          .map((d) => ({ title: (d.title ?? "").trim(), description: (d.description ?? "").trim() }))
          .filter((d) => d.title || d.description),
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
        await adminApi("updateTrek", { id: f.id, patch: payload });
        toast.success("Trip updated");
      } else {
        await adminApi("insertTrek", { row: payload });
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
      "Payment Status": (b.payment_status ?? "pending") === "paid" ? "Paid" : "Pending",
      "Booking Source": b.booking_source === "manual" ? "Manual" : "Online",
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
        Status: b.status,
        "Payment Status": "",
        "Booking Source": "",
        Role: `   Member ${i + 1} (under ${b.primary_name})`,
        "Full Name": `    ↳ ${m.full_name}`,
        Age: "", Gender: "", Phone: "", Email: "",
        "Aadhaar Number": m.aadhaar_number, "Aadhaar Photo Path": m.aadhaar_photo,
        "Group Booking": "Yes", "Seats Booked": "",
      });
    });
    if (idx < bookingsList.length - 1) {
      rows.push({ "Booking ID": "", Trek: "", "Booking Date": "", Status: "", "Payment Status": "", "Booking Source": "", Role: "", "Full Name": "", Age: "", Gender: "", Phone: "", Email: "", "Aadhaar Number": "", "Aadhaar Photo Path": "", "Group Booking": "", "Seats Booked": "" });
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
  ws["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 32 }, { wch: 28 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Trekkers");
  const slug = trek.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "trek";
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `e2trails-${slug}-${ts}.xlsx`);
  toast.success("Excel file downloaded");
}

function BookingsTab({ bookings, members, treks, stats, reload }: { bookings: Booking[]; members: any[]; treks: Trek[]; stats: Map<string, Stats>; reload: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "paid">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "online" | "manual">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const membersByBooking = useMemo(() => {
    const m = new Map<string, any[]>();
    members.forEach((x) => {
      const a = m.get(x.booking_id) ?? [];
      a.push(x); m.set(x.booking_id, a);
    });
    return m;
  }, [members]);

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.trek_id !== filter && b.trek_name !== filter) return false;
    if (paymentFilter !== "all" && (b.payment_status ?? "pending") !== paymentFilter) return false;
    if (sourceFilter !== "all" && (b.booking_source ?? "online") !== sourceFilter) return false;
    return true;
  });

  const cancelBooking = async (b: Booking) => {
    if (!confirm(`Cancel booking for ${b.primary_name}? Their ${b.seats_booked ?? 1} seat(s) will be freed.`)) return;
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="font-heading font-bold text-lg text-primary flex items-center gap-2">
          <Users className="w-5 h-5" /> Bookings ({filtered.length})
        </h2>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-secondary transition"
        >
          <Plus className="w-4 h-4" /> Add Manual Booking
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inp}>
          <option value="all">All treks</option>
          {treks.filter((t) => !t.is_archived).map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} className={inp}>
          <option value="all">Payment: All</option>
          <option value="pending">Payment: Pending</option>
          <option value="paid">Payment: Paid</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as any)} className={inp}>
          <option value="all">Source: All</option>
          <option value="online">Source: Online</option>
          <option value="manual">Source: Manual</option>
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
        <p className="text-sm text-muted-foreground">No bookings match the current filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => {
            const ms = membersByBooking.get(b.id) ?? [];
            const isOpen = expanded === b.id;
            const isCancelled = b.status === "cancelled";
            const pay = (b.payment_status ?? "pending") as "pending" | "paid";
            const source = (b.booking_source ?? "online") as "online" | "manual";
            return (
              <div key={b.id} className={`rounded-xl border border-border bg-background ${isCancelled ? "opacity-70" : ""}`}>
                <div className="w-full p-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    className="flex-1 min-w-0 text-left hover:opacity-80 transition"
                  >
                    <div className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      <span className={isCancelled ? "line-through" : ""}>{b.primary_name}</span>
                      {isCancelled && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-destructive/15 text-destructive font-bold">CANCELLED</span>
                      )}
                      {source === "manual" && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold">MANUAL</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {b.trek_name} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </button>
                  <div className="text-xs text-muted-foreground">{b.primary_phone}</div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-semibold">
                    {b.seats_booked ?? 1} seat{(b.seats_booked ?? 1) > 1 ? "s" : ""}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      pay === "paid"
                        ? "bg-green-500/15 text-green-700 dark:text-green-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {pay === "paid" ? "Paid" : "Pending"}
                  </span>
                  <select
                    value={pay}
                    onChange={(e) => setPaymentStatus(b, e.target.value as "pending" | "paid")}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                {isOpen && (
                  <div className="border-t border-border p-4 text-sm space-y-2 bg-muted/20">
                    <div><strong>Email:</strong> {b.primary_email ?? "—"}</div>
                    <div><strong>Age / Gender:</strong> {b.primary_age ?? "—"} / {b.primary_gender ?? "—"}</div>
                    <div><strong>Aadhaar:</strong> {b.primary_aadhaar ?? "—"}</div>
                    <div><strong>Source:</strong> {source}</div>
                    {b.notes && <div><strong>Notes:</strong> {b.notes}</div>}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Manual Booking</DialogTitle>
          </DialogHeader>
          <ManualBookingForm
            treks={treks.filter((t) => !t.is_archived && !t.is_draft)}
            onDone={() => { setAddOpen(false); reload(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
        <label className="text-xs font-semibold text-muted-foreground">Select Trip *</label>
        <select value={trekId} onChange={(e) => setTrekId(e.target.value)} className={inp} required>
          {treks.length === 0 && <option value="">No active trips</option>}
          {treks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inp} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} required />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Age</label>
          <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inp}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Number of people</label>
          <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className={inp} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">Payment Status</label>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} className={inp}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inp} rows={3} placeholder="e.g. Paid via UPI to trek lead" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add Booking"}
        </button>
      </div>
    </form>
  );
}

/* ===================== Drafts Tab ===================== */

function DraftsTab({ treks, reload }: { treks: Trek[]; reload: () => void }) {
  const publish = async (id: string) => {
    try {
      await adminApi("updateTrek", { id, patch: { is_draft: false } });
      toast.success("Trip published to homepage");
      reload();
    } catch (err: any) { toast.error(err.message); }
  };
  const moveToPast = async (id: string) => {
    if (!confirm("Move this draft to Past Trips?")) return;
    try {
      await adminApi("updateTrek", { id, patch: { is_archived: true, is_draft: false } });
      toast.success("Moved to Past Trips");
      reload();
    } catch (err: any) { toast.error(err.message); }
  };
  const deleteDraft = async (id: string) => {
    if (!confirm("Permanently delete this draft?")) return;
    try {
      await adminApi("deleteTrek", { id });
      toast.success("Draft deleted");
      reload();
    } catch (err: any) { toast.error(err.message); }
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

/* ===================== Callbacks Tab ===================== */

type CallbackRequest = {
  id: string;
  trip_id: string | null;
  trip_name: string | null;
  full_name: string;
  email: string | null;
  mobile_number: string;
  preferred_time: string | null;
  status: string;
  created_at: string;
};

function CallbacksTab() {
  const [rows, setRows] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi<{ data: CallbackRequest[] }>("listCallbackRequests");
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markContacted = async (id: string) => {
    try {
      await adminApi("updateCallback", { id, patch: { status: "contacted" } });
      toast.success("Marked as contacted");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this callback request?")) return;
    try {
      await adminApi("deleteCallback", { id });
      toast.success("Deleted");
      load();
    } catch (err: any) { toast.error(err.message); }
  };



  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-foreground">No callback requests yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="p-2">When</th>
            <th className="p-2">Trip</th>
            <th className="p-2">Name</th>
            <th className="p-2">Mobile</th>
            <th className="p-2">Email</th>
            <th className="p-2">Preferred Time</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/50 align-top">
              <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.trip_name ?? "—"}</td>
              <td className="p-2">{r.full_name}</td>
              <td className="p-2 whitespace-nowrap">
                <a href={`tel:${r.mobile_number}`} className="text-primary hover:underline">{r.mobile_number}</a>
              </td>
              <td className="p-2">{r.email ?? "—"}</td>
              <td className="p-2">{r.preferred_time ?? "—"}</td>
              <td className="p-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "contacted" ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                  {r.status}
                </span>
              </td>
              <td className="p-2">
                <div className="flex gap-2">
                  {r.status !== "contacted" && (
                    <button onClick={() => markContacted(r.id)} className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90">
                      Mark contacted
                    </button>
                  )}
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===================== Gallery Tab ===================== */

type GalleryImage = {
  id: string;
  image_url: string;
  storage_path: string | null;
  category: "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride" | "General";
  display_order: number;
  alt_text: string | null;
};

const GALLERY_CATEGORIES: GalleryImage["category"][] = ["Hike", "Cycling Ride", "Bike Ride", "Outstation Trek", "General"];

function GalleryTab() {
  const [items, setItems] = useState<GalleryImage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await adminApi<{ data: GalleryImage[] }>("listGalleryImages");
      const rows = res?.data ?? [];
      setItems(rows);
      // Sign URLs for private bucket display
      const paths = rows.map((r) => r.storage_path).filter(Boolean) as string[];
      if (paths.length) {
        const { data } = await supabase.storage.from("gallery-images").createSignedUrls(paths, 60 * 60);
        const map: Record<string, string> = {};
        (data ?? []).forEach((s: any) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
        setUrls(map);
      } else {
        setUrls({});
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load gallery");
    }
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gallery/${crypto.randomUUID()}.${ext}`;
      await adminUpload("gallery-images", path, file);
      const nextOrder = items.length ? Math.max(...items.map((i) => i.display_order)) + 1 : 1;
      await adminApi("insertGalleryImage", {
        row: { image_url: "", storage_path: path, category: "General", display_order: nextOrder, alt_text: file.name },
      });
      toast.success("Image uploaded");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (img: GalleryImage) => {
    if (!confirm("Delete this gallery image?")) return;
    try {
      if (img.storage_path) {
        try { await adminRemove("gallery-images", img.storage_path); } catch { /* ignore */ }
      }
      await adminApi("deleteGalleryImage", { id: img.id });
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  };

  const onCategory = async (img: GalleryImage, category: GalleryImage["category"]) => {
    try {
      await adminApi("updateGalleryImage", { id: img.id, patch: { category } });
      setItems((prev) => prev.map((p) => (p.id === img.id ? { ...p, category } : p)));
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    }
  };

  const swap = async (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= items.length || j >= items.length) return;
    const a = items[i], b = items[j];
    try {
      await adminApi("reorderGalleryImages", {
        updates: [{ id: a.id, display_order: b.display_order }, { id: b.id, display_order: a.display_order }],
      });
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Reorder failed");
    }
  };

  const sorted = [...items].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading font-bold text-lg text-primary">Gallery images ({items.length})</h2>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-secondary transition cursor-pointer">
          <Plus className="w-4 h-4" /> {busy ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No gallery images yet. Upload one to get started.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((img, idx) => (
            <div key={img.id} className="rounded-xl border border-border bg-background overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted">
                {urls[img.storage_path ?? ""] ? (
                  <img src={urls[img.storage_path ?? ""]} alt={img.alt_text ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">Loading…</div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => swap(idx, idx - 1)}
                    disabled={idx === 0}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move up"
                  >↑</button>
                  <button
                    onClick={() => swap(idx, idx + 1)}
                    disabled={idx === sorted.length - 1}
                    className="px-2 py-1 rounded text-xs border border-border hover:bg-muted disabled:opacity-40"
                    title="Move down"
                  >↓</button>
                  <span className="text-xs text-muted-foreground ml-1">#{img.display_order}</span>
                  <button
                    onClick={() => onDelete(img)}
                    className="ml-auto p-1.5 rounded text-destructive hover:bg-destructive/10"
                    title="Delete"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <select
                  className={inp}
                  value={img.category}
                  onChange={(e) => onCategory(img, e.target.value as GalleryImage["category"])}
                >
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Trail Log Tab ===================== */

type TrailLogRow = {
  id: string;
  title: string;
  category: "Trail Guide" | "Trek Journal" | "Tips & Advice" | "Event Recap";
  description: string;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  instagram_url: string | null;
  created_at: string;
};

const TRAIL_LOG_CATEGORIES: TrailLogRow["category"][] = [
  "Trail Guide",
  "Trek Journal",
  "Tips & Advice",
  "Event Recap",
];

function TrailLogTab() {
  const [items, setItems] = useState<TrailLogRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TrailLogRow["category"]>("Trail Guide");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState<"pdf" | "instagram">("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");

  const load = async () => {
    try {
      const res = await adminApi<{ data: TrailLogRow[] }>("listTrailLog");
      setItems(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load trail log");
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setTitle(""); setCategory("Trail Guide"); setDescription("");
    setSourceType("pdf"); setPdfFile(null); setInstagramUrl("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return toast.error("Title and description are required");
    }
    if (sourceType === "pdf" && !pdfFile) return toast.error("Please choose a PDF file");
    if (sourceType === "instagram" && !instagramUrl.trim()) return toast.error("Please paste an Instagram URL");

    setBusy(true);
    try {
      let pdf_storage_path: string | null = null;
      if (sourceType === "pdf" && pdfFile) {
        if (pdfFile.type !== "application/pdf") throw new Error("File must be a PDF");
        const path = `posts/${crypto.randomUUID()}.pdf`;
        await adminUpload("trail-log-pdfs", path, pdfFile);
        pdf_storage_path = path;
      }
      await adminApi("insertTrailLog", {
        row: {
          title: title.trim(),
          category,
          description: description.trim(),
          pdf_storage_path,
          instagram_url: sourceType === "instagram" ? instagramUrl.trim() : null,
        },
      });
      toast.success("Post added");
      reset();
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add post");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (row: TrailLogRow) => {
    if (!confirm(`Delete "${row.title}"?`)) return;
    try {
      await adminApi("deleteTrailLog", { id: row.id });
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="rounded-2xl border border-primary/10 bg-background p-5 md:p-6 space-y-4">
        <h2 className="font-heading font-bold text-lg text-primary">Add a new Trail Log post</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Title</span>
            <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Category</span>
            <select className={inp} value={category} onChange={(e) => setCategory(e.target.value as TrailLogRow["category"])}>
              {TRAIL_LOG_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Short description</span>
          <textarea className={inp} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>

        <div className="flex gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={sourceType === "pdf"} onChange={() => setSourceType("pdf")} />
            Upload PDF
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={sourceType === "instagram"} onChange={() => setSourceType("instagram")} />
            Instagram URL
          </label>
        </div>

        {sourceType === "pdf" ? (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">PDF file</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              className="block mt-1 text-sm"
            />
            {pdfFile && <span className="text-xs text-muted-foreground mt-1 block">{pdfFile.name}</span>}
          </label>
        ) : (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Instagram post URL</span>
            <input
              className={inp}
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-secondary transition disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {busy ? "Saving…" : "Add post"}
        </button>
      </form>

      <div>
        <h2 className="font-heading font-bold text-lg text-primary mb-3">All posts ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((row) => (
              <div key={row.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold">{row.category}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {row.pdf_storage_path ? "PDF" : row.instagram_url ? "Instagram" : "—"}
                    </span>
                  </div>
                  <div className="font-heading font-semibold text-sm text-primary mt-1 truncate">{row.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{row.description}</div>
                </div>
                <button
                  onClick={() => onDelete(row)}
                  className="p-2 rounded text-destructive hover:bg-destructive/10 shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

