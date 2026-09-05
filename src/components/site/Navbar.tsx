import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const ADVENTURE_LINKS = [
  { label: "All Adventures", href: "/adventures", note: "Browse every trail" },
  { label: "Outstation Treks", href: "/upcoming-treks", note: "Weekends away from the city" },
  { label: "Hyderabad Trails", href: "/hyderabad-trails", note: "Hikes & rides near home" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [adventuresOpen, setAdventuresOpen] = useState(false);
  const adventuresRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  // Mobile drawer: Escape closes it, background scroll is locked while open,
  // and focus moves into the panel so keyboard users don't tab behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (adventuresRef.current && !adventuresRef.current.contains(e.target as Node)) {
        setAdventuresOpen(false);
      }
    };
    if (adventuresOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [adventuresOpen]);

  // Close the mobile menu on navigation
  useEffect(() => setOpen(false), [pathname]);

  const solid = !isHome || scrolled || open;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        solid
          ? "bg-charcoal/95 backdrop-blur-md border-b border-charcoal-foreground/10 py-3"
          : "bg-gradient-to-b from-charcoal/50 to-transparent py-5",
      )}
    >
      <div className="container flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 text-charcoal-foreground" aria-label="E2 Trails home">
          <img
            src={logo}
            alt="E2 Trails logo"
            className="w-9 h-9 rounded-full bg-white object-contain p-0.5 shadow-card"
          />
          <span className="font-display font-bold text-lg tracking-wide leading-none">
            E2 <span className="text-accent">TRAILS</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          <div ref={adventuresRef} className="relative">
            <button
              type="button"
              aria-expanded={adventuresOpen}
              aria-haspopup="menu"
              onClick={() => setAdventuresOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-foreground/90 hover:text-accent transition-colors min-h-[44px]"
            >
              Adventures
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", adventuresOpen && "rotate-180")} aria-hidden="true" />
            </button>
            <div
              role="menu"
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl border border-charcoal-foreground/10 bg-charcoal text-charcoal-foreground shadow-trail overflow-hidden transition-all duration-200",
                adventuresOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1 pointer-events-none",
              )}
            >
              {ADVENTURE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  role="menuitem"
                  onClick={() => setAdventuresOpen(false)}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-charcoal-foreground/10 transition-colors group"
                >
                  <span>
                    <span className="block text-sm font-semibold">{l.label}</span>
                    <span className="block text-xs text-charcoal-foreground/55 mt-0.5">{l.note}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-accent opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <Link to="/trail-log" className="text-sm font-medium text-charcoal-foreground/90 hover:text-accent transition-colors min-h-[44px] inline-flex items-center">
            Trail Journal
          </Link>
          <a href="/#story" className="text-sm font-medium text-charcoal-foreground/90 hover:text-accent transition-colors min-h-[44px] inline-flex items-center">
            About
          </a>
          <a href="/#contact" className="text-sm font-medium text-charcoal-foreground/90 hover:text-accent transition-colors min-h-[44px] inline-flex items-center">
            Contact
          </a>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="tel:+916303682022"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-semibold text-charcoal-foreground/90 hover:text-accent transition-colors"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            +91 63036 82022
          </a>
          <Link to="/adventures" className="btn-accent btn-sm">
            Book a trip
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          className="lg:hidden text-charcoal-foreground p-2 -mr-2"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
            className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-charcoal text-charcoal-foreground p-7 animate-drawer-in flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <img src={logo} alt="E2 Trails logo" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
                <span className="font-display font-bold text-lg">
                  E2 <span className="text-accent">TRAILS</span>
                </span>
              </div>
              <button ref={closeBtnRef} type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="meta-label text-charcoal-foreground/50 mb-3">Adventures</p>
            <nav className="flex flex-col" aria-label="Mobile">
              {ADVENTURE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 flex items-center justify-between border-b border-charcoal-foreground/10"
                >
                  <span>
                    <span className="block text-lg font-medium">{l.label}</span>
                    <span className="block text-xs text-charcoal-foreground/55 mt-0.5">{l.note}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-accent" aria-hidden="true" />
                </Link>
              ))}

              <p className="meta-label text-charcoal-foreground/50 mt-8 mb-3">Explore</p>
              {[
                { label: "Trail Journal", to: "/trail-log" },
                { label: "About E2 Trails", href: "/#story" },
                { label: "Contact", href: "/#contact" },
              ].map((l) =>
                "to" in l ? (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="py-3 text-lg font-medium hover:text-accent transition-colors border-b border-charcoal-foreground/10"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="py-3 text-lg font-medium hover:text-accent transition-colors border-b border-charcoal-foreground/10"
                  >
                    {l.label}
                  </a>
                ),
              )}
            </nav>

            <div className="mt-auto pt-8 space-y-3">
              <Link to="/adventures" onClick={() => setOpen(false)} className="btn-accent w-full">
                Book a trip
              </Link>
              <a
                href="tel:+916303682022"
                onClick={() => setOpen(false)}
                className="btn-ghost-light w-full"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                +91 63036 82022
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}