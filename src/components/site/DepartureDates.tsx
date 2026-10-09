import { fmtDate } from "@/lib/treks";
import SeatStatusBadge from "@/components/site/SeatStatusBadge";
import { departureStatus, publicDepartureDates, type SeatStatus } from "@/lib/departureStatus";

export default function DepartureDates({ adventure, className = "", showStatus = true }: {
  adventure: { dates: string[]; departureStatuses?: Record<string, SeatStatus> };
  className?: string;
  showStatus?: boolean;
}) {
  return <div aria-label={showStatus ? "Departure dates and status" : "Departure dates"} className={`flex min-w-0 flex-wrap gap-2 ${className}`}>
    {publicDepartureDates(adventure.dates).map(date => <span key={date} className="inline-flex max-w-full flex-wrap items-center gap-x-2 rounded-md bg-charcoal/80 px-3 py-2 text-xs font-semibold text-white">
      <time dateTime={date}>{fmtDate(date)}</time>{showStatus && <SeatStatusBadge status={departureStatus(adventure, date)} />}
    </span>)}
  </div>;
}
