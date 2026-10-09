import type { SeatStatus } from "@/lib/departureStatus";

const colors: Record<SeatStatus, string> = {
  Available: "bg-green-100 text-green-900",
  "Filling Fast": "bg-amber-100 text-amber-900",
  "Last Few": "bg-orange-100 text-orange-900",
  Full: "bg-red-100 text-red-900",
  "Waiting List": "bg-blue-100 text-blue-900",
};

export default function SeatStatusBadge({ status }: { status: SeatStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${colors[status]}`}>{status}</span>;
}
