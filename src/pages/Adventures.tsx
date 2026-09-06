import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X, Compass, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Adventure } from "@/lib/treks";
import { fetchAdventures } from "@/lib/treks";
import AdventureCard from "@/components/site/AdventureCard";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { useReveal } from "@/hooks/useReveal";
import { useSeo } from "@/hooks/useSeo";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ActivityKey = "hike" | "cycling" | "trek" | "bike";
type DurationKey = "half" | "one" | "multi";
type Mode = "all" | "outstation" | "hyderabad";
type SortKey = "date" | "price-asc" | "price-desc" | "name";

const ACTIVITIES: { key: ActivityKey; label: string }[] = [
  { key: "hike", label: "Hikes" },
  { key: "cycling", label: "Cycling" },
  { key: "trek", label: "Treks" },
  { key: "bike", label: "Bike Rides" },
];

const DURATIONS: { key: DurationKey; label: string }[] = [
  { key: "half", label: "Half day" },
  { key: "one", label: "1 day" },
  { key: "multi", label: "2–3 days+" },
];

const DIFFICULTIES = ["Easy", "Moderate", "Hard"] as const;

const EVENT_MAP: Record<ActivityKey, string[]> = {
  hike: ["Hike"],
  cycling: ["Cycling Ride"],
  trek: ["Monsoon Trek"],
  bike: ["Bike Ride"],
};

function matchesDuration(a: Adventure, key: DurationKey): boolean {
  const text = [a.dur, a.durationText ?? ""].filter(Boolean).join(" ").toLowerCase();
  if (key === "multi") {
    return /(\b[2-9]\s*(day|days)\b)|d\/\d?n|\b[2-9]d\b/i.test(text);
  }
  if (key === "half") {
    const h = text.match(/(\d+(?:\.\d+)?)\s*(hr|hour|hours)/);
    return !!h && Number(h[1]) < 8;
  }
  // "one" day: anything that isn't explicitly multi-day and isn't a short half-day ride
  return !matchesDuration(a, "multi") && !matchesDuration(a, "half");
}

