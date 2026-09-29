import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, ShieldCheck, Users } from "lucide-react";
import hero from "@/assets/hero.webp";
import hero768 from "@/assets/hero-768.webp";
import hero1440 from "@/assets/hero-1440.webp";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_HERO_ALT } from "@/lib/homepage";

export default function Hero() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [customImage, setCustomImage] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from("site_settings")
        .select("hero_image_path, hero_alt_text").eq("id", "homepage").maybeSingle();
      if (cancelled || error || !data?.hero_image_path) return;
      const { data: image } = supabase.storage.from("trek-images").getPublicUrl(data.hero_image_path);
      setCustomImage({ url: image.publicUrl, alt: data.hero_alt_text?.trim() || "An E2 Trails adventure" });
    })().catch(() => { /* The bundled welcome image remains available offline. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const element = parallaxRef.current;
    if (!element || reducedMotion) {
      if (element) element.style.transform = "";
      return;
    }
    let frame = 0;
    const update = () => {
      element.style.transform = `translate3d(0, ${window.scrollY * 0.28}px, 0)`;
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <section id="main-content" tabIndex={-1} className="homepage-hero relative flex w-full overflow-hidden bg-charcoal outline-none">
      {/* Ken Burns + parallax */}
      <div
        ref={parallaxRef}
        className="absolute inset-0 will-change-transform"
      >
        <div className="h-full w-full animate-kenburns">
          <img
            src={customImage?.url || hero}
            srcSet={customImage ? undefined : `${hero768} 768w, ${hero1440} 1440w, ${hero} 1920w`}
            sizes="100vw"
            alt={customImage?.alt || DEFAULT_HERO_ALT}
            onError={customImage ? () => setCustomImage(null) : undefined}
            className="w-full h-full object-cover object-[58%_center] sm:object-center"
            width={1920}
            height={1080}
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>
      <div className="absolute inset-0 homepage-hero-shade" aria-hidden="true" />

      <div className="homepage-hero-content relative z-10 container flex flex-1 flex-col justify-end pb-20 sm:pb-28 md:pb-32 text-charcoal-foreground">
        <div className="max-w-[46rem]">
          <p className="kicker text-charcoal-foreground before:bg-accent before:opacity-100 text-shadow-strong reveal">
            Escape &amp; Explore · Hyderabad
          </p>

          <h1 className="font-display font-bold text-[clamp(2.25rem,10.5vw,3rem)] sm:text-6xl md:text-7xl leading-[1.01] mt-5 text-shadow-strong text-balance reveal">
            Where every trail
            <br />
            <span className="font-script text-gold">tells a story.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base md:text-lg text-charcoal-foreground/85 leading-relaxed reveal">
            Guided hikes, cycling experiences and weekend escapes from Hyderabad — clear plans,
            safe leadership and a community that welcomes first-timers.
          </p>

          <div className="mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3 reveal">
            <Link to="/adventures" className="btn-accent">
              Explore adventures
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href="#featured" className="btn-ghost-light">
              See the next departure
            </a>
          </div>

          <div className="mt-7 sm:mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-charcoal-foreground/75">
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
        className="absolute bottom-4 left-1/2 z-10 grid h-11 w-11 -translate-x-1/2 place-items-center text-charcoal-foreground/70 animate-bounce-arrow sm:bottom-6"
      >
        <ChevronDown className="w-6 h-6" aria-hidden="true" />
      </a>
    </section>
  );
}
