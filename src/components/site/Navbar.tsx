import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";

import logo from "@/assets/logo.png";

const links = [
  { label: "Home", href: "/#home", external: false },
  { label: "Upcoming Treks", href: "/upcoming-treks", external: true },
  { label: "Hyderabad Trails", href: "/hyderabad-trails", external: true },
  { label: "About Us", href: "/#about", external: false },
  { label: "The Trail Log", href: "/trail-log", external: true },
  { label: "Gallery", href: "/#gallery", external: false },
  { label: "Contact", href: "/#contact", external: false },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !isHome || scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        solid
          ? "bg-charcoal/90 backdrop-blur-md border-b border-accent/40 py-3"
          : "bg-transparent py-5"
      }`}
    >

      <div className="container flex items-center justify-between">
        <a href="#home" className="flex items-center gap-3 text-charcoal-foreground">
          <img
            src={logo}
            alt="E2 Trails logo"
            className="w-10 h-10 rounded-full bg-white object-contain p-0.5 shadow-card"
          />
          <span className="font-heading font-extrabold text-xl tracking-wide">
            E2 <span className="text-accent">TRAILS</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            l.external ? (
              <Link
                key={l.href}
                to={l.href}
                className="text-charcoal-foreground/90 hover:text-accent text-sm font-medium tracking-wide transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-accent after:transition-all hover:after:w-full"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                className="text-charcoal-foreground/90 hover:text-accent text-sm font-medium tracking-wide transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-accent after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            )
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <a
            href="tel:+916303682022"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-primary text-primary font-semibold text-sm hover:bg-primary hover:text-white transition-colors"
          >
            <Phone className="w-4 h-4" />
            +91 63036 82022
          </a>
        </div>

        <button
          aria-label="Toggle menu"
          className="lg:hidden text-charcoal-foreground p-2"
          onClick={() => setOpen(true)}
        >
          <Menu className="w-7 h-7" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-[80%] max-w-sm bg-charcoal text-charcoal-foreground p-8 animate-drawer-in flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <img src={logo} alt="E2 Trails logo" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
                <span className="font-heading font-extrabold text-xl">
                  E2 <span className="text-accent">TRAILS</span>
                </span>
              </div>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X className="w-7 h-7" />
              </button>
            </div>
            <nav className="flex flex-col gap-5">
              {links.map((l) => (
                l.external ? (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium hover:text-accent transition-colors"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium hover:text-accent transition-colors"
                  >
                    {l.label}
                  </a>
                )
              ))}
              <a
                href="tel:+916303682022"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex justify-center items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold"
              >
                <Phone className="w-4 h-4" />
                +91 63036 82022
              </a>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
