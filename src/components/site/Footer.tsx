import { Link } from "react-router-dom";
import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-charcoal-foreground relative">
      <div className="container py-16 md:py-20 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="E2 Trails logo" className="w-10 h-10 rounded-full bg-white object-contain p-0.5" />
            <span className="font-display font-bold text-lg">
              E2 <span className="text-accent">TRAILS</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-charcoal-foreground/65 leading-relaxed max-w-xs">
            Curating safe, soulful adventures across India — hikes, rides and trails where every
            summit is a new story.
          </p>
          <p className="mt-4 font-script text-gold">"Every summit, a new story."</p>
        </div>

        {/* Adventures */}
        <nav aria-label="Adventures">
          <h4 className="font-display font-bold text-sm uppercase tracking-[0.18em] mb-4">Adventures</h4>
          <ul className="space-y-2.5 text-sm text-charcoal-foreground/65">
            <li><Link to="/adventures" className="hover:text-accent transition-colors">All Adventures</Link></li>
            <li><Link to="/upcoming-treks" className="hover:text-accent transition-colors">Outstation Treks</Link></li>
            <li><Link to="/hyderabad-trails" className="hover:text-accent transition-colors">Hyderabad Trails</Link></li>
            <li><Link to="/booking" className="hover:text-accent transition-colors">Book a Trip</Link></li>
          </ul>
        </nav>

        {/* Company */}
        <nav aria-label="Company">
          <h4 className="font-display font-bold text-sm uppercase tracking-[0.18em] mb-4">Company</h4>
          <ul className="space-y-2.5 text-sm text-charcoal-foreground/65">
            <li><a href="/#story" className="hover:text-accent transition-colors">Our Story</a></li>
            <li><a href="/trail-log" className="hover:text-accent transition-colors">Trail Journal</a></li>
            <li><a href="/#gallery" className="hover:text-accent transition-colors">Life Out There</a></li>
            <li><a href="/#contact" className="hover:text-accent transition-colors">Contact</a></li>
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <h4 className="font-display font-bold text-sm uppercase tracking-[0.18em] mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-charcoal-foreground/65">
            <li>
              <a href="mailto:hello@e2trails.in" className="inline-flex items-center gap-2.5 hover:text-accent transition-colors">
                <Mail className="w-4 h-4 text-accent" aria-hidden="true" /> hello@e2trails.in
              </a>
            </li>
            <li>
              <a href="tel:+916303682022" className="inline-flex items-center gap-2.5 hover:text-accent transition-colors">
                <Phone className="w-4 h-4 text-accent" aria-hidden="true" /> +91 63036 82022
              </a>
            </li>
            <li className="inline-flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-accent" aria-hidden="true" /> Hyderabad, India
            </li>
            <li>
              <a
                href="https://instagram.com/e2trails.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 hover:text-accent transition-colors"
              >
                <Instagram className="w-4 h-4 text-accent" aria-hidden="true" /> @e2trails.in
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-charcoal-foreground/10 py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-charcoal-foreground/50">
          <p>© {new Date().getFullYear()} E2 Trails. All rights reserved.</p>
          <p>Made with <span className="text-accent">🧡</span> in Hyderabad</p>
        </div>
      </div>
    </footer>
  );
}