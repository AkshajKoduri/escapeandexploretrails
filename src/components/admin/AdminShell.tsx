import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Mountain,
  Users,
  PhoneCall,
  BookOpen,
  Image,
  Users2,
  FileEdit,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, type AdminModule } from "@/lib/admin";
import { clearAdminPassword } from "@/lib/adminApi";
import logo from "@/assets/logo.png";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Mountain,
  Users,
  PhoneCall,
  BookOpen,
  Image,
  Users2,
  FileEdit,
};

export default function AdminShell({
  module,
  onNavigate,
  children,
}: {
  module: AdminModule;
  onNavigate: (m: AdminModule) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavItems = (
    <>
      {ADMIN_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = module === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "w-full flex items-center gap-3 min-h-[44px] px-4 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-accent/15 text-accent"
                : "text-charcoal-foreground/70 hover:bg-charcoal-foreground/10 hover:text-charcoal-foreground",
            )}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {item.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-muted/40 lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col bg-charcoal text-charcoal-foreground sticky top-0 h-screen p-5">
        <Link to="/" className="flex items-center gap-3 px-2 py-2">
          <img src={logo} alt="E2 Trails logo" className="w-9 h-9 rounded-full bg-white object-contain p-0.5" />
          <div>
            <p className="font-display font-bold leading-none">E2 TRAILS</p>
            <p className="text-[11px] text-charcoal-foreground/50 mt-1">Operations</p>
          </div>
        </Link>
        <nav className="mt-8 space-y-1 flex-1" aria-label="Admin">
          {NavItems}
        </nav>
        <div className="space-y-1 pt-4 border-t border-charcoal-foreground/10">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 min-h-[44px] px-4 rounded-lg text-sm font-medium text-charcoal-foreground/70 hover:bg-charcoal-foreground/10 hover:text-charcoal-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" /> View live site
          </a>
          <button
            type="button"
            onClick={() => { clearAdminPassword(); window.location.href = "/"; }}
            className="w-full flex items-center gap-3 min-h-[44px] px-4 rounded-lg text-sm font-medium text-charcoal-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-charcoal text-charcoal-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="E2 Trails logo" className="w-8 h-8 rounded-full bg-white object-contain p-0.5" />
            <span className="font-display font-bold text-sm">E2 TRAILS · Admin</span>
          </Link>
          <button type="button" aria-label="Toggle admin menu" onClick={() => setMobileOpen((v) => !v)} className="p-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="px-4 pb-4 space-y-1" aria-label="Admin">
            {NavItems}
          </nav>
        )}
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6 md:py-10">
        <div className="max-w-6xl mx-auto">{children}</div>
      </div>
    </div>
  );
}