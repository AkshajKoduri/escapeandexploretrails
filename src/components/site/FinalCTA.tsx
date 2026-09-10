import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export default function FinalCTA() {
  return (
    <section id="contact" className="border-y border-charcoal-foreground/10 bg-primary py-7 text-primary-foreground sm:py-10 md:py-20">
      <div className="container grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.75rem] font-bold leading-tight text-balance sm:text-3xl md:text-4xl">
            Ready for the next trail?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-primary-foreground/80 md:text-lg">
            Explore upcoming adventures or message us on WhatsApp.
          </p>
        </div>
        <div className="flex gap-3 md:shrink-0">
          <Link to="/adventures" className="btn-accent min-w-0 flex-1 whitespace-nowrap px-2 text-xs tracking-normal sm:px-6 sm:text-sm sm:tracking-wide md:flex-none">
            Explore adventures
          </Link>
          <a
            href="https://wa.me/916303682022"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost-light min-w-0 flex-1 whitespace-nowrap px-2 text-xs tracking-normal sm:px-6 sm:text-sm sm:tracking-wide md:flex-none"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            WhatsApp us
          </a>
        </div>
      </div>
    </section>
  );
}
