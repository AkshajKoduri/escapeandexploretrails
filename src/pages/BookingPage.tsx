import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Adventure } from "@/lib/treks";
import { fetchAdventures, hasValue, inr } from "@/lib/treks";
import BookingForm from "@/components/booking/BookingForm";
import { useSeo } from "@/hooks/useSeo";
import logo from "@/assets/logo-128.webp";

export default function BookingPage() {
  const [params] = useSearchParams();
  const urlTrek = params.get("trek") ?? "";
  const urlDate = params.get("date") ?? "";
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [trekId, setTrekId] = useState<string>(urlTrek);
  const [resetSignal, setResetSignal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Booking is a private utility flow: reachable, but never a search result.
  useSeo({
    title: "Book a Trek — E2 Trails",
    description:
      "Reserve your spot on an upcoming E2 Trails adventure. No online payment — our team calls you to confirm.",
    path: "/booking",
    noindex: true,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    fetchAdventures()
      .then((all) => {
        if (cancelled) return;
        setAdventures(all);
        // Fall back to the first open adventure if the deep link no longer exists.
        if (urlTrek && !all.some((a) => a.id === urlTrek)) setTrekId(all[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const selected = useMemo(() => adventures.find((a) => a.id === trekId), [adventures, trekId]);
  const makeAnotherBooking = () => setResetSignal((n) => n + 1);

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-50 -translate-y-24 rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary shadow-trail transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <div className="container flex items-center justify-between py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails" width={128} height={128} className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
            <span className="font-display font-bold text-base tracking-wide text-primary">E2 TRAILS</span>
          </Link>
          <Link
            to="/adventures"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All adventures
          </Link>
        </div>
      </header>

      <div id="main-content" tabIndex={-1} className="container max-w-6xl py-10 pb-20 md:py-14 md:pb-24 outline-none">
        <div className="max-w-2xl">
          <p className="kicker">Reserve your spot</p>
          <h1 className="editorial-title mt-3">
            Book your adventure
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Pick a date and tell us who's coming. No payment is taken online — our team reviews your
            booking and calls you to confirm.
          </p>
        </div>

        {/* 1. Choose adventure */}
        <section className="mt-10">
          <h2 className="font-display font-bold text-xl md:text-2xl text-primary mb-4">
            Choose your adventure
          </h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2" role="status" aria-live="polite" aria-label="Loading available adventures">
              {[0, 1].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-muted/70" />
              ))}
            </div>
          ) : loadFailed ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground" role="alert">
              <p>We couldn't load the available adventures. Please check your connection and try again.</p>
              <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="btn-outline btn-sm mt-4">Try again</button>
            </div>
          ) : adventures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No adventures are open for booking right now. Check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {adventures.map((a) => {
                const full = a.isFull || a.seatsRemaining <= 0;
                const price = a.startingPrice ?? (a.price > 0 ? a.price : null);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={trekId === a.id}
                    onClick={() => setTrekId(a.id)}
                    disabled={full}
                    className={cn(
                      "relative min-h-[124px] overflow-hidden rounded-xl border p-5 text-left transition-colors",
                      trekId === a.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent shadow-card"
                        : "border-border bg-card hover:border-accent/50 hover:bg-card/80",
                      full && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-primary leading-snug">{a.name}</span>
                      {full ? (
                        <span className="pill bg-destructive/10 text-destructive shrink-0">Full</span>
                      ) : trekId === a.id ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                        {a.destination || a.location || a.region || "Hyderabad"}
                      </span>
                      {hasValue(a.dur) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          {a.dur}
                        </span>
                      )}
                    </div>
                    {price != null && (
                      <p className="mt-2 text-sm font-bold text-gold-deep">{inr(price)} / person</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {!loading && adventures.length > 0 && !selected && (
          <section className="mt-10 border-y border-border py-7" aria-live="polite">
            <p className="meta-label">Next step</p>
            <h2 className="mt-2 font-display text-xl font-bold text-primary">Choose a trip to continue</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Select an adventure above to see its available dates, traveller details and booking summary.
            </p>
          </section>
        )}

        {/* 2. Booking form (shared with the trek page) */}
        {selected && (
          <section className="mt-12 border-t border-border pt-10 pb-24 lg:pb-0" aria-label="Booking details">
            <BookingForm
              key={selected.id}
              adventure={selected}
              initialDate={urlDate}
              variant="page"
              resetSignal={resetSignal}
              successActions={
                <>
                  <button type="button" onClick={makeAnotherBooking} className="btn-outline">
                    Make another booking
                  </button>
                  <Link to="/" className="btn-accent">
                    Return to homepage
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </>
              }
            />
          </section>
        )}
      </div>
    </main>
  );
}
