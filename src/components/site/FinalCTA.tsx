import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import hero from "@/assets/hero.webp";
import hero768 from "@/assets/hero-768.webp";
import hero1440 from "@/assets/hero-1440.webp";

export default function FinalCTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-charcoal py-16 md:py-20 lg:py-24">
      <img
        src={hero}
        srcSet={`${hero768} 768w, ${hero1440} 1440w, ${hero} 1920w`}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/40" aria-hidden="true" />

      <div className="container relative grid items-end gap-8 text-charcoal-foreground lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="kicker kicker-light">Your move</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-[1.02] text-balance text-shadow-strong sm:text-5xl md:text-6xl">
            The next trail
            <span className="font-script text-gold"> is waiting.</span>
          </h2>
        </div>
        <div>
          <p className="max-w-xl text-base leading-relaxed text-charcoal-foreground/80 md:text-lg">
            Choose an adventure, or tell us what kind of escape you have in mind. We usually reply within 24 hours.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/adventures" className="btn-accent">
              Explore adventures
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="https://wa.me/916303682022" target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Ask us anything
            </a>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal-foreground/70">
            <a href="tel:+916303682022" className="link-on-dark inline-flex min-h-11 items-center gap-2">
              <Phone className="h-4 w-4 text-accent-light" aria-hidden="true" />
              +91 63036 82022
            </a>
            <a href="mailto:hello@e2trails.in" className="link-on-dark inline-flex min-h-11 items-center gap-2">
              <Mail className="h-4 w-4 text-accent-light" aria-hidden="true" />
              hello@e2trails.in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