export default function Adventures({ initialMode = "all" }: { initialMode?: Mode } = {}) {
  useReveal();
  useSeo({
    title: initialMode === "outstation"
      ? "Outstation Treks from Hyderabad — E2 Trails"
      : initialMode === "hyderabad"
        ? "Hyderabad Trails — Day Hikes & Rides Near Home — E2 Trails"
        : "All Adventures — E2 Trails",
    description: initialMode === "outstation"
      ? "Weekend treks and adventures away from Hyderabad — real dates, real prices, guided by E2 Trails."
      : initialMode === "hyderabad"
        ? "Day hikes, trails and cycling rides around Hyderabad — easy weekend plans close to home, led by E2 Trails."
        : "Browse every E2 Trails adventure — guided hikes, treks, cycling rides and bike rides with real dates and prices.",
    path: initialMode === "outstation" ? "/upcoming-treks" : initialMode === "hyderabad" ? "/hyderabad-trails" : "/adventures",
  });
  const [params, setParams] = useSearchParams();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (kept in sync with URL so links from the homepage work)
  const activity = (params.get("activity") as ActivityKey | null) ?? null;
  const duration = (params.get("duration") as DurationKey | null) ?? null;
  const difficulty = params.get("difficulty") as string | null;
  const modeParam = params.get("mode");
  // An explicit "all" in the URL always means all; otherwise fall back to the page preset.
  const mode: Mode = modeParam === "all" ? "all" : (modeParam as Mode | null) ?? initialMode;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdventures().then((all) => {
      if (cancelled) return;
      setAdventures(all);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (initialMode !== "all") next.set("mode", initialMode);
    setParams(next, { replace: true });
    setQuery("");
  };

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (activity ? 1 : 0) +
    (duration ? 1 : 0) +
    (difficulty ? 1 : 0) +
    (mode !== "all" ? 1 : 0);

  const visible = useMemo(() => {
    let list = adventures;

    if (mode === "outstation") list = list.filter((a) => a.eventType === "Monsoon Trek");
    else if (mode === "hyderabad")
      list = list.filter((a) => a.eventType === "Hike" || a.eventType === "Cycling Ride" || a.eventType === "Bike Ride");

    if (activity) list = list.filter((a) => EVENT_MAP[activity].includes(a.eventType));
    if (duration) list = list.filter((a) => matchesDuration(a, duration));
    if (difficulty) list = list.filter((a) => a.diff === difficulty);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        [a.name, a.destination, a.location, a.region, a.trekCategory, a.dur]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }

    const priceOf = (a: Adventure) => a.startingPrice ?? (a.price > 0 ? a.price : Infinity);
    const sorted = [...list];
    if (sort === "date") {
      sorted.sort((a, b) => {
        const da = a.dates[0] ?? "";
        const db = b.dates[0] ?? "";
        return da.localeCompare(db);
      });
    } else if (sort === "price-asc") {
      sorted.sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sort === "price-desc") {
      sorted.sort((a, b) => priceOf(b) - priceOf(a));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [adventures, mode, activity, duration, difficulty, query, sort]);

  const modeLabel =
    mode === "outstation" ? "Outstation treks" : mode === "hyderabad" ? "Hyderabad trails" : "All adventures";

  const activeFilterSummary = [
    mode !== "all" ? modeLabel : null,
    activity ? ACTIVITIES.find((item) => item.key === activity)?.label : null,
    duration ? DURATIONS.find((item) => item.key === duration)?.label : null,
    difficulty,
    query.trim() ? `“${query.trim()}”` : null,
  ].filter(Boolean).join(" · ");

  const filterControls = (compact = false) => (
    <div className={cn("space-y-4", compact && "space-y-5")}>
      <div className={cn("flex flex-wrap items-center gap-3", compact && "block space-y-5")}>
        <div className={cn("relative flex-1 min-w-[220px] max-w-sm", compact && "min-w-0 max-w-none")}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search treks, places…"
            aria-label="Search adventures"
            className="field-input pl-10"
          />
        </div>

        <div>
          {compact && <p className="meta-label mb-2">Location</p>}
          <div className="flex w-fit max-w-full rounded-full border border-border bg-card p-0.5" role="group" aria-label="Filter by location">
            {([['all', 'All'], ['outstation', 'Outstation'], ['hyderabad', 'Hyderabad']] as [Mode, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setParam("mode", key)}
                aria-pressed={mode === key}
                className={cn(
                  "min-h-[44px] px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-colors",
                  mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-3", compact && "block space-y-5")}>
        <div>
          {compact && <p className="meta-label mb-2">Activity</p>}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by activity">
            {ACTIVITIES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={activity === item.key}
                onClick={() => setParam("activity", activity === item.key ? null : item.key)}
                className={cn("filter-pill text-xs", activity === item.key ? "filter-pill-active" : "filter-pill-idle")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          {compact && <p className="meta-label mb-2">Duration</p>}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by duration">
            {DURATIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={duration === item.key}
                onClick={() => setParam("duration", duration === item.key ? null : item.key)}
                className={cn("filter-pill text-xs", duration === item.key ? "filter-pill-active" : "filter-pill-idle")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          {compact && <p className="meta-label mb-2">Difficulty</p>}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by difficulty">
            {DIFFICULTIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={difficulty === item}
                onClick={() => setParam("difficulty", difficulty === item ? null : item)}
                className={cn("filter-pill text-xs", difficulty === item ? "filter-pill-active" : "filter-pill-idle")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {activeFilterCount > 0 && !compact && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Clear filters ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section id="main-content" tabIndex={-1} className="pt-24 md:pt-28 pb-8 md:pb-10 bg-background outline-none">
        <div className="container">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
          </Link>
          <p className="kicker mt-6">{modeLabel}</p>
          <h1 className="editorial-title mt-3">
            {mode === "outstation" ? "Get away from it all" : mode === "hyderabad" ? "Trails near home" : "Find your adventure"}
          </h1>
          <p className="editorial-lead">
            Real dates, real prices, real seats. Filter by what matters — and book straight from the trail page.
          </p>
        </div>
      </section>

      {/* Mobile: compact controls stay sticky; the full filters live in a portal-backed dialog. */}
      <section className="sticky top-[61px] z-40 border-b border-border bg-background/95 backdrop-blur-md lg:hidden">
        <div className="container py-3">
          <div className="flex items-center gap-2">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <button type="button" className="btn-outline h-11 min-h-11 flex-1 px-4" aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="bottom-0 left-0 right-0 top-auto z-[101] max-h-[calc(100dvh-4rem)] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl border-x-0 border-b-0 p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:inline-flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button_svg]:h-5 [&>button_svg]:w-5">
                <DialogHeader className="border-b border-border px-5 pb-4 pt-6 text-left">
                  <DialogTitle className="font-display text-2xl font-bold text-primary">Filter adventures</DialogTitle>
                  <DialogDescription>Choose only what matters. Your selections stay in the page URL.</DialogDescription>
                </DialogHeader>
                <div className="px-5 py-5">{filterControls(true)}</div>
                <div className="sticky bottom-0 flex gap-3 border-t border-border bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearAll} className="btn-outline min-h-[44px] flex-1">
                      Clear all
                    </button>
                  )}
                  <DialogClose asChild>
                    <button type="button" className="btn-accent min-h-[44px] flex-1">
                      Show {visible.length} {visible.length === 1 ? "adventure" : "adventures"}
                    </button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            <label className="sr-only" htmlFor="mobile-adventure-sort">Sort adventures</label>
            <select
              id="mobile-adventure-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="field-input h-11 w-[46%] min-w-0 py-2 text-sm"
            >
              <option value="date">Soonest</option>
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          {activeFilterSummary && (
            <div className="mt-2 flex min-h-6 items-center justify-between gap-3">
              <p className="truncate text-xs text-muted-foreground" aria-live="polite">{activeFilterSummary}</p>
              <button type="button" onClick={clearAll} className="shrink-0 text-xs font-semibold text-accent hover:underline">
                Clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Desktop filter bar */}
      <section className="sticky top-[61px] z-40 hidden border-b border-border bg-background/95 backdrop-blur-md lg:block">
        <div className="container py-4">
          <div className="flex items-start justify-between gap-5">
            <div className="flex-1">{filterControls()}</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort adventures"
              className="field-input w-auto min-w-[170px] py-2"
            >
              <option value="date">Soonest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
      </section>

      <section className="pt-10 pb-20 md:pt-14 md:pb-24">
        <div className="container">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <Compass className="w-12 h-12 text-muted-foreground/50 mx-auto mb-5" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="font-display font-bold text-2xl text-primary">No adventures match your filters</h2>
              <p className="mt-3 text-muted-foreground">
                Try removing a filter or browse all current adventures.
              </p>
              <button type="button" onClick={clearAll} className="btn-accent mt-7">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4" role="status">
                <p className="font-display text-lg font-semibold text-primary">
                  {visible.length} adventure{visible.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeFilterSummary || "All current adventures"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9 lg:gap-x-8 lg:gap-y-12">
                {visible.map((a, i) => (
                  <div key={a.id} className="reveal" style={{ transitionDelay: `${(i % 6) * 50}ms` }}>
                    <AdventureCard adventure={a} priority={i < 3} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
