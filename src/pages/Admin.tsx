import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mountain, Download, ArrowLeft, Plus, Trash2 } from "lucide-react";

type Trek = {
  id: string;
  name: string;
  location: string | null;
  trek_date: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  duration: string | null;
  distance: string | null;
  image_url: string | null;
  description: string | null;
};

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ bookings: 0, people: 0 });
  const [busy, setBusy] = useState(false);
  const [treks, setTreks] = useState<Trek[]>([]);

  // form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [trekDate, setTrekDate] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Moderate" | "Hard">("Easy");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Admin — E2 Trails";
  }, []);

  const loadTreks = async () => {
    const { data } = await supabase
      .from("upcoming_treks")
      .select("*")
      .order("trek_date", { ascending: true });
    if (data) setTreks(data as Trek[]);
  };

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
      if (admin) {
        const [{ count: bCount }, { count: mCount }] = await Promise.all([
          supabase.from("bookings").select("*", { count: "exact", head: true }),
          supabase.from("booking_members").select("*", { count: "exact", head: true }),
        ]);
        setStats({ bookings: bCount ?? 0, people: (bCount ?? 0) + (mCount ?? 0) });
        await loadTreks();
      }
    })();
  }, [user, loading, navigate]);

  const downloadExcel = async () => {
    setBusy(true);
    try {
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (bErr) throw bErr;
      const { data: members, error: mErr } = await supabase.from("booking_members").select("*");
      if (mErr) throw mErr;

      const membersByBooking = new Map<string, typeof members>();
      (members ?? []).forEach((m) => {
        const arr = membersByBooking.get(m.booking_id) ?? [];
        arr.push(m);
        membersByBooking.set(m.booking_id, arr);
      });

      const allPeople: any[] = [];
      (bookings ?? []).forEach((b) => {
        allPeople.push({
          "Booking ID": b.id,
          Trek: b.trek_name,
          "Booking Date": new Date(b.created_at).toLocaleString(),
          Status: b.status,
          Role: "Primary",
          "Full Name": b.primary_name,
          Age: b.primary_age,
          Gender: b.primary_gender,
          Phone: b.primary_phone,
          Email: b.primary_email ?? "",
          "Aadhaar Number": b.primary_aadhaar,
          "Aadhaar Photo Path": b.primary_aadhaar_photo,
          "Group Booking": b.is_group ? "Yes" : "No",
        });
        (membersByBooking.get(b.id) ?? []).forEach((m) => {
          allPeople.push({
            "Booking ID": b.id,
            Trek: b.trek_name,
            "Booking Date": new Date(b.created_at).toLocaleString(),
            Status: b.status,
            Role: "Group Member",
            "Full Name": m.full_name,
            Age: "",
            Gender: "",
            Phone: "",
            Email: "",
            "Aadhaar Number": m.aadhaar_number,
            "Aadhaar Photo Path": m.aadhaar_photo,
            "Group Booking": "Yes",
          });
        });
      });

      const bookingsSheet = (bookings ?? []).map((b) => ({
        "Booking ID": b.id,
        Trek: b.trek_name,
        Date: new Date(b.created_at).toLocaleString(),
        Status: b.status,
        "Primary Name": b.primary_name,
        "Primary Phone": b.primary_phone,
        "Primary Email": b.primary_email ?? "",
        "Group Booking": b.is_group ? "Yes" : "No",
        "Total People": 1 + (membersByBooking.get(b.id)?.length ?? 0),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allPeople), "All Trekkers");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookingsSheet), "Bookings Summary");
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `e2trails-bookings-${ts}.xlsx`);
      toast.success("Excel file downloaded");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to download");
    } finally {
      setBusy(false);
    }
  };

  const createTrek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !trekDate) {
      toast.error("Name and date are required");
      return;
    }
    setCreating(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("trek-images").upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("trek-images").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("upcoming_treks").insert({
        name: name.trim(),
        location: location.trim() || null,
        trek_date: trekDate,
        difficulty,
        duration: duration.trim() || null,
        distance: distance.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl,
        created_by: user!.id,
      });
      if (error) throw error;

      toast.success("Trek added — visible on the homepage");
      setName(""); setLocation(""); setTrekDate(""); setDifficulty("Easy");
      setDuration(""); setDistance(""); setDescription(""); setImageFile(null);
      await loadTreks();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add trek");
    } finally {
      setCreating(false);
    }
  };

  const deleteTrek = async (id: string) => {
    if (!confirm("Delete this trek?")) return;
    const { error } = await supabase.from("upcoming_treks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Trek removed");
    await loadTreks();
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
            Ask an admin to grant your account the <code className="px-1 rounded bg-muted">admin</code> role, then refresh.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </main>
    );
  }

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <main className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-primary/10 px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Bookings export */}
        <section className="bg-card rounded-2xl shadow-trail border border-primary/10 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-2">
            <Mountain className="w-7 h-7 text-primary" />
            <h1 className="font-heading font-bold text-2xl text-primary">Trek Lead Dashboard</h1>
          </div>
          <p className="text-muted-foreground mb-6">Download every registered trekker's details for upcoming treks.</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-primary/10 bg-background p-5">
              <div className="text-3xl font-bold text-primary">{stats.bookings}</div>
              <div className="text-sm text-muted-foreground">Total bookings</div>
            </div>
            <div className="rounded-xl border border-primary/10 bg-background p-5">
              <div className="text-3xl font-bold text-primary">{stats.people}</div>
              <div className="text-sm text-muted-foreground">Total trekkers</div>
            </div>
          </div>
          <button
            onClick={downloadExcel}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold shadow-glow hover:scale-[1.01] transition disabled:opacity-60"
          >
            <Download className="w-5 h-5" />
            {busy ? "Preparing…" : "Download all bookings (.xlsx)"}
          </button>
        </section>

        {/* Add upcoming trek */}
        <section className="bg-card rounded-2xl shadow-trail border border-primary/10 p-8 md:p-10">
          <h2 className="font-heading font-bold text-xl text-primary flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5" /> Add upcoming trek
          </h2>
          <form onSubmit={createTrek} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Trek name *</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Date *</label>
              <input type="date" className={inputCls} value={trekDate} onChange={(e) => setTrekDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Difficulty</label>
              <select className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Duration (e.g. 2 Days)</label>
              <input className={inputCls} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Distance / from city</label>
              <input className={inputCls} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="120 km from Hyd" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Location</label>
              <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Description</label>
              <textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Cover image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-accent file:text-accent-foreground file:font-semibold hover:file:bg-gold"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="w-full px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-secondary transition disabled:opacity-60"
              >
                {creating ? "Adding…" : "Add trek to homepage"}
              </button>
            </div>
          </form>
        </section>

        {/* Existing treks */}
        <section className="bg-card rounded-2xl shadow-trail border border-primary/10 p-8 md:p-10">
          <h2 className="font-heading font-bold text-xl text-primary mb-6">Upcoming treks ({treks.length})</h2>
          {treks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treks added yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {treks.map((t) => (
                <li key={t.id} className="py-4 flex items-center gap-4">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                      <Mountain className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.trek_date).toLocaleDateString()} • {t.difficulty}
                      {t.duration ? ` • ${t.duration}` : ""}
                      {t.distance ? ` • ${t.distance}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTrek(t.id)}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition"
                    aria-label="Delete trek"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
