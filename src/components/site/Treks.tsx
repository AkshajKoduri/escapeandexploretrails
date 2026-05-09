import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ahobilam from "@/assets/trek-ahobilam.jpg";

type Difficulty = "Easy" | "Moderate" | "Hard";
type TrekCard = {
  id: string;
  name: string;
  destination: string | null;
  img: string;
  diff: Difficulty;
  dur: string;
  dist: string;
  price: number;
  date: string;
  trekTime: string | null;
  seatsRemaining: number;
  maxSeats: number;
  isFull: boolean;
};

const fallbackImg = ahobilam;

const diffStyle: Record<Difficulty, { bg: string; label: string }> = {
  Easy: { bg: "bg-green-500/20 text-green-200", label: "🟢 Easy" },
  Moderate: { bg: "bg-gold/20 text-gold", label: "🟡 Moderate" },
  Hard: { bg: "bg-destructive/20 text-red-200", label: "🔴 Hard" },
};

export default function Treks() {
  const [treks, setTreks] = useState<TrekCard[]>([]);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: trekData }, { data: stats }] = await Promise.all([
      supabase
        .from("upcoming_treks")
        .select("*")
        .eq("is_archived", false)
        .gte("trek_date", today)
        .order("trek_date", { ascending: true }),
      supabase.rpc("get_trek_seat_stats"),
    ]);

    const statsMap = new Map<string, { seats_remaining: number; max_seats: number }>();
    (stats ?? []).forEach((s: any) => statsMap.set(s.trek_id, s));

    setTreks(
      (trekData ?? []).map((t: any) => {
        const s = statsMap.get(t.id);
        const remaining = s?.seats_remaining ?? t.max_seats ?? 0;
        return {
          id: t.id,
          name: t.name,
          destination: t.destination,
          img: t.image_url || fallbackImg,
          diff: (t.difficulty as Difficulty) ?? "Easy",
          dur: t.duration ?? "",
          dist: t.distance ?? t.location ?? "",
          price: Number(t.price ?? 0),
          date: new Date(t.trek_date).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          trekTime: t.trek_time,
          seatsRemaining: remaining,
          maxSeats: s?.max_seats ?? t.max_seats ?? 0,
          isFull: remaining <= 0,
        };
      }),
    );
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("treks-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_treks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <section id="treks" className="py-24 md:py-32 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto reveal">
          <span className="font-script text-accent text-xl">— Upcoming treks</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Your Next Adventure Awaits
          </h2>
          <p className="mt-4 text-muted-foreground">
            Handpicked weekend escapes across the Deccan — book your spot before they sell out.
          </p>
        </div>

        {treks.length === 0 ? (
          <p className="mt-14 text-center text-muted-foreground">
            No upcoming treks right now — check back soon!
          </p>
        ) : (
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {treks.map((t, i) => (
              <article
                key={t.id}
                className="reveal group relative overflow-hidden rounded-2xl shadow-card aspect-[4/5] bg-charcoal cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-trail"
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              >
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-card" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/40 transition-colors duration-500" />

                <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${diffStyle[t.diff].bg}`}>
                    {diffStyle[t.diff].label}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-accent/30 text-charcoal-foreground">
                    📅 {t.date}
                  </span>
                  {t.isFull ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-destructive/80 text-destructive-foreground ml-auto">
                      Trip Full
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-green-600/80 text-white ml-auto">
                      {t.seatsRemaining} seats left
                    </span>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6 text-charcoal-foreground">
                  <h3 className="font-heading font-bold text-2xl mb-2">{t.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-foreground/85 mb-3">
                    {t.dur && <span>⏱ {t.dur}</span>}
                    {t.trekTime && <span>🕒 {t.trekTime}</span>}
                    {t.dist && <span>📍 {t.dist}</span>}
                  </div>
                  {t.price > 0 && (
                    <div className="text-lg font-bold text-accent mb-4">₹{t.price.toLocaleString("en-IN")}<span className="text-xs text-charcoal-foreground/70 font-normal"> / person</span></div>
                  )}
                  {t.isFull ? (
                    <button
                      disabled
                      className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-full bg-muted text-muted-foreground text-sm font-semibold cursor-not-allowed"
                    >
                      Sold Out
                    </button>
                  ) : (
                    <Link
                      to={`/booking?trek=${t.id}`}
                      className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-gold transition-colors"
                    >
                      Book Now →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-14 text-center reveal">
          <Link
            to="/past-trips"
            className="inline-flex items-center px-10 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide hover:bg-secondary transition-colors shadow-card"
          >
            View Past Trips →
          </Link>
        </div>
      </div>
    </section>
  );
}
