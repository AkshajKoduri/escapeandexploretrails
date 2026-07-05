import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ahobilam from "@/assets/trek-ahobilam.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Difficulty = "Easy" | "Moderate" | "Hard";
type EventType = "Hike" | "Cycling Ride" | "Outstation Trek" | "Bike Ride";
type FilterType = "All" | EventType;
type TrekCard = {
  id: string;
  name: string;
  destination: string | null;
  img: string;
  diff: Difficulty;
  dur: string;
  dist: string;
  price: number;
  startingPrice: number | null;
  startingPriceLabel: string | null;
  topEndPrice: number | null;
  topEndPriceLabel: string | null;
  dates: string[];
  dateLabel: string;
  trekTime: string | null;
  description: string | null;
  instructions: string | null;
  meetingPoint: string | null;
  itineraryUrl: string | null;
  itineraryFilePath: string | null;
  itineraryDays: { title: string; description: string }[];
  seatsRemaining: number;
  maxSeats: number;
  isFull: boolean;
  eventType: EventType;
  extras: { key: string; label: string; value: string }[];
};


const OUTSTATION_FIELDS: { key: string; label: string }[] = [
  { key: "trek_difficulty", label: "Trek Difficulty" },
  { key: "trek_distance", label: "Trek Distance" },
  { key: "altitude", label: "Altitude" },
  { key: "region", label: "Region" },
  { key: "elevation_gain", label: "Elevation Gain" },
  { key: "mountain_range", label: "Mountain Range" },
  { key: "base_village", label: "Base Village" },
  { key: "duration_text", label: "Duration" },
  { key: "stay_location", label: "Stay Location" },
];

const fallbackImg = ahobilam;

const diffStyle: Record<Difficulty, { bg: string; label: string }> = {
  Easy: { bg: "bg-green-500/20 text-green-200", label: "🟢 Easy" },
  Moderate: { bg: "bg-gold/20 text-gold", label: "🟡 Moderate" },
  Hard: { bg: "bg-destructive/20 text-red-200", label: "🔴 Hard" },
};

