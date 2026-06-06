import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mountain, Download, ArrowLeft, Plus, Trash2, Pencil, Archive, Users, FileText, Link as LinkIcon, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Trek = {
  id: string;
  name: string;
  destination: string | null;
  location: string | null;
  trek_date: string;
  trek_time: string | null;
  difficulty: "Easy" | "Moderate" | "Hard";
  duration: string | null;
  distance: string | null;
  image_url: string | null;
  description: string | null;
  price: number;
  max_seats: number;
  meeting_point: string | null;
  instructions: string | null;
  status_override: string | null;
  is_archived: boolean;
  is_draft: boolean;
  album_url: string | null;
  itinerary_url: string | null;
  itinerary_file_path: string | null;
};

type Stats = { trek_id: string; max_seats: number; seats_taken: number; seats_remaining: number };

type Booking = any;

const empty: Partial<Trek> = {
  name: "", destination: "", trek_date: "", trek_time: "", difficulty: "Easy",
  duration: "", distance: "", description: "", price: 0, max_seats: 30,
  meeting_point: "", instructions: "", location: "",
  album_url: "", itinerary_url: "", itinerary_file_path: "",
};

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
  if (t.trek_date > today) return "Upcoming";
  if (t.trek_date === today) return "Ongoing";
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) await loadAll();
    })();
  }, [user, loading, navigate]);

  const activeTreks = useMemo(() => treks.filter((t) => !t.is_archived && !t.is_draft), [treks]);
  const draftTreks = useMemo(() => treks.filter((t) => t.is_draft && !t.is_archived), [treks]);
  const archivedTreks = useMemo(() => treks.filter((t) => t.is_archived), [treks]);

  if (loading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center">Loading…</main>;
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4">
        <div className="max-w-md text-center bg-card rounded-2xl shadow-trail border border-primary/10 p-8">
          <Mountain className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="font-heading font-bold text-2xl text-primary mb-2">Admin access only</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You're signed in as <span className="font-medium">{user?.email}</span>, but this page is restricted to trek leads.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </main>
    );
  }

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
            <TabsList className="grid w-full grid-cols-4 max-w-xl">
              <TabsTrigger value="trips">Trips</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="past">Past Trips</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-6">
              <TripsTab treks={activeTreks} stats={stats} reload={loadAll} userId={user!.id} />
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <BookingsTab bookings={bookings} members={members} treks={treks} stats={stats} reload={loadAll} />
            </TabsContent>

            <TabsContent value="drafts" className="mt-6">
              <DraftsTab treks={draftTreks} reload={loadAll} />
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              <PastTripsTab treks={archivedTreks} reload={loadAll} />
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
                    {new Date(t.trek_date).toLocaleDateString()}{t.trek_time ? ` • ${t.trek_time}` : ""} • {t.difficulty}
                    {t.destination ? ` • ${t.destination}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    💰 ₹{Number(t.price).toLocaleString("en-IN")} • 🪑 {taken}/{max} seats
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
    if (!f.name?.trim() || !f.trek_date) return toast.error("Name and date are required");
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
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("trek-images").upload(path, imageFile);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("trek-images").getPublicUrl(path).data.publicUrl;
      }

      let itineraryPath = f.itinerary_file_path;
      if (itineraryFile) {
        const path = `${userId}/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage.from("itineraries").upload(path, itineraryFile, {
          contentType: "application/pdf", upsert: false,
        });
        if (upErr) throw upErr;
        if (f.itinerary_file_path) {
          await supabase.storage.from("itineraries").remove([f.itinerary_file_path]);
        }
        itineraryPath = path;
      }

      const payload: any = {
        name: f.name.trim(),
        destination: f.destination?.trim() || null,
        location: f.location?.trim() || null,
        trek_date: f.trek_date,
        trek_time: f.trek_time?.trim() || null,
        difficulty: f.difficulty,
        duration: f.duration?.trim() || null,
        distance: f.distance?.trim() || null,
        description: f.description?.trim() || null,
        price: Number(f.price) || 0,
        max_seats: Number(f.max_seats) || 1,
        meeting_point: f.meeting_point?.trim() || null,
        instructions: f.instructions?.trim() || null,
        status_override: f.status_override || null,
        image_url: imageUrl ?? null,
        album_url: f.album_url?.trim() || null,
        itinerary_url: f.itinerary_url?.trim() || null,
        itinerary_file_path: itineraryPath || null,
      };

      if (isEdit) {
        const { error } = await supabase.from("upcoming_treks").update(payload).eq("id", f.id);
        if (error) throw error;
        toast.success("Trip updated");
      } else {
        payload.created_by = userId;
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

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <FF label="Trip name *" full><input className={inp} value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} required /></FF>
      <FF label="Destination"><input className={inp} value={f.destination ?? ""} onChange={(e) => set({ destination: e.target.value })} placeholder="Bhongir, Telangana" /></FF>
      <FF label="Date *"><input type="date" className={inp} value={f.trek_date ?? ""} onChange={(e) => set({ trek_date: e.target.value })} required /></FF>
      <FF label="Time"><input className={inp} value={f.trek_time ?? ""} onChange={(e) => set({ trek_time: e.target.value })} placeholder="6:00 AM" /></FF>
      <FF label="Difficulty">
        <select className={inp} value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value as any })}>
          <option>Easy</option><option>Moderate</option><option>Hard</option>
        </select>
      </FF>
      <FF label="Price (₹) *"><input type="number" min={0} className={inp} value={f.price ?? 0} onChange={(e) => set({ price: Number(e.target.value) })} required /></FF>
      <FF label={`Max seats *${currentSeatsTaken > 0 ? ` (${currentSeatsTaken} booked)` : ""}`}>
        <input type="number" min={1} className={inp} value={f.max_seats ?? 30} onChange={(e) => set({ max_seats: Number(e.target.value) })} required />
      </FF>
      <FF label="Duration"><input className={inp} value={f.duration ?? ""} onChange={(e) => set({ duration: e.target.value })} placeholder="2 Days" /></FF>
      <FF label="Distance / from city"><input className={inp} value={f.distance ?? ""} onChange={(e) => set({ distance: e.target.value })} placeholder="120 km from Hyd" /></FF>
      <FF label="Status override">
        <select className={inp} value={f.status_override ?? ""} onChange={(e) => set({ status_override: e.target.value || null })}>
          <option value="">Auto (by date)</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
      </FF>
      <FF label="Location notes" full><input className={inp} value={f.location ?? ""} onChange={(e) => set({ location: e.target.value })} /></FF>
      <FF label="Meeting point" full><input className={inp} value={f.meeting_point ?? ""} onChange={(e) => set({ meeting_point: e.target.value })} placeholder="Hitech City Metro, 5:00 AM" /></FF>
      <FF label="Description" full><textarea rows={3} className={inp} value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></FF>
      <FF label="Special instructions" full><textarea rows={2} className={inp} value={f.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value })} placeholder="Carry 2L water, sturdy shoes..." /></FF>

      <FF label="Photo album link (Google Drive / any URL — shown on Past Trips)" full>
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

      <FF label="Cover image" full>
        <input
          type="file" accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:bg-gold"
        />
        {f.image_url && !imageFile && <img src={f.image_url} alt="" className="mt-2 w-24 h-24 rounded-lg object-cover" />}
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

