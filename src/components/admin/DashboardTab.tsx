import { useMemo } from "react";
import { Mountain, Users, Armchair, CalendarCheck, PhoneCall, Wallet, ArrowRight } from "lucide-react";
import type { Trek, SeatStats, Booking } from "@/lib/admin";
import { seatStatus, STATUS_CHIP, isPastTrip, trekDates } from "@/lib/admin";
import { fmtDate } from "@/lib/treks";
import { cn } from "@/lib/utils";

type Props = {
  treks: Trek[];
  stats: Map<string, SeatStats>;
  bookings: Booking[];
  callbacks: { id: string; status: string }[];
  onNavigate: (m: "trips" | "bookings" | "callbacks") => void;
};

export default function DashboardTab({ treks, stats, bookings, callbacks, onNavigate }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      treks.filter((t) => {
        if (t.is_archived || t.is_draft) return false;
        const dates = trekDates(t);
        if (!dates.length) return true;
        return dates.some((d) => d >= today);
      }),
    [treks, today],
  );

  const upcomingIds = useMemo(() => new Set(upcoming.map((t) => t.id)), [upcoming]);

  const confirmedExplorers = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== "cancelled" && upcomingIds.has(b.trek_id))
        .reduce((sum, b) => sum + (Number(b.seats_booked) || 1), 0),
    [bookings, upcomingIds],
  );

  const openSeats = useMemo(
    () => upcoming.reduce((sum, t) => sum + (stats.get(t.id)?.seats_remaining ?? t.max_seats ?? 0), 0),
    [upcoming, stats],
  );

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && upcomingIds.has(b.trek_id)).length,
    [bookings, upcomingIds],
  );

  const pendingPayments = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && (b.payment_status ?? "pending") !== "paid").length,
    [bookings],
  );

  const pendingCallbacks = useMemo(() => callbacks.filter((c) => c.status !== "contacted").length, [callbacks]);

  const metrics = [
    { icon: Mountain, label: "Upcoming trips", value: upcoming.length, onClick: () => onNavigate("trips") },
    { icon: Users, label: "Confirmed explorers", value: confirmedExplorers, onClick: () => onNavigate("bookings") },
    { icon: Armchair, label: "Open seats", value: openSeats, onClick: () => onNavigate("trips") },
    { icon: CalendarCheck, label: "Upcoming bookings", value: upcomingBookings, onClick: () => onNavigate("bookings") },
    { icon: Wallet, label: "Payments pending", value: pendingPayments, onClick: () => onNavigate("bookings") },
    { icon: PhoneCall, label: "Callbacks to make", value: pendingCallbacks, onClick: () => onNavigate("callbacks") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Operations overview</p>
        <h1 className="font-display font-bold text-3xl text-primary mt-2">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          All numbers below are computed live from your bookings and trips — nothing is hard-coded.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.label}
              type="button"
              onClick={m.onClick}
              className="surface rounded-xl p-5 text-left card-hover"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} aria-hidden="true" />
                <ArrowRight className="w-4 h-4 text-muted-foreground/50" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display font-bold text-3xl text-primary">{m.value.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{m.label}</p>
            </button>
          );
        })}
      </div>

      {/* Upcoming trips */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold text-lg text-primary">Upcoming trips</h2>
          <button type="button" onClick={() => onNavigate("trips")} className="text-xs font-semibold text-accent hover:underline">
            Manage trips →
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No upcoming trips yet — create one to get started.</p>
        ) : (
          <ul className="divide-y divide-border">
            {upcoming.slice(0, 6).map((t) => {
              const s = stats.get(t.id);
              const taken = s?.seats_taken ?? 0;
              const max = t.max_seats || 1;
              const pct = Math.min(100, Math.round((taken / max) * 100));
              const status = isPastTrip(t) ? "COMPLETED" : seatStatus(t, taken);
              return (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trekDates(t)[0] ? fmtDate(trekDates(t)[0]) : "No date"} · {t.difficulty}
                      </p>
                    </div>
                    <span className={cn("pill", STATUS_CHIP[status])}>{status}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-gold" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${taken} of ${max} seats booked`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {taken}/{max} seats
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: treat every explorer's data as sensitive. Aadhaar numbers are masked by default in the
        Bookings section.
      </p>
    </div>
  );
}