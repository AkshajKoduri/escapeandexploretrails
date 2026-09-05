import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Adventure } from "@/lib/treks";
import { fetchAdventures } from "@/lib/treks";
import AdventureCard from "@/components/site/AdventureCard";

type Mode = "outstation" | "hyderabad" | "all";

export default function Treks({
  mode = "all",
  preview = false,
}: { mode?: Mode; preview?: boolean } = {}) {
  const [treks, setTreks] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const all = await fetchAdventures();
    setTreks(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`treks-public-${mode}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_treks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [mode]);

  const visible = useMemo(() => {
    if (mode === "outstation") return treks.filter((t) => t.eventType === "Monsoon Trek");
    if (mode === "hyderabad")
      return treks.filter((t) => t.eventType === "Hike" || t.eventType === "Cycling Ride" || t.eventType === "Bike Ride");
    return treks;
  }, [treks, mode]);

  const isHomeSection = mode === "all";
  const headerTitle = isHomeSection
    ? "Your next adventure"
    : mode === "outstation"
      ? "Outstation treks"
      : "Trails near home";
  const headerBlurb = isHomeSection
    ? "Upcoming adventures with real dates, real prices and real seats — book your spot before they go."
    : mode === "outstation"
      ? "Handpicked getaways across India — book your spot before they sell out."
      : "Weekend hikes, cycling rides & bike rides around Hyderabad — perfect for a quick escape.";

  const showGrid = !isHomeSection;

  // Homepage: when only one adventure exists, the dedicated FeaturedAdventure
  // module right below the hero already tells that story — don't render a
  // one-card carousel that simply repeats it. Two or more adventures unlock
  // the grid.
  if (isHomeSection) {
    if (loading && treks.length === 0) return null;
    if (visible.length < 2) return null;
  }

  return (
    <section id={mode === "all" ? "upcoming" : mode === "outstation" ? "treks" : "hyderabad-trails"} className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">{isHomeSection ? "Upcoming adventures" : mode === "outstation" ? "Outstation treks" : "Hyderabad trails"}</p>
            <h2 className="editorial-title mt-3">{headerTitle}</h2>
            <p className="editorial-lead">{headerBlurb}</p>
          </div>
          {!preview && (
            <Link to="/adventures" className="btn-outline shrink-0">
              See all adventures
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {loading && treks.length === 0 ? (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-16 text-center py-10">
            <Compass className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-muted-foreground max-w-md mx-auto">
              No adventures are scheduled right now — new dates are added regularly. Check back soon.
            </p>
          </div>
        ) : showGrid ? (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {visible.slice(0, preview ? 3 : undefined).map((t, i) => (
              <div key={t.id} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <AdventureCard adventure={t} priority={i < 3} />
              </div>
            ))}
          </div>
        ) : (
          /* Homepage: horizontal scroller on mobile, grid on desktop */
          <div className="mt-12">
            <div className="flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6 lg:gap-8 md:overflow-visible">
              {visible.slice(0, 8).map((t, i) => (
                <div key={t.id} className="w-[80%] sm:w-[55%] md:w-auto shrink-0 snap-start md:shrink">
                  <AdventureCard adventure={t} priority={i < 3} />
                </div>
              ))}
            </div>
          </div>
        )}

        {preview && visible.length > 0 && (
          <div className="mt-10">
            <Link to="/adventures" className="btn-primary">
              See all adventures
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}