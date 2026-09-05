import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Plus, Minus, ArrowLeft, ArrowRight, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Adventure } from "@/lib/treks";
import {
  DIFFICULTY_STYLES,
  fetchAdventures,
  fmtDate,
  fmtDateShort,
  hasValue,
  inr,
  submitBooking,
} from "@/lib/treks";
import logo from "@/assets/logo.png";

const primarySchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  age: z.coerce.number().int().min(10, "Minimum age is 10").max(99),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  phone: z.string().trim().regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export default function BookingPage() {
  const [params] = useSearchParams();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [trekId, setTrekId] = useState<string>(params.get("trek") ?? "");
  const [date, setDate] = useState<string>(params.get("date") ?? "");
  const [people, setPeople] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Idempotency key for this booking attempt: retries after a timeout or lost
  // response reuse the same key so the server never creates a duplicate.
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());

  useEffect(() => {
    document.title = "Book a Trek — E2 Trails";
    let cancelled = false;
    fetchAdventures().then((all) => {
      if (cancelled) return;
      setAdventures(all);
    });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => adventures.find((a) => a.id === trekId), [adventures, trekId]);
  const maxPeople = selected ? Math.max(1, selected.seatsRemaining) : 1;
  const price = selected?.startingPrice ?? (selected && selected.price > 0 ? selected.price : null);

  // Keep date valid when adventure changes
  useEffect(() => {
    if (selected && !selected.dates.includes(date)) setDate(selected.dates[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    setErrors({});
  }, [trekId, date]);

  const addPerson = () => setGroupNames((g) => (g.length < maxPeople - 1 ? [...g, ""] : g));
  const updatePerson = (i: number, v: string) =>
    setGroupNames((g) => g.map((x, idx) => (idx === i ? v : x)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selected) return toast.error("Please choose an adventure");
    if (!date) {
      setErrors({ date: "Choose a date" });
      return;
    }

    const parsed = primarySchema.safeParse({ name, age, gender, phone, email });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    for (const [i, g] of groupNames.entries()) {
      if (!g.trim()) {
        setErrors({ [`member-${i}`]: `Member ${i + 1}: name is required` });
        return;
      }
    }

    setSubmitting(true);
    const result = await submitBooking({
      trek: selected,
      trekDate: date,
      name: parsed.data.name,
      age: parsed.data.age,
      gender: parsed.data.gender,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      groupMembers: groupNames.filter((n) => n.trim()).map((n) => ({ name: n })),
      clientRef,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setDone(true);      toast.success("Booking received — our team will call you to confirm.");
  };

  const reset = () => {
    setDone(false);
    setClientRef(crypto.randomUUID());
    setGroupNames([]);
    setPeople(1);
  };

  const diff = selected ? DIFFICULTY_STYLES[selected.diff] : null;

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails" className="w-8 h-8 rounded-full bg-white object-contain p-0.5" />
            <span className="font-display font-bold text-base text-primary">E2 TRAILS</span>
          </Link>
          <Link to="/adventures" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All adventures
          </Link>
        </div>
      </header>

      <div className="container py-12 md:py-16 max-w-5xl">
        {done ? (
          <div className="max-w-2xl mx-auto text-center bg-card rounded-xl shadow-trail p-10 border border-primary/10">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-600/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-700" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1 className="font-display font-bold text-3xl text-primary">You're on the trail!</h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Your booking for <span className="font-semibold text-accent">{selected?.name}</span>
              {date ? ` on ${fmtDate(date)}` : ""} has been received. Our team will call you on{" "}
              <span className="font-semibold">{phone}</span> to confirm payment and share the final
              details.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button onClick={reset} className="btn-outline">Book another</button>
              <Link to="/" className="btn-accent">Return to homepage</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid lg:grid-cols-[1fr_400px] gap-10 items-start">
            <div className="space-y-10 min-w-0">
              <div>
                <p className="kicker">Reserve your spot</p>
                <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-3 text-primary">Book your adventure</h1>
                <p className="mt-4 text-muted-foreground">
                  Choose your adventure, pick a date and tell us who's coming. No payment is taken
                  online — we confirm with you directly.
                </p>
              </div>

              {/* 1. Adventure */}
              <section>
                <h2 className="font-display font-bold text-xl text-primary mb-4">
                  <span className="text-accent mr-2">1</span> Choose your adventure
                </h2>
                {adventures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No adventures are open for booking right now. Check back soon.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {adventures.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        aria-pressed={trekId === a.id}
                        onClick={() => setTrekId(a.id)}
                        disabled={a.isFull}
                        className={cn(
                          "text-left rounded-xl border p-4 transition-colors",
                          trekId === a.id
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border bg-card hover:border-accent/50",
                          a.isFull && "opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-primary leading-snug">{a.name}</span>
                          {a.isFull && <span className="pill bg-destructive/10 text-destructive shrink-0">Full</span>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                            {a.destination || a.location || a.region || "Hyderabad"}
                          </span>
                          {hasValue(a.dur) && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                              {a.dur}
                            </span>
                          )}
                        </div>
                        {price != null && (
                          <p className="mt-2 text-sm font-bold text-gold-deep">{inr(price)} / person</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* 2. Date */}
              {selected && (
                <section>
                  <h2 className="font-display font-bold text-xl text-primary mb-1">
                    <span className="text-accent mr-2">2</span> Choose your date
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selected.seatsRemaining > 0
                      ? `${selected.seatsRemaining} spots available across these dates`
                      : "This adventure is currently full."}
                  </p>
                  {selected.dates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming dates yet — check back soon.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selected.dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={date === d}
                          onClick={() => setDate(d)}
                          className={cn("filter-pill", date === d ? "filter-pill-active" : "filter-pill-idle")}
                        >
                          {fmtDateShort(d)}
                          <span className="text-xs opacity-70">{new Date(d).getFullYear()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.date && <p className="field-error" role="alert">{errors.date}</p>}
                </section>
              )}

              {/* 3. People */}
              {selected && (
                <section>
                  <h2 className="font-display font-bold text-xl text-primary mb-4">
                    <span className="text-accent mr-2">3</span> How many people?
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Fewer people"
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                      disabled={people <= 1}
                      className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="w-10 text-center font-display font-bold text-2xl text-primary" aria-live="polite">
                      {people}
                    </span>
                    <button
                      type="button"
                      aria-label="More people"
                      onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}
                      disabled={people >= maxPeople}
                      className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  {people > 1 && (
                    <div className="mt-5 space-y-3 max-w-md">
                      <p className="text-sm text-muted-foreground">
                        Add the other {people - 1} person{people - 1 > 1 ? "s" : ""} you're booking for.
                      </p>
                      {groupNames.map((g, i) => (
                        <div key={i}>
                          <input
                            value={g}
                            onChange={(e) => updatePerson(i, e.target.value)}
                            placeholder={`Person ${i + 2} — full name`}
                            maxLength={80}
                            aria-label={`Person ${i + 2} name`}
                            className="field-input"
                          />
                          {errors[`member-${i}`] && <p className="field-error" role="alert">{errors[`member-${i}`]}</p>}
                        </div>
                      ))}
                      {groupNames.length < people - 1 && (
                        <button type="button" onClick={addPerson} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                          <Plus className="w-4 h-4" aria-hidden="true" /> Add another person
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* 4. Details */}
              {selected && (
                <section>
                  <h2 className="font-display font-bold text-xl text-primary mb-4">
                    <span className="text-accent mr-2">4</span> Your details
                  </h2>
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" maxLength={80} aria-label="Full name" className="field-input" />
                      {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <input type="number" min={10} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age *" aria-label="Age" className="field-input" />
                        {errors.age && <p className="field-error" role="alert">{errors.age}</p>}
                      </div>
                      <div>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender" className="field-input">
                          <option value="">Gender *</option>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                          <option>Prefer not to say</option>
                        </select>
                        {errors.gender && <p className="field-error" role="alert">{errors.gender}</p>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number *" aria-label="Phone number" className="field-input" />
                        {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
                      </div>
                      <div>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" className="field-input" />
                        {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Summary sidebar */}
            <aside className="lg:sticky lg:top-20 rounded-xl border border-primary/15 bg-card shadow-trail p-7">
              <h2 className="font-display font-bold text-xl text-primary">Booking summary</h2>
              {selected ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-lg overflow-hidden bg-muted">
                    {selected.img ? (
                      <img src={selected.img} alt={selected.name} className="w-full h-32 object-cover" />
                    ) : null}
                  </div>
                  <p className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Trip</span>
                    <span className="font-semibold text-right">{selected.name}</span>
                  </p>
                  {diff && (
                    <p className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Difficulty</span>
                      <span className="font-semibold">{selected.diff}</span>
                    </p>
                  )}
                  {hasValue(selected.dur) && (
                    <p className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-semibold">{selected.dur}</span>
                    </p>
                  )}
                  <p className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold">{date ? fmtDate(date) : "—"}</span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-semibold">{people}</span>
                  </p>
                  {price != null ? (
                    <p className="flex justify-between gap-3 border-t border-border pt-3 mt-3">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-display font-bold text-xl text-primary">{inr(price * people)}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Price is confirmed by our team for this adventure.</p>
                  )}
                  {selected.itineraryDays.length > 0 && (
                    <Link
                      to={`/itinerary/${selected.id}`}
                      className="block text-xs font-semibold text-accent hover:underline pt-1"
                    >
                      View itinerary →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Choose an adventure to see your summary.</p>
              )}

              <button
                type="submit"
                disabled={submitting || !selected || (selected?.seatsRemaining ?? 0) < people || selected.isFull}
                className="btn-accent w-full mt-6 disabled:opacity-50"
              >
                {submitting ? "Confirming…" : "Confirm booking"}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
                No payment is taken online. Our team calls you to confirm and share payment details.
              </p>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}