import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import hero from "@/assets/hero.webp";

export default function FinalCTA() {
  return (
    <section className="relative py-28 md:py-40 overflow-hidden bg-charcoal">
      <img
        src={hero}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/40" aria-hidden="true" />

      <div className="container relative text-center text-charcoal-foreground max-w-3xl">
        <p className="kicker kicker-light justify-center">Your move</p>
        <h2 className="font-display font-bold text-4xl sm:text-5xl md:text-7xl leading-[1.02] mt-4 text-balance text-shadow-strong">
          The next trail
          <br />
          <span className="font-script text-gold">is waiting.</span>
        </h2>
        <p className="mt-6 text-base md:text-lg text-charcoal-foreground/80 max-w-xl mx-auto">
          One weekend. One decision. A whole story you'll be telling for years.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/adventures" className="btn-accent">
            Explore adventures
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <a href="https://wa.me/916303682022" target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
            Ask us anything
          </a>
        </div>
      </div>
    </section>
  );
}