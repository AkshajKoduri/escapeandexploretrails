import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";

function ExploreAdventuresFooter() {
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
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-charcoal-foreground/70 hover:text-accent transition-colors inline-flex items-center gap-1"
      >
        Explore Adventures
        <span className={cn("text-xs transition-transform duration-200", open && "rotate-180")}>▾</span>
      </button>
      <div
        className={cn(
          "absolute top-full left-0 mt-2 min-w-[11rem] rounded-lg border border-white/10 bg-charcoal/95 backdrop-blur-md text-charcoal-foreground shadow-card overflow-hidden transition-all duration-200 z-50",
          open ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
        )}
      >
        <Link
          to="/hyderabad-trails"
          className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setOpen(false)}
        >
          Hyderabad Trails
        </Link>
        <Link
          to="/upcoming-treks"
          className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => setOpen(false)}
        >
          Outstation Treks
        </Link>
      </div>
    </div>
  );
}

const thumbs = [g1, g2, g3, g4, g5, g7];
const links = [
  { label: "Home", href: "#home" },
  { label: "Explore Adventures", href: "#", dropdown: true },
  { label: "About", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  return (
    <footer className="bg-charcoal text-charcoal-foreground relative">
      {/* Mountain silhouette */}
      <svg className="absolute top-0 left-0 w-full h-12 -translate-y-[99%] text-charcoal" viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,100 L0,60 L150,20 L280,75 L400,15 L560,70 L700,25 L860,65 L1000,30 L1200,55 L1200,100 Z" fill="currentColor" />
      </svg>

      <div className="container py-16 grid md:grid-cols-3 gap-12">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="E2 Trails logo" className="w-11 h-11 rounded-full bg-white object-contain p-0.5" />
            <span className="font-heading font-extrabold text-xl">
              E2 <span className="text-accent">TRAILS</span>
            </span>
          </div>
          <p className="mt-4 text-charcoal-foreground/70 leading-relaxed">
            Curating safe, soulful adventures across India — one trail at a time.
          </p>
          <p className="mt-4 font-script text-gold">"Every summit, a new story."</p>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4 uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-charcoal-foreground/70 hover:text-accent transition-colors">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-heading font-bold text-lg mb-4 uppercase tracking-wider flex items-center gap-2">
            <Instagram className="w-5 h-5 text-accent" /> Follow Us
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {thumbs.map((t, i) => (
              <a
                key={i}
                href="https://instagram.com/e2trails.in"
                target="_blank"
                rel="noreferrer"
                className="aspect-square overflow-hidden rounded-md group"
              >
                <img src={t} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-charcoal-foreground/10 py-6">
        <div className="container text-center text-sm text-charcoal-foreground/60">
          © 2026 E2 Trails. All rights reserved. | Made with <span className="text-accent">🧡</span> in Hyderabad
        </div>
      </div>
    </footer>
  );
}
