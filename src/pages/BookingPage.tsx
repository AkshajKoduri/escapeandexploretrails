import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicApi } from "@/lib/publicApi";
import logo from "@/assets/logo.png";

type Member = { name: string };
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
  trekId: z.string().min(1, "Choose a trek"),
});

export default function BookingPage() {
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
  const [isGroup, setIsGroup] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const selectedTrek = useMemo(() => trekOptions.find((t) => t.id === trekId), [trekOptions, trekId]);
  const seatsNeeded = 1 + (isGroup ? members.length : 0);

  useEffect(() => {
    document.title = "Book a Trek — E2 Trails";
  }, []);

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
    // no-op: booking is now public; users enter their details manually
  }, []);

  const addMember = () => setMembers((m) => [...m, { name: "" }]);
  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));
  const updateMember = (i: number, patch: Partial<Member>) =>
    setMembers((m) => m.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = primarySchema.safeParse({ name, age, gender, phone, email, trekId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!selectedTrek) return toast.error("Selected trek is no longer available");

    if (isGroup) {
      for (const [i, m] of members.entries()) {
        if (!m.name.trim()) {
          toast.error(`Member ${i + 1}: name is required`);
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
      await publicApi("createBooking", {
        trek_id: trekId,
        primary_name: parsed.data.name,
        primary_age: parsed.data.age,
        primary_gender: parsed.data.gender,
        primary_phone: parsed.data.phone,
        primary_email: parsed.data.email || null,
        is_group: isGroup && members.length > 0,
        members: isGroup ? members.map((m) => ({ full_name: m.name.trim() })) : [],
      });

      setDone(true);
      toast.success("Booking confirmed!");
    } catch (err: any) {
      toast.error(err.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };


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
          </div>
        </div>
      </header>

      <div className="container py-12 md:py-16 max-w-3xl">
        <div className="text-center mb-10">
          <span className="font-script text-accent text-xl">— Reserve your spot</span>
          <h1 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">Book Your Adventure</h1>
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => { setDone(false); setMembers([]); setIsGroup(false); }}
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-secondary transition"
              >
                Add a Person
              </button>
              <Link
                to="/"
                className="px-7 py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
              >
                Return to Homepage
              </Link>
            </div>
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
                        {t.name} — {new Date(t.trek_date).toLocaleDateString()} {t.seats_remaining <= 0 ? "(FULL)" : ""}
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
                        <button
                          type="button"
                          onClick={async () => {
                            const { data, error } = await supabase.functions.invoke("itinerary-signed-url", {
                              body: { trekId: selectedTrek.id },
                            });
                            if (error || !data?.url) {
                              toast.error("Itinerary is not available right now");
                              return;
                            }
                            window.open(data.url, "_blank", "noopener,noreferrer");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
                        >
                          📄 Download Itinerary (PDF)
                        </button>
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
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isGroup} onChange={(e) => { setIsGroup(e.target.checked); if (!e.target.checked) setMembers([]); }} className="w-4 h-4 accent-accent" />
                <span className="font-semibold text-primary">This is a group / family booking</span>
              </label>
              <p className="text-sm text-muted-foreground mt-1 ml-7">Add other people you're booking for. We only need their name.</p>
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
