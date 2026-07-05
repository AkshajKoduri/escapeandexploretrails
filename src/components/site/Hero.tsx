import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import hero from "@/assets/hero.jpg";

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
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-charcoal-foreground/30 bg-black/20 backdrop-blur-sm text-xs md:text-sm tracking-[0.2em] uppercase mb-6 reveal">
          🥾 BASED IN HYDERABAD · EXPLORING INDIA!
        </span>

        <h1 className="sr-only">Where Every Trail Tells a Story</h1>

        <h1 aria-hidden="true" className="font-heading font-black text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.05] max-w-5xl text-shadow-strong">
          {typed}
          {!reducedMotion && <span className="caret text-accent">|</span>}
        </h1>

        <p className="mt-8 max-w-2xl text-base md:text-lg text-charcoal-foreground/90 reveal text-shadow-strong">
          Weekend hikes, cycling rides and seasonal treks — where every trail comes with memorable moments and new friendships.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 reveal">
          <a
            href="#treks"
            className="px-8 py-4 rounded-full bg-gradient-orange text-accent-foreground font-semibold tracking-wide shadow-glow hover:scale-105 transition-transform"
          >
            Explore Upcoming Treks
          </a>
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
