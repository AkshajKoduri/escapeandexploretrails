import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ahobilam from "@/assets/trek-ahobilam.jpg";
import bhongir from "@/assets/trek-bhongir.jpg";
import ananthagiri from "@/assets/trek-ananthagiri.jpg";
import koilkonda from "@/assets/trek-koilkonda.jpg";
import ethipothala from "@/assets/trek-ethipothala.jpg";
import medak from "@/assets/trek-medak.jpg";

type Difficulty = "Easy" | "Moderate" | "Hard";
type TrekCard = {
  name: string;
  img: string;
  diff: Difficulty;
  dur: string;
  dist: string;
  date?: string;
};

const staticTreks: TrekCard[] = [
  { name: "Ahobilam Trek", img: ahobilam, diff: "Hard", dur: "2 Days", dist: "350 km" },
  { name: "Bhongir Fort Sunrise", img: bhongir, diff: "Easy", dur: "1 Day", dist: "50 km" },
  { name: "Ananthagiri Night Camp", img: ananthagiri, diff: "Moderate", dur: "1 Night", dist: "85 km" },
  { name: "Koilkonda Fort Trail", img: koilkonda, diff: "Moderate", dur: "1 Day", dist: "120 km" },
  { name: "Ethipothala Falls Hike", img: ethipothala, diff: "Easy", dur: "1 Day", dist: "180 km" },
  { name: "Medak Fort Weekend", img: medak, diff: "Easy", dur: "1 Day", dist: "100 km" },
];

const fallbackImg = ahobilam;

const diffStyle: Record<Difficulty, { bg: string; label: string }> = {
  Easy: { bg: "bg-green-500/20 text-green-200", label: "🟢 Easy" },
  Moderate: { bg: "bg-gold/20 text-gold", label: "🟡 Moderate" },
  Hard: { bg: "bg-destructive/20 text-red-200", label: "🔴 Hard" },
};

export default function Treks() {
  const [dbTreks, setDbTreks] = useState<TrekCard[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("upcoming_treks")
        .select("*")
        .gte("trek_date", today)
        .order("trek_date", { ascending: true });
      if (data) {
        setDbTreks(
          data.map((t: any) => ({
            name: t.name,
            img: t.image_url || fallbackImg,
            diff: (t.difficulty as Difficulty) ?? "Easy",
            dur: t.duration ?? "",
            dist: t.distance ?? (t.location ?? ""),
            date: new Date(t.trek_date).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          })),
        );
      }
    })();
  }, []);

  const treks = [...dbTreks, ...staticTreks];

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

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {treks.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
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

              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${diffStyle[t.diff].bg}`}>
                  {diffStyle[t.diff].label}
                </span>
                {t.date && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-accent/30 text-charcoal-foreground">
                    📅 {t.date}
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-6 text-charcoal-foreground">
                <h3 className="font-heading font-bold text-2xl mb-2">{t.name}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-foreground/85 mb-5">
                  {t.dur && <span>⏱ {t.dur}</span>}
                  {t.dist && <span>📍 {t.dist}</span>}
                </div>
                <Link
                  to="/booking"
                  className="inline-flex items-center justify-center w-full px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-gold transition-colors"
                >
                  Book Now →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 text-center reveal">
          <Link
            to="/booking"
            className="inline-flex items-center px-10 py-4 rounded-full bg-primary text-primary-foreground font-semibold tracking-wide hover:bg-secondary transition-colors shadow-card"
          >
            Book Your Trek →
          </Link>
        </div>
      </div>
    </section>
  );
}
