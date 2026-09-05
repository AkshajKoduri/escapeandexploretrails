import { useEffect, useState } from "react";
import { Footprints, Mountain, Compass, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/treks";

/**
 * Real metrics computed from the database. No fabricated achievements —
 * if there is no data yet, the band hides itself.
 */
export default function Stats() {
  const [metrics, setMetrics] = useState<{ explorers: number; trails: number; upcoming: number; nextDate: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      // get_explorer_count() is a purpose-built, counts-only server function:
      // anonymous visitors never read raw booking rows.
      const [trekRes, explorerRes] = await Promise.all([
        supabase.from("upcoming_treks").select("id, trek_date, additional_dates, is_archived, is_draft"),
        supabase.rpc("get_explorer_count"),
      ]);
      if (cancelled) return;

      type TrekRow = {
        id: string;
        trek_date: string | null;
        additional_dates: string[] | null;
        is_archived: boolean;
        is_draft: boolean;
      };
      const treks = ((trekRes.data ?? []) as TrekRow[]).filter(
        (t) => !t.is_archived && !t.is_draft,
      );

      const explorers = Number(explorerRes.data ?? 0);

      const upcomingTreks = treks.filter((t) => {
        const dates = [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[];
        if (!dates.length) return true;
        return dates.some((d) => d >= today);
      });

      // Earliest upcoming date across all adventures
      let nextDate: string | null = null;
      for (const t of upcomingTreks) {
        for (const d of [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[]) {
          if (d >= today && (!nextDate || d < nextDate)) nextDate = d;
        }
      }

      setMetrics({ explorers, trails: treks.length, upcoming: upcomingTreks.length, nextDate });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!metrics || (metrics.explorers === 0 && metrics.trails === 0 && metrics.upcoming === 0)) {
    return null;
  }

  // Honesty rule: a "0+ explorers" tile actively damages trust, so it is only
  // rendered when the database can prove a real number.
  const items = [
    ...(metrics.explorers > 0
      ? [{ icon: Footprints, value: metrics.explorers, suffix: "+", label: "Explorers guided" }]
      : []),
    { icon: Mountain, value: metrics.trails, suffix: "", label: "Adventures offered" },
    { icon: Compass, value: metrics.upcoming, suffix: "", label: "Upcoming adventures" },
  ];

  return (
    <section className="bg-primary text-primary-foreground py-14 md:py-16 border-y border-primary-foreground/10">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 items-center">
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center px-2">
                <Icon className="w-5 h-5 text-accent mx-auto mb-3" strokeWidth={2} aria-hidden="true" />
                <p className="font-display font-bold text-3xl md:text-4xl leading-none">
                  {s.value.toLocaleString("en-IN")}
                  <span className="text-accent">{s.suffix}</span>
                </p>
                <p className="mt-2 text-primary-foreground/70 text-xs md:text-sm font-medium tracking-wide">{s.label}</p>
              </div>
            );
          })}
          {metrics.nextDate ? (
            <div className="text-center px-2">
              <CalendarDays className="w-5 h-5 text-accent mx-auto mb-3" strokeWidth={2} aria-hidden="true" />
              <p className="font-display font-bold text-3xl md:text-4xl leading-none text-gold">
                {fmtDate(metrics.nextDate)}
              </p>
              <p className="mt-2 text-primary-foreground/70 text-xs md:text-sm font-medium tracking-wide">Next trail out</p>
            </div>
          ) : (
            <div className="text-center px-2">
              <Compass className="w-5 h-5 text-accent mx-auto mb-3" strokeWidth={2} aria-hidden="true" />
              <p className="font-display font-bold text-3xl md:text-4xl leading-none">—</p>
              <p className="mt-2 text-primary-foreground/70 text-xs md:text-sm font-medium tracking-wide">Next dates coming soon</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
