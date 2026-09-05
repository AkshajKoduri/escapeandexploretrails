import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Mountain,
  Ruler,
  Flag,
  CalendarDays,
  Minus,
  Plus,
  CheckCircle2,
  Phone,
  FileText,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Adventure } from "@/lib/treks";
import {
  DIFFICULTY_STYLES,
  fetchAdventureById,
  fetchAdventures,
  fmtDate,
  fmtDateShort,
  hasValue,
  inr,
  submitBooking,
} from "@/lib/treks";
import AdventureCard from "@/components/site/AdventureCard";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useReveal } from "@/hooks/useReveal";

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  age: z.coerce.number().int().min(10, "Minimum age is 10").max(99),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
  phone: z.string().trim().regex(/^[+]?[0-9\s-]{10,15}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export default function TripDetail() {
  useReveal();
  const { trekId } = useParams<{ trekId: string }>();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [others, setOthers] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!trekId) return;
      const [a, all] = await Promise.all([fetchAdventureById(trekId), fetchAdventures()]);
      if (cancelled) return;
      setAdventure(a);
      setOthers(all.filter((x) => x.id !== trekId).slice(0, 3));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [trekId]);

  useEffect(() => {
    if (adventure) document.title = `${adventure.name} — E2 Trails`;
  }, [adventure]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 pb-20">
          <div className="aspect-[16/9] md:aspect-[21/9] rounded-xl bg-muted animate-pulse" />
          <div className="mt-8 h-10 w-2/3 bg-muted animate-pulse rounded" />
          <div className="mt-4 h-5 w-1/3 bg-muted animate-pulse rounded" />
        </div>
      </main>
    );
  }

  if (!adventure) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-32 pb-24 text-center">
          <Mountain className="w-12 h-12 text-muted-foreground/50 mx-auto mb-5" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="font-display font-bold text-3xl text-primary">This adventure isn't available</h1>
          <p className="mt-3 text-muted-foreground">It may have been archived or its dates may have passed.</p>
          <Link to="/adventures" className="btn-accent mt-8">
            Browse all adventures
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const diff = DIFFICULTY_STYLES[adventure.diff];
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const location = adventure.destination || adventure.location || adventure.region || "Hyderabad";
  const hasItineraryDays = adventure.itineraryDays.length > 0;
  const hasItineraryFile = !!(adventure.itineraryUrl || adventure.itineraryFilePath);

  const facts = [
    hasValue(adventure.dist) && { label: "Distance", value: adventure.dist, icon: Ruler },
    hasValue(adventure.dur) && { label: "Duration", value: adventure.dur, icon: Clock },
    { label: "Difficulty", value: adventure.diff, icon: Mountain },
    hasValue(adventure.meetingPoint) && { label: "Starting point", value: adventure.meetingPoint, icon: Flag },
    hasValue(adventure.trekTime) && { label: "Assembly", value: adventure.trekTime, icon: Clock },
  ].filter(Boolean) as { label: string; value: string; icon: typeof Clock }[];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* ============ Hero ============ */}
      <section className="relative bg-charcoal overflow-hidden">
        <div className="relative h-[52vh] min-h-[380px] md:h-[62vh]">
          {adventure.img ? (
            <img src={adventure.img} alt={adventure.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-charcoal grid place-items-center">
              <span className="font-display italic text-4xl text-charcoal-foreground/40">{adventure.name}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
        </div>
        <div className="absolute top-20 left-0 right-0">
          <div className="container flex items-center justify-between">
            <Link
              to="/adventures"
              className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-full bg-charcoal/50 backdrop-blur-sm text-charcoal-foreground text-sm font-semibold hover:bg-charcoal/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All adventures
            </Link>
          </div>
        </div>

        <div className="container relative -mt-24 md:-mt-28 pb-8">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`pill backdrop-blur-sm ${diff.chip}`}>
                <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} aria-hidden="true" />
                {diff.label}
              </span>
              {adventure.isFull ? (
                <span className="pill bg-destructive text-destructive-foreground">Sold out</span>
              ) : (
                <span className="pill bg-charcoal-foreground/90 text-charcoal">
                  {adventure.seatsRemaining > 0
                    ? `${adventure.seatsRemaining} spot${adventure.seatsRemaining > 1 ? "s" : ""} left`
                    : "Almost gone"}
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-4xl md:text-6xl text-charcoal-foreground leading-[1.05] text-balance text-shadow-strong">
              {adventure.name}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-charcoal-foreground/80">
              <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
              {location}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-charcoal-foreground/85">
              {adventure.dates[0] && (
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="w-4 h-4 text-accent" aria-hidden="true" />
                  {fmtDate(adventure.dates[0])}
                </span>
              )}
              {price != null && (
                <span className="font-display font-bold text-2xl text-gold">
                  {inr(price)} <span className="text-sm font-normal text-charcoal-foreground/70">/ person</span>
                </span>
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#book" className="btn-accent">
                Book your spot
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href={`https://wa.me/916303682022?text=${encodeURIComponent(`Hi! I'm interested in the ${adventure.name}. Can you share more details?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost-light"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                Enquire on WhatsApp
              </a>
              <CallbackButton adventure={adventure} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ Info strip ============ */}
      {facts.length > 0 && (
        <section className="border-b border-border bg-card/70">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {facts.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="bg-card px-4 py-6 md:px-6">
                  <Icon className="w-5 h-5 text-accent mb-2" strokeWidth={1.75} aria-hidden="true" />
                  <p className="meta-label">{f.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground leading-snug">{f.value}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ Body ============ */}
      <section className="py-14 md:py-20">
        <div className="container grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-16 items-start">
          <div className="min-w-0 space-y-14">
            {adventure.description && (
              <section>
                <p className="kicker">The experience</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">What this adventure is</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">{adventure.description}</p>
              </section>
            )}

            {hasItineraryDays && (
              <section>
                <p className="kicker">Itinerary</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">How the days unfold</h2>
                <Accordion type="single" collapsible className="mt-5 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {adventure.itineraryDays.map((d, i) => (
                    <AccordionItem key={i} value={`day-${i}`} className="border-b-0 px-5 sm:px-6">
                      <AccordionTrigger className="min-h-[44px] py-4 font-display font-bold text-primary text-left hover:no-underline">
                        {d.title || `Day ${i + 1}`}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pb-5">
                        {d.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {hasItineraryFile && (
                  <Link to={`/itinerary/${adventure.id}`} className="btn-outline btn-sm mt-5">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    Full itinerary &amp; PDF
                  </Link>
                )}
              </section>
            )}

            {hasValue(adventure.instructions) && (
              <section>
                <p className="kicker">What to carry</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Pack right, enjoy more</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">{adventure.instructions}</p>
              </section>
            )}

            {hasValue(adventure.meetingPoint) && (
              <section>
                <p className="kicker">How to reach</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Start here</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">{adventure.meetingPoint}</p>
              </section>
            )}

            {adventure.extras.length > 0 && (
              <section>
                <p className="kicker">Trail facts</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">The fine print of the trail</h2>
                <dl className="mt-5 grid sm:grid-cols-2 gap-px bg-border border border-border rounded-xl overflow-hidden">
                  {adventure.extras.map((x) => (
                    <div key={x.key} className="bg-card p-4">
                      <dt className="meta-label">{x.label}</dt>
                      <dd className="mt-1.5 text-sm font-semibold text-foreground">{x.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {adventure.albumUrl && (
              <section>
                <p className="kicker">Photos</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Relive the last trip</h2>
                <a
                  href={adventure.albumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline mt-5"
                >
                  View photo album
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </section>
            )}

            {/* Safety note */}
            <section className="rounded-xl border border-primary/15 bg-primary/5 p-6 md:p-8">
              <p className="kicker">Safety</p>
              <h2 className="font-display font-bold text-xl md:text-2xl text-primary mt-2">You'll know exactly what you're signing up for</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                This trip runs with an experienced leader, first-aid kit and emergency protocols. The
                details above — distance, difficulty, duration, meeting point and what to carry — are
                shared upfront so you can prepare properly. Groups are kept small and managed.
              </p>
            </section>

            {/* Upcoming dates */}
            {adventure.dates.length > 0 && (
              <section>
                <p className="kicker">Upcoming dates</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Pick your weekend</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {adventure.isFull
                    ? "This adventure is currently full — check back for new dates."
                    : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available across these dates (shared pool).`}
                </p>
                <ul className="mt-5 divide-y divide-border border-y border-border">
                  {adventure.dates.map((d) => (
                    <li key={d} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <span className="font-display font-semibold text-lg text-foreground">{fmtDate(d)}</span>
                      <a href="#book" className="text-sm font-semibold text-accent hover:underline">
                        Book this date →
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ============ Booking panel ============ */}
          <BookingPanel adventure={adventure} />
        </div>
      </section>

      {/* ============ More adventures ============ */}
      {others.length > 0 && (
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="kicker">Keep exploring</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">More adventures</h2>
              </div>
              <Link to="/adventures" className="btn-outline btn-sm shrink-0">
                See all
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {others.map((a) => (
                <AdventureCard key={a.id} adventure={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}

/* ================================================================== */
/* Booking panel                                                       */
/* ================================================================== */

function BookingPanel({ adventure }: { adventure: Adventure }) {
  const [date, setDate] = useState<string>(adventure.dates[0] ?? "");
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

  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const maxPeople = Math.max(1, adventure.seatsRemaining);

  useEffect(() => {
    setDate(adventure.dates[0] ?? "");
    setDone(false);
    setClientRef(crypto.randomUUID());
  }, [adventure.id, adventure.dates]);

  const addPerson = () => setGroupNames((g) => (g.length < maxPeople - 1 ? [...g, ""] : g));
  const updatePerson = (i: number, v: string) =>
    setGroupNames((g) => g.map((x, idx) => (idx === i ? v : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = bookingSchema.safeParse({ name, age, gender, phone, email });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    if (!date) {
      setErrors({ date: "Choose a date first" });
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
      trek: adventure,
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
    setDone(true);
    toast.success("Booking received — our team will call you to confirm.");
  };

  if (done) {
    return (
      <div id="book" className="lg:sticky lg:top-24 rounded-xl border border-primary/15 bg-card shadow-trail p-7 md:p-8">
        <div className="inline-flex w-14 h-14 rounded-full bg-green-600/15 text-green-700 items-center justify-center mb-5">
          <CheckCircle2 className="w-7 h-7" strokeWidth={2} aria-hidden="true" />
        </div>
        <h3 className="font-display font-bold text-2xl text-primary">You're on the trail!</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your booking for <span className="font-semibold text-foreground">{adventure.name}</span>
          {date ? ` on ${fmtDate(date)}` : ""} has been received. Our team will call{" "}
          <span className="font-semibold text-foreground">{phone}</span> to confirm payment and share
          final details.
        </p>
        <div className="mt-6 rounded-lg bg-muted/60 p-4 text-sm space-y-1.5">
          <p className="flex justify-between"><span className="text-muted-foreground">Trip</span><span className="font-semibold">{adventure.name}</span></p>
          {date && <p className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-semibold">{fmtDate(date)}</span></p>}
          <p className="flex justify-between"><span className="text-muted-foreground">People</span><span className="font-semibold">{people}</span></p>
          {price != null && (
            <p className="flex justify-between border-t border-border pt-1.5 mt-1.5">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display font-bold text-primary text-lg">{inr(price * people)}</span>
            </p>
          )}
        </div>
        <Link to="/adventures" className="btn-outline w-full mt-6">
          Explore more adventures
        </Link>
      </div>
    );
  }

  return (
    <div id="book" className="lg:sticky lg:top-24 rounded-xl border border-primary/15 bg-card shadow-trail p-7 md:p-8 scroll-mt-28">
      <p className="kicker">Book your spot</p>
      <h3 className="font-display font-bold text-2xl text-primary mt-2">{adventure.name}</h3>

      <form onSubmit={submit} noValidate className="mt-6 space-y-6">
        {/* Date */}
        <div>
          <p className="field-label">Choose your date</p>
          {adventure.dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming dates — check back soon.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {adventure.dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={date === d}
                  onClick={() => setDate(d)}
                  className={cn("filter-pill", date === d ? "filter-pill-active" : "filter-pill-idle")}
                >
                  {fmtDateShort(d)}
                </button>
              ))}
            </div>
          )}
          {errors.date && <p className="field-error" role="alert">{errors.date}</p>}
        </div>

        {/* Seats + people */}
        <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Seats available</span>
            <span className={cn("font-bold", adventure.seatsRemaining <= 5 ? "text-gold-deep" : "text-primary")}>
              {adventure.seatsRemaining} left
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Number of people</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Fewer people"
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
                disabled={people <= 1}
                className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="w-8 text-center font-display font-bold text-lg text-primary" aria-live="polite">
                {people}
              </span>
              <button
                type="button"
                aria-label="More people"
                onClick={() => setPeople((p) => Math.min(maxPeople, p + 1))}
                disabled={people >= maxPeople}
                className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {people > 1 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">
                We'll need each person's name ({people - 1} more).
              </p>
              {groupNames.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={g}
                    onChange={(e) => updatePerson(i, e.target.value)}
                    placeholder={`Person ${i + 2} name`}
                    maxLength={80}
                    aria-label={`Person ${i + 2} name`}
                    className="field-input py-2"
                  />
                  <button
                    type="button"
                    aria-label={`Remove person ${i + 2}`}
                    onClick={() => setGroupNames((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-destructive hover:opacity-80 p-2"
                  >
                    ×
                  </button>
                </div>
              ))}
              {groupNames.length < people - 1 && (
                <button type="button" onClick={addPerson} className="text-xs font-semibold text-accent hover:underline">
                  + Add person
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <p className="field-label">Your details</p>
          <div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={80}
              aria-label="Full name"
              className="field-input"
            />
            {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                min={10}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                aria-label="Age"
                className="field-input"
              />
              {errors.age && <p className="field-error" role="alert">{errors.age}</p>}
            </div>
            <div>
              <select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender" className="field-input">
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
              {errors.gender && <p className="field-error" role="alert">{errors.gender}</p>}
            </div>
          </div>
          <div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (WhatsApp preferred)"
              aria-label="Phone number"
              className="field-input"
            />
            {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
          </div>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              aria-label="Email"
              className="field-input"
            />
            {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
          </div>
        </div>

        {/* Summary */}
        {price != null && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-1.5 text-sm">
            <p className="flex justify-between"><span className="text-muted-foreground">Trip</span><span className="font-semibold text-right">{adventure.name}</span></p>
            {date && <p className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-semibold">{fmtDate(date)}</span></p>}
            <p className="flex justify-between"><span className="text-muted-foreground">Participants</span><span className="font-semibold">{people}</span></p>
            <p className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display font-bold text-lg text-primary">{inr(price * people)}</span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || adventure.isFull || adventure.dates.length === 0}
          className="btn-accent w-full disabled:opacity-50"
        >
          {submitting ? "Confirming…" : "Confirm booking"}
        </button>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          No payment is taken online. Our team calls you to confirm and share the payment details.
        </p>
      </form>
    </div>
  );
}

/* ================================================================== */
/* Callback request dialog                                             */
/* ================================================================== */

function CallbackButton({ adventure }: { adventure: Adventure }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [preferredTime, setPreferredTime] = useState("Anytime");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      toast.error("Please enter your name and mobile number.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("callback_requests" as any).insert({
      trip_id: adventure.id,
      trip_name: adventure.name,
      full_name: fullName.trim(),
      email: email.trim() || null,
      mobile_number: mobile.trim(),
      preferred_time: preferredTime,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit the request. Please try again.");
      return;
    }
    toast.success("Thanks! We'll call you back soon.");
    setOpen(false);
    setFullName("");
    setEmail("");
    setMobile("");
    setPreferredTime("Anytime");
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost-light">
        <Phone className="w-4 h-4" aria-hidden="true" />
        Request a callback
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">Request a callback</DialogTitle>
            <DialogDescription>
              For <span className="font-semibold text-foreground">{adventure.name}</span> — we'll call you
              back to answer any questions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="cb-name" className="field-label">Full Name *</label>
              <input id="cb-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="cb-email" className="field-label">Email <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
              <input id="cb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="cb-mobile" className="field-label">Mobile Number *</label>
              <input id="cb-mobile" type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} className="field-input" />
            </div>
            <div>
              <label htmlFor="cb-time" className="field-label">Preferred Time to Call</label>
              <select id="cb-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="field-input">
                <option>Morning (9 AM – 12 PM)</option>
                <option>Afternoon (12 PM – 4 PM)</option>
                <option>Evening (4 PM – 8 PM)</option>
                <option>Anytime</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}