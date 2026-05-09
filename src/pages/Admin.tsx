import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mountain, Download, ArrowLeft, Plus, Trash2, Pencil, Archive, Users, Image as ImageIcon, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
};

type Stats = { trek_id: string; max_seats: number; seats_taken: number; seats_remaining: number };

type Booking = any;

const empty: Partial<Trek> = {
  name: "", destination: "", trek_date: "", trek_time: "", difficulty: "Easy",
  duration: "", distance: "", description: "", price: 0, max_seats: 30,
  meeting_point: "", instructions: "", location: "",
};

function deriveStatus(t: Trek): "Upcoming" | "Ongoing" | "Completed" | "Archived" {
  if (t.is_archived) return "Archived";
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

  const activeTreks = useMemo(() => treks.filter((t) => !t.is_archived), [treks]);
  const archivedTreks = useMemo(() => treks.filter((t) => t.is_archived), [treks]);

  const downloadExcel = async () => {
    try {
      const membersByBooking = new Map<string, any[]>();
      members.forEach((m) => {
        const arr = membersByBooking.get(m.booking_id) ?? [];
        arr.push(m);
        membersByBooking.set(m.booking_id, arr);
      });

      const allPeople: any[] = [];
      bookings.forEach((b) => {
        allPeople.push({
          "Booking ID": b.id, Trek: b.trek_name,
          "Booking Date": new Date(b.created_at).toLocaleString(),
          Status: b.status, Role: "Primary",
          "Full Name": b.primary_name, Age: b.primary_age, Gender: b.primary_gender,
          Phone: b.primary_phone, Email: b.primary_email ?? "",
          "Aadhaar Number": b.primary_aadhaar, "Aadhaar Photo Path": b.primary_aadhaar_photo,
          "Group Booking": b.is_group ? "Yes" : "No", "Seats Booked": b.seats_booked ?? 1,
        });
        (membersByBooking.get(b.id) ?? []).forEach((m) => {
          allPeople.push({
            "Booking ID": b.id, Trek: b.trek_name,
            "Booking Date": new Date(b.created_at).toLocaleString(),
            Status: b.status, Role: "Group Member",
            "Full Name": m.full_name, Age: "", Gender: "", Phone: "", Email: "",
            "Aadhaar Number": m.aadhaar_number, "Aadhaar Photo Path": m.aadhaar_photo,
            "Group Booking": "Yes", "Seats Booked": "",
          });
        });
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allPeople), "All Trekkers");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `e2trails-bookings-${ts}.xlsx`);
      toast.success("Excel file downloaded");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to download");
    }
  };

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
          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-orange text-accent-foreground font-semibold text-sm shadow-glow hover:scale-105 transition"
          >
            <Download className="w-4 h-4" /> Download bookings (.xlsx)
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-trail border border-primary/10 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Mountain className="w-7 h-7 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-primary">Trek Lead Dashboard</h1>
          </div>

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="trips">Trips</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="past">Past Trips</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="mt-6">
              <TripsTab treks={activeTreks} stats={stats} reload={loadAll} userId={user!.id} />
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <BookingsTab bookings={bookings} members={members} treks={treks} stats={stats} />
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
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Trek>) => setF((p) => ({ ...p, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name?.trim() || !f.trek_date) return toast.error("Name and date are required");
    if (f.max_seats < currentSeatsTaken) {
      return toast.error(`Can't set max seats below current bookings (${currentSeatsTaken})`);
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
  const [albumOf, setAlbumOf] = useState<Trek | null>(null);

  const unarchive = async (id: string) => {
    const { error } = await supabase.from("upcoming_treks").update({ is_archived: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Restored to active treks");
    reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-bold text-lg text-primary">Past trips ({treks.length})</h2>
      <p className="text-sm text-muted-foreground">Archived treks live here. Customers can browse the photo albums on the Past Trips page.</p>
      {treks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No archived trips yet. Use the archive button on a trip to move it here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treks.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-background overflow-hidden">
              {t.image_url ? (
                <img src={t.image_url} alt={t.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted grid place-items-center text-muted-foreground"><Mountain className="w-8 h-8" /></div>
              )}
              <div className="p-4 space-y-2">
                <div className="font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.trek_date).toLocaleDateString()}</div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setAlbumOf(t)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-secondary">
                    <ImageIcon className="w-3 h-3" /> Manage album
                  </button>
                  <button onClick={() => unarchive(t.id)} className="px-3 py-2 rounded-full border border-border text-xs hover:bg-muted">
                    Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {albumOf && (
        <Dialog open={!!albumOf} onOpenChange={(o) => !o && setAlbumOf(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Album — {albumOf.name}</DialogTitle>
            </DialogHeader>
            <AlbumManager trek={albumOf} />
            <p className="text-xs text-muted-foreground mt-3">⭐ Customer ratings — coming soon.</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AlbumManager({ trek }: { trek: Trek }) {
  const [images, setImages] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("trip_album_images").select("*").eq("trek_id", trek.id).order("created_at");
    setImages(data ?? []);
  };
  useEffect(() => { load(); }, [trek.id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (const f of files) {
        const ext = f.name.split(".").pop();
        const path = `albums/${trek.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("trek-images").upload(path, f);
        if (upErr) throw upErr;
        const url = supabase.storage.from("trek-images").getPublicUrl(path).data.publicUrl;
        const { error: insErr } = await supabase.from("trip_album_images").insert({ trek_id: trek.id, image_url: url });
        if (insErr) throw insErr;
      }
      toast.success(`${files.length} image(s) added`);
      await load();
      e.target.value = "";
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this image?")) return;
    const { error } = await supabase.from("trip_album_images").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="space-y-3">
      <input type="file" accept="image/*" multiple onChange={onUpload} disabled={busy}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:bg-gold" />
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images in this album yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img src={img.image_url} alt="" className="w-full h-32 object-cover rounded-lg" />
              <button onClick={() => remove(img.id)} className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
