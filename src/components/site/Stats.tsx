import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/treks";

type Metrics = {
  explorers: number;
  trails: number;
  upcoming: number;
  nextDate: string | null;
};

/** Real, optional proof points embedded in the homepage trust story. */
export default function Stats() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [trekRes, explorerRes] = await Promise.all([
        supabase.from("upcoming_treks").select("id, trek_date, additional_dates, is_archived, is_draft"),
        supabase.rpc("get_explorer_count"),
      ]);
      if (cancelled || trekRes.error || explorerRes.error) return;

      type TrekRow = {
        id: string;
        trek_date: string | null;
        additional_dates: string[] | null;
        is_archived: boolean;
        is_draft: boolean;
      };

      const treks = ((trekRes.data ?? []) as TrekRow[]).filter((trek) => !trek.is_archived && !trek.is_draft);
      const upcomingTreks = treks.filter((trek) => {
        const dates = [trek.trek_date, ...(trek.additional_dates ?? [])].filter(Boolean) as string[];
        return dates.length === 0 || dates.some((date) => date >= today);
      });
      const nextDate = upcomingTreks
        .flatMap((trek) => [trek.trek_date, ...(trek.additional_dates ?? [])])
        .filter((date): date is string => Boolean(date && date >= today))
        .sort()[0] ?? null;

      setMetrics({
        explorers: Number(explorerRes.data ?? 0),
        trails: treks.length,
        upcoming: upcomingTreks.length,
        nextDate,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!metrics || (metrics.explorers === 0 && metrics.trails === 0 && metrics.upcoming === 0)) return null;

  const items = [
    ...(metrics.explorers > 0
      ? [{ value: `${metrics.explorers.toLocaleString("en-IN")}+`, label: "Explorers guided" }]
      : []),
    ...(metrics.trails > 0 ? [{ value: metrics.trails.toLocaleString("en-IN"), label: "Adventures offered" }] : []),
    ...(metrics.upcoming > 0 ? [{ value: metrics.upcoming.toLocaleString("en-IN"), label: "Upcoming now" }] : []),
    ...(metrics.nextDate ? [{ value: fmtDate(metrics.nextDate), label: "Next trail out" }] : []),
  ];

  return (
    <dl aria-label="Live E2 Trails statistics" className="mt-10 grid grid-cols-2 border-y border-charcoal-foreground/15 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col px-3 py-5 text-center sm:border-l sm:first:border-l-0 sm:border-charcoal-foreground/15">
          <dt className="order-2 mt-2 text-xs font-medium text-charcoal-foreground/65">{item.label}</dt>
          <dd className="order-1 font-display text-2xl font-bold leading-none text-gold md:text-3xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
