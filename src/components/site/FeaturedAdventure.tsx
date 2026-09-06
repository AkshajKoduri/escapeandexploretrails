import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock, MapPin, Mountain } from "lucide-react";
import type { Adventure } from "@/lib/treks";
import { DIFFICULTY_STYLES, fetchAdventures, fmtDate, hasValue, inr } from "@/lib/treks";
import { formatAdventureDescription } from "@/lib/adventureDescription";

/**
 * Featured destination — always the next real adventure with photography.
 * Hidden entirely when there is no data.
 */
export default function FeaturedAdventure() {
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdventures().then((all) => {
      if (cancelled) return;
      const featured = all.find((a) => a.img) ?? all[0] ?? null;
      setAdventure(featured);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading || !adventure) return null;

  const diff = DIFFICULTY_STYLES[adventure.diff];
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const location = adventure.destination || adventure.location || adventure.region || "Hyderabad";
  const nextDate = adventure.dates[0];
  const summary = formatAdventureDescription(adventure.description, adventure.name)
    .flatMap((section) => section.blocks)
    .find((block) => block.type === "paragraph")?.text;

  return (
    <section id="featured" className="section bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 items-stretch">
          <Link
            to={`/adventures/${adventure.id}`}
            className="lg:col-span-7 group relative block overflow-hidden rounded-xl bg-primary min-h-[340px] sm:min-h-[420px] md:min-h-[520px]"
            aria-label={`View ${adventure.name}`}
          >
            {adventure.img && !imageFailed ? (
              <img
                src={adventure.img}
                alt={adventure.name}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-primary" aria-hidden="true">
                <div className="text-center text-primary-foreground/45">
                  <Mountain className="mx-auto h-16 w-16" strokeWidth={1} />
                  <span className="meta-label mt-3 block text-primary-foreground/55">E2 Trails guided adventure</span>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-card" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6 md:p-8 text-charcoal-foreground">
              <div>
                <p className="meta-label text-charcoal-foreground/65">{adventure.isFull ? "Currently full" : "Next departure"}</p>
                <p className="mt-1.5 font-display text-xl font-semibold md:text-2xl">
                  {nextDate ? fmtDate(nextDate) : "New dates coming soon"}
                </p>
              </div>
              <span className="hidden items-center gap-2 text-sm text-charcoal-foreground/75 sm:inline-flex">
                <MapPin className="h-4 w-4 text-gold" aria-hidden="true" />
                {location}
              </span>
            </div>
          </Link>

          <div className="lg:col-span-5 flex flex-col justify-center py-2 lg:py-8">
            <p className="kicker">Featured adventure</p>
            <h2 className="editorial-title mt-3 text-3xl md:text-4xl">
              {adventure.name}
            </h2>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
                {location}
              </span>
              {hasValue(adventure.dur) && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" aria-hidden="true" />
                  {adventure.dur}
                </span>
              )}
              <span className={`pill ${diff.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} aria-hidden="true" />
                {diff.label}
              </span>
            </div>

            {summary && (
              <p className="mt-5 text-muted-foreground leading-relaxed line-clamp-3">
                {summary}
              </p>
            )}

            <div className="mt-6 border-y border-border py-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                {adventure.isFull
                  ? "Currently full — new dates coming soon."
                  : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available across these dates`}
              </p>
              {adventure.dates.slice(0, 3).map((d) => (
                <p key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="font-semibold text-foreground">{fmtDate(d)}</span>
                </p>
              ))}
              {price != null && (
                <p className="pt-2 font-display font-bold text-2xl text-primary">
                  {inr(price)} <span className="text-sm font-normal text-muted-foreground">/ person</span>
                </p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/adventures/${adventure.id}`} className="btn-accent">
                Book your spot
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link to="/adventures" className="btn-outline">
                See all adventures
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
