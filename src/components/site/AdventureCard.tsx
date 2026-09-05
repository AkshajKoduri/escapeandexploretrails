import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import type { Adventure } from "@/lib/treks";
import { DIFFICULTY_STYLES, EVENT_TYPE_LABELS, fmtDateShort, hasValue, inr } from "@/lib/treks";

/**
 * Editorial adventure card. Dates, price and availability are always real
 * (from the DB) — we never fabricate seat counts.
 */
export default function AdventureCard({ adventure, priority = false }: { adventure: Adventure; priority?: boolean }) {
  const price = adventure.startingPrice ?? (adventure.price > 0 ? adventure.price : null);
  const location = adventure.destination || adventure.location || adventure.region || "Hyderabad";
  const diff = DIFFICULTY_STYLES[adventure.diff];
  const nextDate = adventure.dates[0];

  return (
    <Link
      to={`/adventures/${adventure.id}`}
      className="group block h-full focus:outline-none"
      aria-label={`View ${adventure.name}`}
    >
      <article className="relative h-full overflow-hidden rounded-xl bg-charcoal shadow-card card-hover flex flex-col">
        <div className="relative aspect-[4/5] sm:aspect-[4/5] overflow-hidden bg-muted">
          {adventure.img ? (
            <img
              src={adventure.img}
              alt={adventure.name}
              loading={priority ? "eager" : "lazy"}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-charcoal-foreground/40">
              <span className="font-display italic text-lg">{adventure.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-card" aria-hidden="true" />

          {/* Date badge */}
          {nextDate && (
            <div className="absolute top-4 left-4 flex flex-col items-center rounded-md bg-charcoal-foreground/95 px-3 py-1.5 text-center shadow-card">
              <span className="font-display font-bold text-lg leading-none text-charcoal">
                {new Date(nextDate).getDate()}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-charcoal/70">
                {new Date(nextDate).toLocaleDateString("en-IN", { month: "short" })}
              </span>
            </div>
          )}

          {/* Difficulty */}
          <span className={`absolute top-4 right-4 pill backdrop-blur-sm ${diff.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} aria-hidden="true" />
            {diff.label}
          </span>

          {adventure.isFull && (
            <span className="absolute top-4 left-1/2 -translate-x-1/2 pill bg-destructive text-destructive-foreground">
              Sold Out
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 gap-3 p-5 text-charcoal-foreground bg-charcoal">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-foreground/60">
            {EVENT_TYPE_LABELS[adventure.eventType]}
            {adventure.trekCategory ? ` · ${adventure.trekCategory}` : ""}
          </p>
          <h3 className="font-display font-bold text-xl leading-snug">{adventure.name}</h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-foreground/75">
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

          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <div>
              {price != null ? (
                <>
                  <span className="block text-lg font-bold text-gold leading-none">{inr(price)}</span>
                  <span className="text-[11px] text-charcoal-foreground/60">/ person</span>
                </>
              ) : (
                <span className="text-sm text-charcoal-foreground/60">Price on request</span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent transition-transform duration-200 group-hover:translate-x-0.5">
              View adventure
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        {!adventure.isFull && adventure.seatsRemaining > 0 && adventure.seatsRemaining <= 8 && (
          <div className="px-5 py-2 border-t border-charcoal-foreground/10 bg-charcoal">
            <p className="text-[11px] font-semibold text-gold">
              {adventure.seatsRemaining} spot{adventure.seatsRemaining > 1 ? "s" : ""} left
            </p>
          </div>
        )}
      </article>
    </Link>
  );
}