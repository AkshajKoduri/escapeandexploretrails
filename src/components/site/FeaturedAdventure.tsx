import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import AdventureCard from "@/components/site/AdventureCard";
import { supabase } from "@/integrations/supabase/client";
import type { Adventure } from "@/lib/treks";
import { fetchAdventures } from "@/lib/treks";

/**
 * One stable homepage product section. The nearest departure leads the list,
 * followed by the next real adventures; there is no duplicate featured card.
 */
export default function FeaturedAdventure() {
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const next = await fetchAdventures();
        if (!cancelled) setAdventures(next);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const channel = supabase
      .channel(`home-adventures-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_treks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [retryKey]);

  const updateScrollState = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollBack(scroller.scrollLeft > 8);
    setCanScrollForward(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 8);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [adventures.length]);

  const scroll = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.86,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const visible = adventures.slice(0, 4);

  return (
    <section id="featured" className="border-b border-border bg-background py-14 md:py-20 lg:py-24">
      <div className="container">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">Upcoming adventures</p>
            <h2 className="editorial-title mt-3">
              Your next trail,
              <span className="font-script text-accent"> already planned.</span>
            </h2>
            <p className="editorial-lead">
              Real departures, clear details and small-group outings from Hyderabad.
            </p>
          </div>
          <Link to="/adventures" className="btn-outline hidden shrink-0 md:inline-flex">
            See all adventures
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loadFailed && adventures.length === 0 ? (
          <div role="alert" className="mt-10 rounded-xl border border-border bg-card px-6 py-9 text-center">
            <p className="font-display text-xl font-semibold text-primary">The next departures couldn’t load.</p>
            <p className="mt-2 text-sm text-muted-foreground">Please check your connection and try again.</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="btn-outline mt-5">
              Try again
            </button>
          </div>
        ) : loading && adventures.length === 0 ? (
          <div className="mt-10 flex gap-4 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-4" aria-label="Loading upcoming adventures" role="status">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[430px] w-[86%] shrink-0 animate-pulse rounded-xl bg-muted sm:w-[55%] md:w-auto" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-10 border-y border-border py-10 text-center">
            <Compass className="mx-auto h-9 w-9 text-muted-foreground/50" strokeWidth={1.5} aria-hidden="true" />
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              New departure dates are being prepared. Browse the adventure collection while you wait.
            </p>
            <Link to="/adventures" className="btn-outline mt-5">Browse adventures</Link>
          </div>
        ) : (
          <>
            <div
              ref={scrollerRef}
              onScroll={updateScrollState}
              role="region"
              aria-label="Upcoming adventures"
              className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-4"
            >
              {visible.map((adventure, index) => (
                <div
                  key={adventure.id}
                  className={`${visible.length === 1 ? "w-full md:col-span-2 lg:col-span-4" : "w-[86%] sm:w-[55%]"} shrink-0 snap-start md:w-auto md:shrink`}
                >
                  <AdventureCard adventure={adventure} priority={index === 0} compact wide={visible.length === 1} />
                </div>
              ))}
            </div>

            {visible.length > 1 && (
              <div className="mt-4 flex items-center justify-between md:hidden">
                <p className="text-sm text-muted-foreground">Swipe or use the controls</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => scroll(-1)}
                    disabled={!canScrollBack}
                    aria-label="Previous adventures"
                    className="grid h-11 w-11 place-items-center rounded-full border border-border text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scroll(1)}
                    disabled={!canScrollForward}
                    aria-label="Next adventures"
                    className="grid h-11 w-11 place-items-center rounded-full border border-border text-primary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <Link to="/adventures" className="btn-accent mt-7 w-full md:hidden">
              See all adventures
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
