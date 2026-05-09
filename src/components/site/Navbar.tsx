import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { label: "Home", href: "/#home", external: false },
  { label: "Upcoming Treks", href: "/#treks", external: false },
  { label: "About Us", href: "/#about", external: false },
  { label: "Past Trips", href: "/past-trips", external: true },
  { label: "Gallery", href: "/#gallery", external: false },
  { label: "Contact", href: "/#contact", external: false },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = () => supabase.auth.signOut();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-charcoal/80 backdrop-blur-md border-b border-accent/40 py-3"
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
            <a
              key={l.href}
              href={l.href}
              className="text-charcoal-foreground/90 hover:text-accent text-sm font-medium tracking-wide transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-accent after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-charcoal-foreground/90 hover:text-accent text-sm font-medium transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          ) : (
            <Link to="/auth" className="text-charcoal-foreground/90 hover:text-accent text-sm font-medium transition">
              Log in
            </Link>
          )}
          <Link
            to="/booking"
            className="inline-flex items-center px-6 py-2.5 rounded-full bg-gradient-orange text-accent-foreground font-semibold text-sm shadow-glow hover:scale-105 transition-transform"
          >
            Book a Trek
          </Link>
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
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium hover:text-accent transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/booking"
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex justify-center px-6 py-3 rounded-full bg-gradient-orange text-accent-foreground font-semibold"
              >
                Book a Trek
              </Link>
              {user ? (
                <button
                  onClick={() => { setOpen(false); signOut(); }}
                  className="inline-flex justify-center px-6 py-3 rounded-full border border-accent/40 text-charcoal-foreground"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="inline-flex justify-center px-6 py-3 rounded-full border border-accent/40 text-charcoal-foreground"
                >
                  Log in
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