export default function Treks() {
  const [treks, setTreks] = useState<TrekCard[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [callbackForId, setCallbackForId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("All");

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: trekData }, { data: stats }] = await Promise.all([
      supabase
        .from("upcoming_treks")
        .select("*")
        .eq("is_archived", false)
        .eq("is_draft", false)
        .order("trek_date", { ascending: true, nullsFirst: false }),
      supabase.rpc("get_trek_seat_stats"),
    ]);

    const statsMap = new Map<string, { seats_remaining: number; max_seats: number }>();
    (stats ?? []).forEach((s: any) => statsMap.set(s.trek_id, s));

    const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    setTreks(
      (trekData ?? [])
        .filter((t: any) => {
          const all = [t.trek_date, ...((t.additional_dates ?? []) as string[])].filter(Boolean);
          if (all.length === 0) return true;
          return all.some((d: string) => d >= today);
        })
        .map((t: any) => {
          const s = statsMap.get(t.id);
          const remaining = s?.seats_remaining ?? t.max_seats ?? 0;
          const dates = [t.trek_date, ...((t.additional_dates ?? []) as string[])]
            .filter(Boolean)
            .filter((d: string) => d >= today);
          return {
            id: t.id,
            name: t.name,
            destination: t.destination,
            img: t.image_url || fallbackImg,
            diff: (t.difficulty as Difficulty) ?? "Easy",
            dur: t.duration ?? "",
            dist: t.distance ?? t.location ?? "",
            price: Number(t.price ?? 0),
            startingPrice: t.starting_price != null ? Number(t.starting_price) : null,
            startingPriceLabel: t.starting_price_label ?? null,
            topEndPrice: t.top_end_price != null ? Number(t.top_end_price) : null,
            topEndPriceLabel: t.top_end_price_label ?? null,
            dates,
            dateLabel: dates.length ? dates.map(fmt).join(", ") : "",
            trekTime: t.trek_time,
            description: t.description ?? null,
            instructions: t.instructions ?? null,
            meetingPoint: t.meeting_point ?? null,
            itineraryUrl: t.itinerary_url ?? null,
            itineraryFilePath: t.itinerary_file_path ?? null,
            itineraryDays: Array.isArray(t.itinerary_days) ? (t.itinerary_days as any) : [],
            seatsRemaining: remaining,
            maxSeats: s?.max_seats ?? t.max_seats ?? 0,
            isFull: remaining <= 0,
            eventType: (t.event_type as EventType) ?? "Hike",
            extras: OUTSTATION_FIELDS
              .map((f) => ({
                key: f.key,
                label: (t.field_labels && t.field_labels[f.key]) || f.label,
                value: (t[f.key] ?? "") as string,
              }))
              .filter((x) => x.value && String(x.value).trim() !== ""),
          };
        }),
    );

  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("treks-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_treks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const openTrek = treks.find((t) => t.id === openId) || null;
  const hasItinerary = !!(openTrek && (openTrek.itineraryDays.length > 0 || openTrek.itineraryFilePath || openTrek.itineraryUrl));




  return (
    <section id="treks" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Upcoming treks</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Your Next Adventure Awaits
          </h2>
          <p className="mt-4 text-muted-foreground">
            Handpicked weekend escapes across India — book your spot before they sell out.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2 reveal">
          {(["All", "Hike", "Cycling Ride", "Bike Ride", "Outstation Trek"] as FilterType[]).map((f) => {
            const label =
              f === "Hike" ? "Hikes"
              : f === "Cycling Ride" ? "Cycling Rides"
              : f === "Bike Ride" ? "Bike Rides"
              : f === "Outstation Trek" ? "Outstation Treks"
              : "All";
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-sm font-semibold font-heading transition-colors border ${
                  active
                    ? "bg-accent text-accent-foreground border-accent shadow-card"
                    : "bg-background text-primary border-border hover:bg-accent/10 hover:border-accent"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {(() => {
          const visible = filter === "All" ? treks : treks.filter((t) => t.eventType === filter);
          if (treks.length === 0) {
            return (
              <p className="mt-14 text-center text-muted-foreground">
                No upcoming treks right now — check back soon!
              </p>
            );
          }
          if (visible.length === 0) {
            return (
              <p className="mt-14 text-center text-muted-foreground">
                No events in this category yet — try another filter.
              </p>
            );
          }
          return (
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {visible.map((t) => (
              <article
                key={t.id}
                onClick={() => setOpenId(t.id)}
                className="group relative overflow-hidden rounded-2xl shadow-card aspect-[4/5] bg-charcoal cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-trail"
              >
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-card" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-colors duration-500" />

                <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${diffStyle[t.diff].bg}`}>
                    {diffStyle[t.diff].label}
                  </span>
                  {t.dates.length > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-accent/30 text-charcoal-foreground whitespace-nowrap">
                      📅 {t.dates.length === 1 ? t.dateLabel : `${t.dates.length} dates available`}
                    </span>
                  )}
                  {t.isFull ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-destructive/80 text-destructive-foreground ml-auto">
                      Trip Full
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-green-600/80 text-white ml-auto">
                      {t.seatsRemaining} seats left
                    </span>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 text-charcoal-foreground">
                  <h3 className="font-heading font-bold text-2xl mb-2">{t.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-foreground/85 mb-3">
                    {t.dur && <span>⏱ Duration: {t.dur}</span>}
                    {t.trekTime && <span>🕒 Assembly: {t.trekTime}</span>}
                    {t.dist && <span>📍 {t.dist}</span>}
                  </div>
                  {(t.startingPrice != null || t.topEndPrice != null) ? (
                    <div className="text-sm font-bold text-accent mb-4 space-y-0.5">
                      {t.startingPrice != null && (
                        <div>₹{t.startingPrice.toLocaleString("en-IN")}{t.startingPriceLabel ? <span className="text-xs text-charcoal-foreground/80 font-normal"> ({t.startingPriceLabel})</span> : null}</div>
                      )}
                      {t.topEndPrice != null && (
                        <div>₹{t.topEndPrice.toLocaleString("en-IN")}{t.topEndPriceLabel ? <span className="text-xs text-charcoal-foreground/80 font-normal"> ({t.topEndPriceLabel})</span> : null}</div>
                      )}
                    </div>
                  ) : t.price > 0 ? (
                    <div className="text-lg font-bold text-accent mb-4">₹{t.price.toLocaleString("en-IN")}<span className="text-xs text-charcoal-foreground/70 font-normal"> / person</span></div>
                  ) : null}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenId(t.id); }}
                    className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-gold transition-colors"
                  >
                    View More Info →
                  </button>
                </div>
              </article>
            ))}
          </div>
          );
        })()}

      </div>

      <Dialog open={!!openTrek} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto">
          {openTrek && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-primary">{openTrek.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {openTrek.dateLabel && <span>📅 Date: {openTrek.dateLabel}</span>}
                  {openTrek.trekTime && <span>🕒 Assembly: {openTrek.trekTime}</span>}
                  {openTrek.dur && <span>⏱ Duration: {openTrek.dur}</span>}
                  {openTrek.dist && <span>📍 {openTrek.dist}</span>}
                  {openTrek.meetingPoint && <span>📌 Meeting Point: {openTrek.meetingPoint}</span>}
                </DialogDescription>
              </DialogHeader>
              <img src={openTrek.img} alt={openTrek.name} className="w-full h-56 object-cover rounded-lg" />
              {(openTrek.startingPrice != null || openTrek.topEndPrice != null) ? (
                <div className="text-base font-bold text-accent space-y-0.5">
                  {openTrek.startingPrice != null && (
                    <div>₹{openTrek.startingPrice.toLocaleString("en-IN")}{openTrek.startingPriceLabel ? <span className="text-xs text-muted-foreground font-normal"> ({openTrek.startingPriceLabel})</span> : null}</div>
                  )}
                  {openTrek.topEndPrice != null && (
                    <div>₹{openTrek.topEndPrice.toLocaleString("en-IN")}{openTrek.topEndPriceLabel ? <span className="text-xs text-muted-foreground font-normal"> ({openTrek.topEndPriceLabel})</span> : null}</div>
                  )}
                </div>
              ) : openTrek.price > 0 ? (
                <div className="text-lg font-bold text-accent">
                  ₹{openTrek.price.toLocaleString("en-IN")}
                  <span className="text-xs text-muted-foreground font-normal"> / person</span>
                </div>
              ) : null}


              {openTrek.eventType === "Outstation Trek" && openTrek.extras.length > 0 && (
                <section>
                  <h4 className="font-heading font-bold text-primary mb-2">Trek Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {openTrek.extras.map((x) => (
                      <div key={x.key} className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="text-xs font-bold text-primary uppercase tracking-wide">{x.label}</div>
                        <div className="text-sm text-foreground mt-0.5">{x.value}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}


              {(openTrek.description || openTrek.instructions) && (
                <Accordion type="multiple" className="w-full">
                  {openTrek.description && (
                    <AccordionItem value="description">
                      <AccordionTrigger className="font-heading font-bold text-primary hover:no-underline">
                        Description
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {openTrek.description}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {openTrek.instructions && (
                    <AccordionItem value="instructions">
                      <AccordionTrigger className="font-heading font-bold text-primary hover:no-underline">
                        Special Instructions
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {openTrek.instructions}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}

              {openTrek.meetingPoint && (
                <section>
                  <h4 className="font-heading font-bold text-primary mb-1">Meeting Point</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{openTrek.meetingPoint}</p>
                </section>
              )}

              {hasItinerary && (
                <section>
                  <h4 className="font-heading font-bold text-primary mb-2">Itinerary</h4>
                  <Link
                    to={`/itinerary/${openTrek.id}`}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-gold transition-colors"
                  >
                    📋 View Itinerary
                  </Link>
                </section>
              )}


              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={`https://wa.me/916303682022?text=${encodeURIComponent(`Hi! I'm interested in the ${openTrek.name}. Can you share more details?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full sm:flex-1 px-5 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Enquire on WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setCallbackForId(openTrek.id)}
                  className="inline-flex items-center justify-center w-full sm:flex-1 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-colors"
                >
                  📞 Request a Callback
                </button>
                {openTrek.isFull ? (
                  <button
                    disabled
                    className="inline-flex items-center justify-center w-full sm:flex-1 px-5 py-3 rounded-full bg-muted text-muted-foreground font-semibold cursor-not-allowed"
                  >
                    Sold Out
                  </button>
                ) : (
                  <Link
                    to={`/booking?trek=${openTrek.id}`}
                    className="inline-flex items-center justify-center w-full sm:flex-1 px-5 py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:bg-gold transition-colors"
                  >
                    Book Now →
                  </Link>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CallbackDialog
        trek={callbackForId ? treks.find((t) => t.id === callbackForId) ?? null : null}
        onClose={() => setCallbackForId(null)}
      />
    </section>
  );
}

function CallbackDialog({ trek, onClose }: { trek: TrekCard | null; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [preferredTime, setPreferredTime] = useState("Anytime");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (trek) {
      setFullName(""); setEmail(""); setMobile(""); setPreferredTime("Anytime");
    }
  }, [trek?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trek) return;
    if (!fullName.trim() || !mobile.trim()) {
      toast.error("Please enter your name and mobile number.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("callback_requests" as any).insert({
      trip_id: trek.id,
      trip_name: trek.name,
      full_name: fullName.trim(),
      email: email.trim() || null,
      mobile_number: mobile.trim(),
      preferred_time: preferredTime,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! We'll call you back soon.");
    onClose();
  };

  return (
    <Dialog open={!!trek} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {trek && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl text-primary">Request a Callback</DialogTitle>
              <DialogDescription>
                Requesting callback for: <span className="font-semibold text-foreground">{trek.name}</span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preferred Time to Call</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Morning (9 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 4 PM)</option>
                  <option>Evening (4 PM - 8 PM)</option>
                  <option>Anytime</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