/* ===================== Bookings Tab ===================== */

function BookingsTab({ bookings, members, treks, stats }: { bookings: Booking[]; members: any[]; treks: Trek[]; stats: Map<string, Stats> }) {
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

      {/* Per-trek seat summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {treks.filter((t) => !t.is_archived).map((t) => {
          const s = stats.get(t.id);
          const taken = s?.seats_taken ?? 0;
          const max = t.max_seats;
          const full = taken >= max;
          return (
            <div key={t.id} className="rounded-xl border border-border bg-background p-3">
              <div className="text-sm font-semibold text-primary truncate">{t.name}</div>
              <div className="text-xs text-muted-foreground">{new Date(t.trek_date).toLocaleDateString()}</div>
              <div className={`mt-1 text-sm font-bold ${full ? "text-destructive" : "text-foreground"}`}>{taken} / {max} seats {full && "• FULL"}</div>
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
            return (
              <div key={b.id} className="rounded-xl border border-border bg-background">
                <button
                  onClick={() => setExpanded(isOpen ? null : b.id)}
                  className="w-full p-4 text-left flex flex-wrap items-center gap-3 hover:bg-muted/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{b.primary_name}</div>
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

/* ===================== Past Trips Tab ===================== */

function PastTripsTab({ treks, reload }: { treks: Trek[]; reload: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-bold text-lg text-primary">Past trips ({treks.length})</h2>
      <p className="text-sm text-muted-foreground">Paste a Google Drive (or any) link to the photo album. Customers will see a "View Photo Album" button on the Past Trips page.</p>
      {treks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No archived trips yet. Use the archive button on a trip to move it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treks.map((t) => (
            <PastTripCard key={t.id} trek={t} reload={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function PastTripCard({ trek, reload }: { trek: Trek; reload: () => void }) {
  const [albumUrl, setAlbumUrl] = useState(trek.album_url ?? "");
  const [busy, setBusy] = useState(false);

  const unarchive = async () => {
    const { error } = await supabase.from("upcoming_treks").update({ is_archived: false }).eq("id", trek.id);
    if (error) return toast.error(error.message);
    toast.success("Restored to active treks");
    reload();
  };

  const saveAlbum = async () => {
    const v = albumUrl.trim();
    if (v) {
      try { new URL(v); } catch { return toast.error("Enter a valid URL"); }
    }
    setBusy(true);
    const { error } = await supabase.from("upcoming_treks").update({ album_url: v || null }).eq("id", trek.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Album link saved");
    reload();
  };

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden flex flex-col">
      <div className="flex">
        {trek.image_url ? (
          <img src={trek.image_url} alt={trek.name} className="w-32 h-32 object-cover" />
        ) : (
          <div className="w-32 h-32 bg-muted grid place-items-center text-muted-foreground"><Mountain className="w-8 h-8" /></div>
        )}
        <div className="p-3 flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate">{trek.name}</div>
          <div className="text-xs text-muted-foreground">{new Date(trek.trek_date).toLocaleDateString()}</div>
          {trek.album_url && (
            <a href={trek.album_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              <LinkIcon className="w-3 h-3" /> Open current album
            </a>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <label className="block text-xs font-semibold text-muted-foreground">Photo album link (Google Drive / any URL)</label>
        <input
          type="url"
          value={albumUrl}
          onChange={(e) => setAlbumUrl(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className={inp}
        />
        <div className="flex gap-2">
          <button onClick={saveAlbum} disabled={busy} className="flex-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-secondary disabled:opacity-60">
            {busy ? "Saving…" : "Save album link"}
          </button>
          <button onClick={unarchive} className="px-3 py-2 rounded-full border border-border text-xs hover:bg-muted">
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
