import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, ShieldCheck, Users } from "lucide-react";
import hero from "@/assets/hero.webp";

export default function Hero() {
  const [offset, setOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => setOffset(window.scrollY * 0.28);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  return (
    <section id="home" className="relative h-[94vh] min-h-[620px] w-full overflow-hidden bg-charcoal">
      {/* Ken Burns + parallax */}
      <div
        className="absolute inset-0 will-change-transform animate-kenburns"
        style={{ transform: reducedMotion ? undefined : `translate3d(0, ${offset}px, 0)` }}
      >
        <img
          src={hero}
          alt="Golden-hour view across a South Indian fort hilltop"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />

      <div className="relative z-10 h-full container flex flex-col justify-end pb-28 md:pb-32 text-charcoal-foreground">
        <div className="max-w-3xl">
          <p className="kicker kicker-light reveal">
            Escape &amp; Explore · Hyderabad
          </p>

          <h1 className="font-display font-bold text-[2.9rem] sm:text-6xl md:text-7xl leading-[1.02] mt-5 text-shadow-strong text-balance reveal">
            Where every trail
            <br />
            <span className="font-script text-gold">tells a story.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base md:text-lg text-charcoal-foreground/85 leading-relaxed reveal">
            Find your next adventure. Explore hikes, cycling experiences, trails and weekend
            escapes curated by E2 Trails — guided, safe and built around real people.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 reveal">
            <Link to="/adventures" className="btn-accent">
              Explore adventures
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href="#featured" className="btn-ghost-light">
              See the next departure
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-charcoal-foreground/70">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold" aria-hidden="true" />
              Safety-first guided outings
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-gold" aria-hidden="true" />
              Small-group adventures
            </span>
          </div>
        </div>
      </div>

      <a
        href="#featured"
        aria-label="Scroll to the next departure"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-charcoal-foreground/70 animate-bounce-arrow"
      >
        <ChevronDown className="w-6 h-6" />
      </a>
    </section>
  );
}