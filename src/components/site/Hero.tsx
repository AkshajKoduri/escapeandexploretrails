import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import hero from "@/assets/hero.jpg";

function ExploreAdventuresDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="px-8 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold tracking-wide shadow-glow hover:scale-105 transition-transform inline-flex items-center justify-center gap-2"
      >
        Explore Adventures
        <span className={cn("text-sm transition-transform duration-200", open && "rotate-180")}>▾</span>
      </button>
      <div
        role="menu"
        className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 mt-3 min-w-[14rem] rounded-xl border border-white/10 bg-charcoal/95 backdrop-blur-md text-charcoal-foreground shadow-card overflow-hidden transition-all duration-200 z-50",
          open ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
        )}
      >
        <Link
          to="/hyderabad-trails"
          role="menuitem"
          className="flex items-center min-h-[44px] px-5 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setOpen(false)}
        >
          Hyderabad Trails
        </Link>
        <div className="h-px bg-white/10" />
        <Link
          to="/upcoming-treks"
          role="menuitem"
          className="flex items-center min-h-[44px] px-5 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setOpen(false)}
        >
          Outstation Treks
        </Link>
      </div>
    </div>
  );
}


const FULL = "Where Every Trail Tells a Story";

export default function Hero() {
  const [typed, setTyped] = useState("");
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
    if (reducedMotion) {
      setTyped(FULL);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(FULL.slice(0, i));
      if (i >= FULL.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => setOffset(window.scrollY * 0.4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  const bgTransform = reducedMotion
    ? "scale(1.1)"
    : `translate3d(0, ${offset}px, 0) scale(1.1)`;

  return (
    <section id="home" className="relative h-screen min-h-[640px] w-full overflow-hidden">
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: bgTransform }}
      >
        <img src={hero} alt="South Indian fort hilltop at golden hour" className="w-full h-full object-cover" width={1920} height={1080} />
      </div>
      <div className="absolute inset-0 bg-gradient-hero" />

      <div className="relative z-10 h-full container flex flex-col items-center justify-center text-center text-charcoal-foreground">
        <h1 className="sr-only">
          E2 Trails — Guided Treks, Hikes &amp; Cycling Rides from Hyderabad and Across India
        </h1>
        <div
          aria-hidden="true"
          className="font-heading font-black text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.05] max-w-5xl text-shadow-strong"
        >
          {typed}
          {!reducedMotion && <span className="caret text-accent">|</span>}
        </div>

        <p className="mt-8 max-w-2xl text-base md:text-lg text-charcoal-foreground/90 reveal text-shadow-strong">
          Hikes, cycling, bike rides and seasonal treks — where every trail comes with memorable moments and new friendships.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 reveal">
          <ExploreAdventuresDropdown />
          <a
            href="#about"
            className="px-8 py-4 rounded-full border-2 border-charcoal-foreground/80 text-charcoal-foreground font-semibold tracking-wide hover:bg-charcoal-foreground hover:text-charcoal transition-colors"
          >
            Who We Are
          </a>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-charcoal-foreground/80 animate-bounce-arrow"
      >
        <ChevronDown className="w-8 h-8" />
      </a>
    </section>
  );
}
