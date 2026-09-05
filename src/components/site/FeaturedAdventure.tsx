import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import type { Adventure } from "@/lib/treks";
import { DIFFICULTY_STYLES, fetchAdventures, fmtDate, hasValue, inr } from "@/lib/treks";

/**
 * Featured destination — always the next real adventure with photography.
 * Hidden entirely when there is no data.
 */
export default function FeaturedAdventure() {
  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <section id="featured" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <Link
            to={`/adventures/${adventure.id}`}
            className="lg:col-span-7 group relative block overflow-hidden rounded-xl bg-charcoal min-h-[420px] md:min-h-[560px]"
            aria-label={`View ${adventure.name}`}
          >
            {adventure.img ? (
              <img
                src={adventure.img}
                alt={adventure.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-card" aria-hidden="true" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-charcoal-foreground">
              <span className="pill bg-charcoal-foreground/90 text-charcoal mb-4">
                {adventure.isFull ? "Sold out" : "Next up"}
              </span>
              <h3 className="font-display font-bold text-3xl md:text-5xl leading-tight text-balance">
                {adventure.name}
              </h3>
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

            {adventure.description && (
              <p className="mt-5 text-muted-foreground leading-relaxed line-clamp-4">
                {adventure.description}
              </p>
            )}

            <div className="mt-6 space-y-1">
              <p className="text-sm text-muted-foreground">
                {adventure.isFull
                  ? "Currently full — new dates coming soon."
                  : `${adventure.seatsRemaining} seat${adventure.seatsRemaining > 1 ? "s" : ""} available across these dates`}
              </p>
              {adventure.dates.slice(0, 3).map((d) => (
                <p key={d} className="text-sm text-muted-foreground">
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