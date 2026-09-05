import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Adventure } from "@/lib/treks";
import { fetchAdventures, hasValue, inr } from "@/lib/treks";
import BookingForm from "@/components/booking/BookingForm";
import logo from "@/assets/logo.png";

export default function BookingPage() {
  const [params] = useSearchParams();
  const urlTrek = params.get("trek") ?? "";
  const urlDate = params.get("date") ?? "";
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [trekId, setTrekId] = useState<string>(urlTrek);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    document.title = "Book a Trek — E2 Trails";
    let cancelled = false;
    fetchAdventures().then((all) => {
      if (cancelled) return;
      setAdventures(all);
      // Fall back to the first open adventure if the deep link no longer exists.
      if (urlTrek && !all.some((a) => a.id === urlTrek)) setTrekId(all[0]?.id ?? "");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => adventures.find((a) => a.id === trekId), [adventures, trekId]);
  const makeAnotherBooking = () => setResetSignal((n) => n + 1);

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails" className="w-8 h-8 rounded-full bg-white object-contain p-0.5" />
            <span className="font-display font-bold text-base text-primary">E2 TRAILS</span>
          </Link>
          <Link
            to="/adventures"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All adventures
          </Link>
        </div>
      </header>

      <div className="container py-10 md:py-14 max-w-6xl">
        <div className="max-w-2xl">
          <p className="kicker">Reserve your spot</p>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl mt-3 text-primary">
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
          {adventures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No adventures are open for booking right now. Check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
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
                      "text-left rounded-xl border p-4 transition-colors min-h-[44px]",
                      trekId === a.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-card hover:border-accent/50",
                      full && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-primary leading-snug">{a.name}</span>
                      {full && <span className="pill bg-destructive/10 text-destructive shrink-0">Full</span>}
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
