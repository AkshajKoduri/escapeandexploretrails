import { useEffect, useState } from "react";
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
  Phone,
  FileText,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Adventure } from "@/lib/treks";
import {
  DIFFICULTY_NOTES,
  DIFFICULTY_STYLES,
  fetchAdventureById,
  fetchAdventures,
  fmtDate,
  hasValue,
  inr,
  whatsappLink,
} from "@/lib/treks";
import AdventureCard from "@/components/site/AdventureCard";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import BookingForm from "@/components/booking/BookingForm";
import { useSeo } from "@/hooks/useSeo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useReveal } from "@/hooks/useReveal";

export default function TripDetail() {
  useReveal();
  const { trekId } = useParams<{ trekId: string }>();
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [others, setOthers] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  // Set when a visitor clicks "Book this date" — the booking panel below
  // reacts by preselecting exactly that date.
  const [requestedDate, setRequestedDate] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [trekId]);

  // Dynamic metadata from the real trek record; unknown treks stay out of indexes.
  useSeo({
    title: adventure ? `${adventure.name} — E2 Trails` : "Adventure — E2 Trails",
    description: adventure?.description
      ? adventure.description.slice(0, 155)
      : "Guided trek with E2 Trails from Hyderabad — real dates, prices and availability.",
    path: `/adventures/${trekId ?? ""}`,
    noindex: !adventure,
  });

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
  const soldOut = adventure.isFull || adventure.seatsRemaining <= 0;

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
              <span className={cn("pill backdrop-blur-sm", diff.chip)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", diff.dot)} aria-hidden="true" />
                {diff.label}
              </span>
              {soldOut && <span className="pill bg-destructive text-destructive-foreground">Sold out</span>}
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
                  {adventure.dates.length > 1
                    ? `From ${fmtDate(adventure.dates[0])}`
                    : fmtDate(adventure.dates[0])}
                </span>
              )}
              {price != null && (
                <span className="font-display font-bold text-2xl text-gold">
                  {inr(price)} <span className="text-sm font-normal text-charcoal-foreground/70">/ person</span>
                </span>
              )}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {!soldOut && (
                <a href="#book" className="btn-accent">
                  Book your spot
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
              <a
                href={whatsappLink(`Hi! I'm interested in the ${adventure.name}. Can you share more details?`)}
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

      {/* ============ Quick facts ============ */}
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

      {/* ============ Is this for you? ============ */}
      <section className="border-b border-border bg-background">
        <div className="container py-5">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            <span className="font-semibold text-primary">Is this for you? </span>
            {DIFFICULTY_NOTES[adventure.diff]}{" "}
            {hasValue(adventure.dist) && (
              <>At {adventure.dist.toLowerCase()}, it's a proper day out — check the trail facts below for full details.</>
            )}{" "}
            <a
              href={whatsappLink(`Hi! I'm considering the ${adventure.name} — is it right for me?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline whitespace-nowrap"
            >
              Not sure? Ask us first.
            </a>
          </p>
        </div>
      </section>

      {/* ============ Body ============ */}
      <section className="py-14 md:py-20">
        <div className="container grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
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

            {(hasValue(adventure.meetingPoint) || hasValue(adventure.trekTime)) && (
              <section>
                <p className="kicker">Logistics</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Getting there &amp; meeting up</h2>
                <dl className="mt-5 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {hasValue(adventure.meetingPoint) && (
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-5 sm:px-6 py-4">
                      <dt className="meta-label sm:w-40 shrink-0">Meeting point</dt>
                      <dd className="text-sm font-medium text-foreground whitespace-pre-wrap">{adventure.meetingPoint}</dd>
                    </div>
                  )}
                  {hasValue(adventure.trekTime) && (
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 px-5 sm:px-6 py-4">
                      <dt className="meta-label sm:w-40 shrink-0">Assembly time</dt>
                      <dd className="text-sm font-medium text-foreground whitespace-pre-wrap">{adventure.trekTime}</dd>
                    </div>
                  )}
                </dl>
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
                <a href={adventure.albumUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-5">
                  View photo album
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </section>
            )}

            {/* Upcoming dates */}
            {adventure.dates.length > 0 && (
              <section>
                <p className="kicker">Dates &amp; availability</p>
                <h2 className="font-display font-bold text-2xl md:text-3xl text-primary mt-3">Pick your weekend</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {soldOut
                    ? "This adventure is currently full — check back for new dates."
                    : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available across these dates (shared pool) at ${price != null ? `${inr(price)} per person` : "the listed price"}.`}
                </p>
                <ul className="mt-5 divide-y divide-border border-y border-border">
                  {adventure.dates.map((d) => (
                    <li key={d} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-display font-semibold text-lg text-foreground">{fmtDate(d)}</p>
                        {adventure.dates.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {d === adventure.dates[0] ? "Next departure" : "Second departure"}
                          </p>
                        )}
                      </div>
                      <a
                        href="#book"
                        onClick={(e) => {
                          e.preventDefault();
                          setRequestedDate(d);
                          document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-sm font-semibold text-accent hover:underline min-h-[44px] inline-flex items-center gap-1.5"
                      >
                        {soldOut ? "Full" : "Book this date"}
                        {!soldOut && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Safety note */}
            <section className="rounded-xl border border-primary/15 bg-primary/5 p-6 md:p-8">
              <p className="kicker">Safety</p>
              <h2 className="font-display font-bold text-xl md:text-2xl text-primary mt-2">You'll know exactly what you're signing up for</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                This trip runs with an experienced E2 Trails leader, a first-aid kit and clear emergency
                protocols. The details above — distance, difficulty, duration, meeting point and what to
                carry — are shared upfront so you can prepare properly. Groups are kept small and managed.
              </p>
            </section>
          </div>

          {/* ============ Booking panel ============ */}
          <BookingForm
            adventure={adventure}
            initialDate={requestedDate}
            variant="panel"
            heading={
              <>
                <p className="kicker">Book your spot</p>
                <h3 className="font-display font-bold text-2xl text-primary mt-2">{adventure.name}</h3>
              </>
            }
            successActions={
              <Link to="/adventures" className="btn-outline">
                Explore more adventures
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            }
          />
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
      <MobileBookBar adventure={adventure} />
    </main>
  );
}

/* ================================================================== */
/* Mobile sticky booking bar (trek page)                               */
/* ================================================================== */

function MobileBookBar({ adventure }: { adventure: Adventure }) {
  const [visible, setVisible] = useState(false);
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const soldOut = adventure.isFull || adventure.seatsRemaining <= 0;

  useEffect(() => {
    let ticking = false;
    const update = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // Appear only after the user is clearly past the hero CTA.
        if (y < 520) {
          setVisible(false);
          ticking = false;
          return;
        }
        // Hide while the booking panel itself is on screen, so the bar never
        // fights the real form for attention.
        const el = document.getElementById("book");
        let panelInView = false;
        if (el) {
          const r = el.getBoundingClientRect();
          panelInView = r.top < window.innerHeight - 130 && r.bottom > 130;
        }
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 240;
        setVisible(!panelInView && !nearBottom);
        ticking = false;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [adventure.id]);

  if (!visible) return null;

  return (
    <div className="bar-enter lg:hidden fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 backdrop-blur supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {adventure.dates[0] ? fmtDate(adventure.dates[0]) : "No upcoming dates"}
          </p>
          <p className="font-display font-bold text-lg text-primary leading-tight truncate">
            {price != null ? `${inr(price)} / person` : "Price on request"}
          </p>
        </div>
        <a href="#book" className="btn-accent shrink-0 min-h-[44px] px-5">
          {soldOut ? "Sold out" : "Book your spot"}
          {!soldOut && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
        </a>
      </div>
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
    // callback_requests is missing from the generated Database types (stale types.ts);
    // runtime table exists and works. To fix properly: regenerate Supabase types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              <label htmlFor="cb-name" className="field-label">
                Full Name *
              </label>
              <input
                id="cb-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="cb-email" className="field-label">
                Email <span className="normal-case font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="cb-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="cb-mobile" className="field-label">
                Mobile Number *
              </label>
              <input
                id="cb-mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="cb-time" className="field-label">
                Preferred Time to Call
              </label>
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
