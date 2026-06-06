import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Plus, Trash2, Upload, ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const aadhaarRegex = /^\d{12}$/;

type Member = { name: string; aadhaar: string; file: File | null };
type TrekOpt = {
  id: string;
  name: string;
  trek_date: string;
  trek_time: string | null;
  meeting_point: string | null;
  instructions: string | null;
  price: number;
  destination: string | null;
  seats_remaining: number;
  max_seats: number;
  itinerary_url: string | null;
  itinerary_file_path: string | null;
};

const primarySchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  age: z.coerce.number().int().min(10).max(99),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  phone: z.string().trim().regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  aadhaar: z.string().regex(aadhaarRegex, "Aadhaar must be 12 digits"),
  trekId: z.string().min(1, "Choose a trek"),
});

export default function BookingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [trekOptions, setTrekOptions] = useState<TrekOpt[]>([]);
  const [trekId, setTrekId] = useState<string>(params.get("trek") ?? "");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const selectedTrek = useMemo(() => trekOptions.find((t) => t.id === trekId), [trekOptions, trekId]);
  const seatsNeeded = 1 + (isGroup ? members.length : 0);

  useEffect(() => {
    document.title = "Book a Trek — E2 Trails";
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const loadTreks = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: tdata }, { data: stats }] = await Promise.all([
      supabase
        .from("upcoming_treks")
        .select("*")
        .eq("is_archived", false)
        .eq("is_draft", false)
        .gte("trek_date", today)
        .order("trek_date", { ascending: true }),
      supabase.rpc("get_trek_seat_stats"),
    ]);
    const sm = new Map<string, any>();
    (stats ?? []).forEach((s: any) => sm.set(s.trek_id, s));
    setTrekOptions(
      (tdata ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        trek_date: t.trek_date,
        trek_time: t.trek_time,
        meeting_point: t.meeting_point,
        instructions: t.instructions,
        price: Number(t.price ?? 0),
        destination: t.destination,
        seats_remaining: sm.get(t.id)?.seats_remaining ?? t.max_seats ?? 0,
        max_seats: sm.get(t.id)?.max_seats ?? t.max_seats ?? 0,
        itinerary_url: t.itinerary_url ?? null,
        itinerary_file_path: t.itinerary_file_path ?? null,
      })),
    );
  };

  useEffect(() => {
    loadTreks();
    const ch = supabase
      .channel("booking-treks")
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_treks" }, loadTreks)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadTreks)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setName((p) => p || data.full_name || "");
        setPhone((p) => p || data.phone || "");
        setAge((p) => p || (data.age ? String(data.age) : ""));
        setGender((p) => p || data.gender || "");
        setAadhaar((p) => p || data.aadhaar_number || "");
      }
    })();
  }, [user]);

  const addMember = () => setMembers((m) => [...m, { name: "", aadhaar: "", file: null }]);
  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));
  const updateMember = (i: number, patch: Partial<Member>) =>
    setMembers((m) => m.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const uploadAadhaar = async (file: File, label: string) => {
    if (!user) throw new Error("Not signed in");
    if (file.size > 5 * 1024 * 1024) throw new Error(`${label} photo must be under 5MB`);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("aadhaar-photos").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = primarySchema.safeParse({ name, age, gender, phone, email, aadhaar, trekId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!aadhaarFile) return toast.error("Please upload your Aadhaar photo");
    if (!selectedTrek) return toast.error("Selected trek is no longer available");

    if (isGroup) {
      for (const [i, m] of members.entries()) {
        if (!m.name.trim() || !aadhaarRegex.test(m.aadhaar) || !m.file) {
          toast.error(`Member ${i + 1}: name, valid 12-digit Aadhaar and photo are required`);
          return;
        }
      }
    }

    // Re-check seat availability live
    const { data: stats } = await supabase.rpc("get_trek_seat_stats");
    const live = (stats ?? []).find((s: any) => s.trek_id === trekId);
    const remaining = live?.seats_remaining ?? selectedTrek.seats_remaining;
    if (remaining < seatsNeeded) {
      toast.error(`Only ${remaining} seat(s) left for this trek`);
      await loadTreks();
      return;
    }

    setSubmitting(true);
    try {
      const primaryPhotoPath = await uploadAadhaar(aadhaarFile, "Your Aadhaar");

      const memberPaths: string[] = [];
      for (const [i, m] of members.entries()) {
        if (!m.file) continue;
        memberPaths.push(await uploadAadhaar(m.file, `Member ${i + 1} Aadhaar`));
      }

      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          trek_id: trekId,
          trek_name: selectedTrek.name,
          primary_name: parsed.data.name,
          primary_age: parsed.data.age,
          primary_gender: parsed.data.gender,
          primary_phone: parsed.data.phone,
          primary_email: parsed.data.email || null,
          primary_aadhaar: parsed.data.aadhaar,
          primary_aadhaar_photo: primaryPhotoPath,
          is_group: isGroup && members.length > 0,
          seats_booked: seatsNeeded,
          status: "confirmed",
        })
        .select()
        .single();
      if (bErr) throw bErr;

      if (isGroup && members.length > 0) {
        const rows = members.map((m, i) => ({
          booking_id: booking.id,
          full_name: m.name.trim(),
          aadhaar_number: m.aadhaar,
          aadhaar_photo: memberPaths[i],
        }));
        const { error: mErr } = await supabase.from("booking_members").insert(rows);
        if (mErr) throw mErr;
      }

      await supabase.from("profiles").update({
        full_name: parsed.data.name,
        phone: parsed.data.phone,
        age: parsed.data.age,
        gender: parsed.data.gender,
        aadhaar_number: parsed.data.aadhaar,
        aadhaar_photo_path: primaryPhotoPath,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);

      setDone(true);
      toast.success("Booking confirmed!");
    } catch (err: any) {
      toast.error(err.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-secondary/5">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
            <span className="font-heading font-extrabold text-lg text-primary">E2 TRAILS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <button onClick={signOut} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 ml-3">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="container py-12 md:py-16 max-w-3xl">
        <div className="text-center mb-10">
          <span className="font-script text-accent text-xl">— Reserve your spot</span>
          <h1 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">Book Your Adventure</h1>
          <p className="mt-3 text-muted-foreground">Logged in as <span className="font-semibold text-primary">{user.email}</span></p>
        </div>

        {done ? (
          <div className="bg-card rounded-2xl shadow-trail p-10 text-center border border-primary/10">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-orange flex items-center justify-center mb-6 shadow-glow">
              <CheckCircle2 className="w-10 h-10 text-accent-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="font-heading font-bold text-2xl text-primary">You're on the trail! 🥾</h2>
            <p className="mt-4 text-muted-foreground">
              Your booking for <span className="font-semibold text-accent">{selectedTrek?.name}</span> is confirmed.
              Our team will reach you on <span className="font-semibold">{phone}</span>.
            </p>
            <button
              onClick={() => { setDone(false); setMembers([]); setIsGroup(false); }}
              className="mt-8 px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-secondary transition"
            >
              Add a Person
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-card rounded-2xl shadow-trail p-6 md:p-10 border border-primary/10 space-y-6">
            <div>
              <h2 className="font-heading font-bold text-xl text-primary mb-1">Choose a Trek</h2>
              {trekOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-5">No upcoming treks are open right now. Please check back soon.</p>
              ) : (
                <Field label="Select Trek *">
                  <select required value={trekId} onChange={(e) => setTrekId(e.target.value)} className={inputCls}>
                    <option value="">Choose your adventure...</option>
                    {trekOptions.map((t) => (
                      <option key={t.id} value={t.id} disabled={t.seats_remaining <= 0}>
                        {t.name} — {new Date(t.trek_date).toLocaleDateString()} {t.seats_remaining <= 0 ? "(FULL)" : `(${t.seats_remaining} left)`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {selectedTrek && (
                <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm space-y-1.5">
                  <div className="flex justify-between flex-wrap gap-2">
                    <span className="font-semibold text-primary">{selectedTrek.name}</span>
                    {selectedTrek.price > 0 && (
                      <span className="font-bold text-accent">₹{selectedTrek.price.toLocaleString("en-IN")} / person</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    📅 {new Date(selectedTrek.trek_date).toLocaleDateString()}
                    {selectedTrek.trek_time ? ` • 🕒 ${selectedTrek.trek_time}` : ""}
                    {selectedTrek.destination ? ` • 📍 ${selectedTrek.destination}` : ""}
                  </div>
                  <div className="text-muted-foreground">🪑 {selectedTrek.seats_remaining} of {selectedTrek.max_seats} seats remaining</div>
                  {selectedTrek.meeting_point && (
                    <div className="text-muted-foreground"><strong className="text-primary">Meeting point:</strong> {selectedTrek.meeting_point}</div>
                  )}
                  {selectedTrek.instructions && (
                    <div className="text-muted-foreground"><strong className="text-primary">Instructions:</strong> {selectedTrek.instructions}</div>
                  )}
                  {(selectedTrek.itinerary_url || selectedTrek.itinerary_file_path) && (
                    <div className="pt-2 flex flex-wrap gap-2">
                      {selectedTrek.itinerary_url && (
                        <a
                          href={selectedTrek.itinerary_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition"
                        >
                          📋 View Itinerary
                        </a>
                      )}
                      {selectedTrek.itinerary_file_path && (
                        <a
                          href={supabase.storage.from("itineraries").getPublicUrl(selectedTrek.itinerary_file_path).data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
                        >
                          📄 Download Itinerary (PDF)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="font-heading font-bold text-xl text-primary mb-1">Your Details</h2>
              <p className="text-sm text-muted-foreground mb-5">As the account holder, please share your full information.</p>

              <div className="space-y-5">
                <Field label="Full Name *">
                  <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Aarav Reddy" />
                </Field>
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Age *">
                    <input type="number" required min={10} max={99} value={age} onChange={(e) => setAge(e.target.value)} className={inputCls} placeholder="24" />
                  </Field>
                  <Field label="Gender *">
                    <select required value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                      <option value="">Select...</option>
                      <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                    </select>
                  </Field>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Phone Number *">
                    <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
                  </Field>
                </div>
                <Field label="Aadhaar Number *">
                  <input required inputMode="numeric" maxLength={12} value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))} className={inputCls} placeholder="12-digit number" />
                </Field>
                <Field label="Aadhaar Photo *">
                  <FileInput file={aadhaarFile} onChange={setAadhaarFile} />
                </Field>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isGroup} onChange={(e) => { setIsGroup(e.target.checked); if (!e.target.checked) setMembers([]); }} className="w-4 h-4 accent-accent" />
                <span className="font-semibold text-primary">This is a group / family booking</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1 ml-7">Add other people you're booking for. We only need their name and Aadhaar.</p>
            </div>

            {isGroup && (
              <div className="space-y-4">
                {members.map((m, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary text-sm">Member {i + 1}</span>
                      <button type="button" onClick={() => removeMember(i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input required value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} className={inputCls} placeholder="Full name" maxLength={80} />
                    <input required inputMode="numeric" maxLength={12} value={m.aadhaar} onChange={(e) => updateMember(i, { aadhaar: e.target.value.replace(/\D/g, "") })} className={inputCls} placeholder="12-digit Aadhaar" />
                    <FileInput file={m.file} onChange={(f) => updateMember(i, { file: f })} />
                  </div>
                ))}
                <button type="button" onClick={addMember} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-accent hover:text-accent text-muted-foreground transition">
                  <Plus className="w-4 h-4" /> Add another person
                </button>
              </div>
            )}

            {selectedTrek && selectedTrek.price > 0 && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total ({seatsNeeded} {seatsNeeded === 1 ? "person" : "people"})</span>
                <span className="font-heading font-bold text-2xl text-primary">₹{(selectedTrek.price * seatsNeeded).toLocaleString("en-IN")}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedTrek || (selectedTrek?.seats_remaining ?? 0) < seatsNeeded}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold tracking-wide shadow-glow hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Confirm Booking"}
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Your Aadhaar details are stored securely and only accessible to you and our verified team.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

const inputCls = "w-full px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-2">{label}</label>
      {children}
    </div>
  );
}

function FileInput({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-input bg-background cursor-pointer hover:border-accent transition">
      <Upload className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground flex-1 truncate">
        {file ? file.name : "Upload Aadhaar photo (JPG/PNG, max 5MB)"}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
