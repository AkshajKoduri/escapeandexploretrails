import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin, Mountain } from "lucide-react";
import type { Adventure } from "@/lib/treks";
import { DIFFICULTY_STYLES, EVENT_TYPE_LABELS, fmtDate, hasValue, inr } from "@/lib/treks";

/**
 * Editorial adventure card. Dates, price and availability are always real
 * (from the DB) — we never fabricate seat counts.
 */
export default function AdventureCard({
  adventure,
  priority = false,
  compact = false,
  wide = false,
}: {
  adventure: Adventure;
  priority?: boolean;
  compact?: boolean;
  wide?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const location = adventure.destination || adventure.location || adventure.region || "Hyderabad";
  const diff = DIFFICULTY_STYLES[adventure.diff];
  const nextDate = adventure.dates[0];

  return (
    <Link
      to={`/adventures/${adventure.id}`}
      className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:h-full"
      aria-label={`View ${adventure.name}${nextDate ? `, ${fmtDate(nextDate)}` : ""}`}
    >
      <article className={`relative overflow-hidden rounded-xl bg-charcoal shadow-card card-hover flex flex-col ${wide ? "md:grid md:h-[360px] md:min-h-0 md:grid-cols-[3fr_2fr] lg:grid-cols-[2fr_1fr]" : "md:h-full"}`}>
        <div className={`relative overflow-hidden bg-muted ${wide ? "h-40 md:h-full md:aspect-auto" : compact ? "h-44 md:h-auto md:aspect-[4/3]" : "aspect-[4/5]"}`}>
          {adventure.img && !imageFailed ? (
            <img
              src={adventure.img}
              srcSet={adventure.imgSrcSet ?? undefined}
              sizes={wide ? "(min-width: 1024px) 64vw, (min-width: 768px) 58vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
              alt={adventure.name}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              width={adventure.imgWidth ?? undefined}
              height={adventure.imgHeight ?? undefined}
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="w-full h-full grid place-items-center bg-primary text-primary-foreground/45" aria-hidden="true">
              <div className="text-center">
                <Mountain className="mx-auto h-12 w-12" strokeWidth={1} />
                <span className="meta-label mt-3 block text-primary-foreground/55">E2 Trails</span>
              </div>
            </div>
          )}
          <div className={`absolute inset-0 bg-gradient-card ${wide ? "md:hidden" : ""}`} aria-hidden="true" />

          {/* Date badge */}
          {nextDate && (
            <div className={`absolute top-4 left-4 flex flex-col items-center rounded-md bg-charcoal-foreground/95 px-3 py-1.5 text-center shadow-card ${wide ? "md:hidden" : ""}`}>
              <span className="font-display font-bold text-lg leading-none text-charcoal">
                {new Date(nextDate).getDate()}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/70">
                {new Date(nextDate).toLocaleDateString("en-IN", { month: "short" })}
              </span>
            </div>
          )}

          {/* Difficulty */}
          <span className={`absolute top-4 right-4 pill backdrop-blur-sm ${diff.chip} ${wide ? "md:hidden" : ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} aria-hidden="true" />
            {diff.label}
          </span>

          {adventure.isFull && (
            <span className="absolute top-4 left-1/2 -translate-x-1/2 pill bg-destructive text-destructive-foreground">
              Sold Out
            </span>
          )}
        </div>

        <div className={`flex flex-col text-charcoal-foreground bg-charcoal ${wide ? "gap-1.5 px-4 py-3 md:justify-center md:gap-3 md:px-6 md:py-5 lg:px-7" : compact ? "gap-2 px-4 py-3.5 md:flex-1" : "gap-3 p-5 md:flex-1"}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-foreground/60">
            {EVENT_TYPE_LABELS[adventure.eventType]}
            {adventure.trekCategory ? ` · ${adventure.trekCategory}` : ""}
          </p>
          <h3 className={`font-display font-bold leading-snug ${wide ? "text-lg md:text-2xl" : compact ? "text-lg" : "text-xl"}`}>{adventure.name}</h3>

          {wide && nextDate && (
            <time dateTime={nextDate} className="hidden font-display text-base font-semibold text-gold md:block">
              {fmtDate(nextDate)}
            </time>
          )}

          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-foreground/75 ${wide ? "md:hidden" : ""}`}>
            {hasValue(adventure.dur) && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                {adventure.dur}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {location}
            </span>
          </div>

          {wide && (
            <div className="hidden space-y-2 text-xs text-charcoal-foreground/75 md:block">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {hasValue(adventure.dur) && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {adventure.dur}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${diff.dot}`} aria-hidden="true" />
                  {diff.label}
                </span>
                {adventure.isFull ? (
                  <span className="font-semibold text-charcoal-foreground">Sold out</span>
                ) : adventure.seatsRemaining > 0 ? (
                  <span>{adventure.seatsRemaining} seats available</span>
                ) : null}
              </div>
            </div>
          )}

          <div className={`mt-1 flex items-center justify-between gap-3 ${wide ? "md:block" : "md:mt-auto"}`}>
            <div>
              {price != null ? (
                <>
                  <span className="block text-lg font-bold text-gold leading-none">{inr(price)}</span>
                  <span className="text-[11px] text-charcoal-foreground/60">
                    / person
                    {wide && !adventure.isFull && adventure.seatsRemaining > 0 && (
                      <span className="md:hidden"> · {adventure.seatsRemaining} available</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-charcoal-foreground/60">Price on request</span>
                  {wide && !adventure.isFull && adventure.seatsRemaining > 0 && (
                    <span className="block text-[11px] text-charcoal-foreground/60 md:hidden">
                      {adventure.seatsRemaining} available
                    </span>
                  )}
                </>
              )}
            </div>
            <span className={`inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-light transition-transform duration-200 group-hover:translate-x-0.5 ${wide ? "md:mt-4 md:min-h-[46px] md:w-full md:justify-center md:rounded-full md:bg-accent md:px-5 md:text-accent-foreground" : ""}`}>
              View adventure
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        {!wide && !adventure.isFull && adventure.seatsRemaining > 0 && adventure.seatsRemaining <= 8 && (
          <div className={`${compact ? "px-4" : "px-5"} py-2 border-t border-charcoal-foreground/10 bg-charcoal`}>
            <p className="text-[11px] font-semibold text-gold">
              {adventure.seatsRemaining} spot{adventure.seatsRemaining > 1 ? "s" : ""} left
            </p>
          </div>
        )}
      </article>
    </Link>
  );
}
