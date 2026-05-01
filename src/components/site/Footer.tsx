import { Instagram } from "lucide-react";
import logo from "@/assets/logo.png";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import g7 from "@/assets/gallery-7.jpg";

const thumbs = [g1, g2, g3, g4, g5, g7];
const links = [
  { label: "Home", href: "#home" },
  { label: "Upcoming Treks", href: "#treks" },
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
            Curating safe, soulful adventures across Telangana &amp; Andhra Pradesh — one trail at a time.
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
          © 2025 E2 Trails. All rights reserved. | Made with <span className="text-accent">🧡</span> in Hyderabad
        </div>
      </div>
    </footer>
  );
}
