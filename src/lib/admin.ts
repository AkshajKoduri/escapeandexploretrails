export type Trek = {
  id: string;
  name: string;
  destination: string | null;
  location: string | null;
  trek_date: string | null;
  additional_dates: string[];
  trek_time: string | null;
  difficulty: "Easy" | "Moderate" | "Hard";
  duration: string | null;
  distance: string | null;
  image_url: string | null;
  description: string | null;
  price: number;
  starting_price: number | null;
  starting_price_label: string | null;
  top_end_price: number | null;
  top_end_price_label: string | null;
  max_seats: number;
  meeting_point: string | null;
  instructions: string | null;
  status_override: string | null;
  is_archived: boolean;
  is_draft: boolean;
  album_url: string | null;
  itinerary_url: string | null;
  itinerary_file_path: string | null;
  itinerary_days: { title: string; description: string }[];
  event_type: "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride";
  trek_category: string | null;
  trek_difficulty: string | null;
  trek_distance: string | null;
  altitude: string | null;
  region: string | null;
  elevation_gain: string | null;
  mountain_range: string | null;
  base_village: string | null;
  duration_text: string | null;
  stay_location: string | null;
  field_labels: Record<string, string> | null;
};

export type SeatStats = { trek_id: string; max_seats: number; seats_taken: number; seats_remaining: number };

export type Booking = any;

export const TREK_CATEGORIES = ["Monsoon/Waterfall Trek", "Himalayan Trek", "Winter Trek"] as const;

export const emptyTrek: Partial<Trek> = {
  name: "",
  destination: "",
  trek_date: "",
  additional_dates: [],
  trek_time: "",
  difficulty: "Easy",
  duration: "",
  distance: "",
  description: "",
  price: 0,
  starting_price: null,
  starting_price_label: "",
  top_end_price: null,
  top_end_price_label: "",
  max_seats: 30,
  meeting_point: "",
  instructions: "",
  location: "",
  album_url: "",
  itinerary_url: "",
  itinerary_file_path: "",
  itinerary_days: [],
  event_type: "Hike",
  trek_category: "",
  trek_difficulty: "",
  trek_distance: "",
  altitude: "",
  region: "",
  elevation_gain: "",
  mountain_range: "",
  base_village: "",
  duration_text: "",
  stay_location: "",
  field_labels: {},
};

export const OUTSTATION_EXTRA_FIELDS: {
  key: keyof Trek;
  label: string;
  type?: "select";
  options?: string[];
  placeholder?: string;
}[] = [
  { key: "trek_difficulty", label: "Trek Difficulty", type: "select", options: ["", "Easy", "Moderate", "Hard", "Very Hard"] },
  { key: "trek_distance", label: "Trek Distance", placeholder: "14 Kms/10 hrs" },
  { key: "altitude", label: "Altitude", placeholder: "1,422 M/4,670 FT" },
  { key: "region", label: "Region", placeholder: "Malshej Ghat, Maharashtra" },
  { key: "elevation_gain", label: "Elevation Gain", placeholder: "700 M/2,297 FT" },
  { key: "mountain_range", label: "Mountain Range", placeholder: "Western Ghats" },
  { key: "base_village", label: "Base Village", placeholder: "Khireshwar" },
  { key: "duration_text", label: "Duration", placeholder: "3D/2N" },
  { key: "stay_location", label: "Stay Location", placeholder: "Khireshwar Village" },
];

export function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  const v = u.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export function trekDates(t: Trek): string[] {
  return [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[];
}

export function trekDateLabel(t: Trek): string {
  const dates = trekDates(t);
  if (!dates.length) return "No date";
  return dates.map((d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })).join(", ");
}

/** Seat-based operational status for the trips table. */
export function seatStatus(t: Trek, taken: number): "OPEN" | "ALMOST FULL" | "FULL" {
  const max = t.max_seats || 1;
  const remaining = max - taken;
  if (remaining <= 0) return "FULL";
  if (remaining <= Math.ceil(max * 0.2) || remaining <= 3) return "ALMOST FULL";
  return "OPEN";
}

export function isPastTrip(t: Trek): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const dates = trekDates(t);
  if (!dates.length) return false;
  const latest = dates.reduce((a, b) => (a > b ? a : b));
  return latest < today;
}

export const STATUS_CHIP: Record<string, string> = {
  OPEN: "bg-green-600/15 text-green-700",
  "ALMOST FULL": "bg-gold/15 text-[#8a6410]",
  FULL: "bg-destructive/15 text-destructive",
  COMPLETED: "bg-muted text-muted-foreground",
  DRAFT: "bg-amber-500/15 text-amber-700",
  CANCELLED: "bg-destructive/15 text-destructive",
  PAID: "bg-green-600/15 text-green-700",
  PENDING: "bg-amber-500/15 text-amber-700",
  CONTACTED: "bg-green-600/15 text-green-700",
};

export const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { key: "trips", label: "Trips", icon: "Mountain" },
  { key: "bookings", label: "Bookings", icon: "Users" },
  { key: "callbacks", label: "Callbacks", icon: "PhoneCall" },
  { key: "drafts", label: "Drafts", icon: "FileEdit" },
  { key: "trail-log", label: "Trail Log", icon: "BookOpen" },
  { key: "gallery", label: "Gallery", icon: "Image" },
  { key: "team", label: "Team", icon: "Users2" },
] as const;

export type AdminModule = (typeof ADMIN_NAV)[number]["key"];