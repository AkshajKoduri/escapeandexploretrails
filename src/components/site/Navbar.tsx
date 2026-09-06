import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  const adventuresBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAdventuresOpen(false);
      adventuresBtnRef.current?.focus();
    };
    if (adventuresOpen) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
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
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[120] -translate-y-24 rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary shadow-trail transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
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
              ref={adventuresBtnRef}
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

        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center -mr-2 rounded-full text-charcoal-foreground hover:bg-charcoal-foreground/10"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          </DialogPrimitive.Trigger>

          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-charcoal/70 backdrop-blur-sm lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                closeBtnRef.current?.focus();
              }}
              className="fixed inset-y-0 right-0 z-[101] flex h-[100dvh] w-[88vw] max-w-sm flex-col overflow-y-auto bg-charcoal px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-charcoal-foreground shadow-trail outline-none lg:hidden data-[state=open]:animate-drawer-in"
            >
              <DialogPrimitive.Description className="sr-only">
                Navigate E2 Trails adventures and contact options.
              </DialogPrimitive.Description>
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
                  <DialogPrimitive.Title className="font-display font-bold text-lg">
                    E2 <span className="text-accent">TRAILS</span>
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    aria-label="Close menu"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-charcoal-foreground/10"
                  >
                    <X className="w-6 h-6" aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              <p className="meta-label text-charcoal-foreground/50 mb-2">Adventures</p>
              <nav className="flex flex-col" aria-label="Mobile">
                {ADVENTURE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setOpen(false)}
                    className="min-h-[64px] py-3 flex items-center justify-between gap-4 border-b border-charcoal-foreground/10"
                  >
                    <span>
                      <span className="block text-lg font-medium">{l.label}</span>
                      <span className="block text-xs text-charcoal-foreground/55 mt-0.5">{l.note}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0 text-accent" aria-hidden="true" />
                  </Link>
                ))}

                <p className="meta-label text-charcoal-foreground/50 mt-7 mb-2">Explore</p>
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
                      className="min-h-[52px] py-3 text-lg font-medium hover:text-accent transition-colors border-b border-charcoal-foreground/10"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="min-h-[52px] py-3 text-lg font-medium hover:text-accent transition-colors border-b border-charcoal-foreground/10"
                    >
                      {l.label}
                    </a>
                  ),
                )}
              </nav>

              <div className="mt-auto pt-7 space-y-3">
                <Link to="/adventures" onClick={() => setOpen(false)} className="btn-accent w-full">
                  Book a trip
                </Link>
                <a href="tel:+916303682022" onClick={() => setOpen(false)} className="btn-ghost-light w-full">
                  <Phone className="w-4 h-4" aria-hidden="true" />
                  +91 63036 82022
                </a>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
