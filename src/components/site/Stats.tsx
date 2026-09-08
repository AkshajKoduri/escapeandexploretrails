import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/treks";

type Metrics = {
  seatsBooked: number;
  currentAdventures: number;
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

      const publishedTreks = ((trekRes.data ?? []) as TrekRow[]).filter((trek) => !trek.is_archived && !trek.is_draft);
      const currentTreks = publishedTreks.filter((trek) => {
        const dates = [trek.trek_date, ...(trek.additional_dates ?? [])].filter(Boolean) as string[];
        return dates.length === 0 || dates.some((date) => date >= today);
      });
      const nextDate = currentTreks
        .flatMap((trek) => [trek.trek_date, ...(trek.additional_dates ?? [])])
        .filter((date): date is string => Boolean(date && date >= today))
        .sort()[0] ?? null;

      setMetrics({
        seatsBooked: Number(explorerRes.data ?? 0),
        currentAdventures: currentTreks.length,
        nextDate,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!metrics) return null;

  const items = [
    { value: metrics.seatsBooked.toLocaleString("en-IN"), label: "Seats booked", compactValue: false },
    { value: metrics.currentAdventures.toLocaleString("en-IN"), label: "Current adventure", compactValue: false },
    { value: metrics.nextDate ? fmtDate(metrics.nextDate) : "—", label: "Next listed date", compactValue: true },
  ];

  return (
    <dl aria-label="Live E2 Trails statistics" className="mt-8 grid grid-cols-3 divide-x divide-charcoal-foreground/15 border-y border-charcoal-foreground/15 sm:mt-10">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col px-1 py-4 text-center sm:px-4 sm:py-5"
        >
          <dt className="order-2 mt-2 text-xs font-medium leading-snug text-charcoal-foreground/65">{item.label}</dt>
          <dd className={`order-1 whitespace-nowrap font-display font-bold leading-none tabular-nums text-gold ${item.compactValue ? "text-[clamp(0.875rem,4vw,1.875rem)]" : "text-xl sm:text-2xl md:text-3xl"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
