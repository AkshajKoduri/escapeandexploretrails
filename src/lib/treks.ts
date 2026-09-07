import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import ahobilam640 from "@/assets/trek-ahobilam-640.webp";
import ahobilam1280 from "@/assets/trek-ahobilam-1280.webp";
import ananthagiri640 from "@/assets/trek-ananthagiri-640.webp";
import ananthagiri1280 from "@/assets/trek-ananthagiri-1280.webp";
import bhongir640 from "@/assets/trek-bhongir-640.webp";
import bhongir1280 from "@/assets/trek-bhongir-1280.webp";
import ethipothala640 from "@/assets/trek-ethipothala-640.webp";
import ethipothala1280 from "@/assets/trek-ethipothala-1280.webp";
import koilkonda640 from "@/assets/trek-koilkonda-640.webp";
import koilkonda1280 from "@/assets/trek-koilkonda-1280.webp";
import medak640 from "@/assets/trek-medak-640.webp";
import medak1280 from "@/assets/trek-medak-1280.webp";

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

export type Difficulty = "Easy" | "Moderate" | "Hard";

export type EventType = "Hike" | "Cycling Ride" | "Monsoon Trek" | "Bike Ride";

export type AdventureExtra = { key: string; label: string; value: string };

export type Adventure = {
  id: string;
  name: string;
  destination: string | null;
  location: string | null;
  img: string;
  imgSrcSet: string | null;
  imgWidth: number | null;
  imgHeight: number | null;
  diff: Difficulty;
  dur: string;
  dist: string;
  durationText: string | null;
  region: string | null;
  price: number;
  startingPrice: number | null;
  startingPriceLabel: string | null;
  topEndPrice: number | null;
  topEndPriceLabel: string | null;
  /** Future dates (ISO) only */
  dates: string[];
  /** All dates incl. past (ISO) */
  allDates: string[];
  dateLabel: string;
  trekTime: string | null;
  description: string | null;
  instructions: string | null;
  meetingPoint: string | null;
  itineraryUrl: string | null;
  itineraryFilePath: string | null;
  itineraryDays: { title: string; description: string }[];
  seatsRemaining: number;
  maxSeats: number;
  seatsTaken: number;
  isFull: boolean;
  eventType: EventType;
  trekCategory: string | null;
  albumUrl: string | null;
  extras: AdventureExtra[];
};

export type SeatStat = {
  trek_id: string;
  max_seats: number;
  seats_taken: number;
  seats_remaining: number;
};

type TrekRow = Database["public"]["Tables"]["upcoming_treks"]["Row"];

/* ------------------------------------------------------------------ */
/* Formatters & small helpers                                          */
/* ------------------------------------------------------------------ */

export function hasValue(v: string | null | undefined | number): boolean {
  if (v == null) return false;
  if (typeof v === "number") return true;
  const s = String(v).trim();
  if (!s) return false;
  return !/^[\s.\u00b7\u2022\u25cf\u25cb\u25aa\u25ab\-–—_]+$/.test(s);
}

export function inr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return "₹" + Number(n).toLocaleString("en-IN");
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

/** Mask a sensitive identifier, e.g. "XXXX XXXX 1234" */
export function maskAadhaar(v: string | null | undefined): string {
  if (!v) return "—";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return "XXXX XXXX " + digits.slice(-4);
}

export const DIFFICULTY_STYLES: Record<Difficulty, { chip: string; label: string; dot: string }> = {
  Easy: { chip: "bg-green-600/15 text-green-700", label: "Easy", dot: "bg-green-600" },
  Moderate: { chip: "bg-gold/15 text-[#8a6410]", label: "Moderate", dot: "bg-gold" },
  Hard: { chip: "bg-destructive/15 text-destructive", label: "Hard", dot: "bg-destructive" },
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  Hike: "Hike",
  "Cycling Ride": "Cycling Ride",
  "Bike Ride": "Bike Ride",
  "Monsoon Trek": "Trek",
};

export const WHATSAPP_NUMBER = "916303682022";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Generic scale definitions (never specific claims about a given trail). */
export const DIFFICULTY_NOTES: Record<Difficulty, string> = {
  Easy: "Easy — a relaxed pace on mostly well-defined paths, good for first-timers.",
  Moderate:
    "Moderate — a comfortable middle ground for people who are regularly active; expect some steady climbing.",
  Hard: "Hard — long or steep sections that need real fitness and, ideally, some trekking experience.",
};

export function adventureLocation(a: Adventure): string {
  return a.destination || a.location || a.region || "Hyderabad";
}

export const OUTSTATION_CATEGORIES = [
  "Monsoon/Waterfall Trek",
  "Himalayan Trek",
  "Winter Trek",
] as const;

/** Existing, trek-specific photography used only when a published row has no image. */
type BundledImage = { src: string; srcSet: string; width: number; height: number };

function bundledAdventureImage(...values: Array<string | null | undefined>): BundledImage | null {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  const matches: Array<[string[], BundledImage]> = [
    [["ahobilam", "ugrastambam"], { src: ahobilam1280, srcSet: `${ahobilam640} 640w, ${ahobilam1280} 1280w`, width: 1280, height: 854 }],
    [["ananthagiri"], { src: ananthagiri1280, srcSet: `${ananthagiri640} 640w, ${ananthagiri1280} 1280w`, width: 1280, height: 960 }],
    [["bhongir", "bhuvanagiri"], { src: bhongir1280, srcSet: `${bhongir640} 640w, ${bhongir1280} 1280w`, width: 1280, height: 854 }],
    [["ethipothala"], { src: ethipothala1280, srcSet: `${ethipothala640} 640w, ${ethipothala1280} 1280w`, width: 1280, height: 720 }],
    [["koilkonda"], { src: koilkonda1280, srcSet: `${koilkonda640} 640w, ${koilkonda1280} 1280w`, width: 1280, height: 854 }],
    [["medak"], { src: medak1280, srcSet: `${medak640} 640w, ${medak1280} 1280w`, width: 1280, height: 960 }],
  ];
  return matches.find(([terms]) => terms.some((term) => haystack.includes(term)))?.[1] ?? null;
}

/* ------------------------------------------------------------------ */
/* Data fetching                                                       */
/* ------------------------------------------------------------------ */

const OUTSTATION_FIELDS: { key: keyof TrekRow; label: string }[] = [
  { key: "trek_difficulty", label: "Trek Difficulty" },
  { key: "trek_distance", label: "Trek Distance" },
  { key: "altitude", label: "Altitude" },
  { key: "region", label: "Region" },
  { key: "elevation_gain", label: "Elevation Gain" },
  { key: "mountain_range", label: "Mountain Range" },
  { key: "base_village", label: "Base Village" },
  { key: "duration_text", label: "Duration" },
  { key: "stay_location", label: "Stay Location" },
];

let seatStatsInFlight: Promise<Map<string, SeatStat>> | null = null;
let adventuresInFlight: Promise<Adventure[]> | null = null;

async function loadSeatStats(): Promise<Map<string, SeatStat>> {
  const { data, error } = await supabase.rpc("get_trek_seat_stats");
  if (error) throw error;
  const m = new Map<string, SeatStat>();
  (data ?? []).forEach((s) => m.set(s.trek_id, s));
  return m;
}

export function fetchSeatStats(): Promise<Map<string, SeatStat>> {
  if (!seatStatsInFlight) {
    seatStatsInFlight = loadSeatStats().finally(() => {
      seatStatsInFlight = null;
    });
  }
  return seatStatsInFlight;
}

function normalizeItineraryDays(value: Json): Adventure["itineraryDays"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const title = item.title;
    const description = item.description;
    return typeof title === "string" && typeof description === "string"
      ? [{ title, description }]
      : [];
  });
}

function mapRow(t: TrekRow, statsMap: Map<string, SeatStat>, today: string): Adventure {
  const s = statsMap.get(t.id);
  const seatsTaken = s?.seats_taken ?? t.seats_taken ?? 0;
  const maxSeats = s?.max_seats ?? t.max_seats ?? 0;
  const remaining = s?.seats_remaining ?? maxSeats - seatsTaken;

  const allDates = [t.trek_date, ...(t.additional_dates ?? [])].filter(Boolean) as string[];
  const dates = allDates.filter((d) => d >= today);
  const sorted = [...dates].sort();
  const fieldLabels = t.field_labels && typeof t.field_labels === "object" && !Array.isArray(t.field_labels)
    ? t.field_labels
    : {};
  const bundledImage = t.image_url ? null : bundledAdventureImage(t.name, t.destination, t.location, t.region);

  return {
    id: t.id,
    name: t.name,
    destination: t.destination ?? null,
    location: t.location ?? null,
    img: t.image_url || bundledImage?.src || "",
    imgSrcSet: bundledImage?.srcSet ?? null,
    imgWidth: bundledImage?.width ?? null,
    imgHeight: bundledImage?.height ?? null,
    diff: (t.difficulty as Difficulty) ?? "Easy",
    dur: t.duration ?? "",
    dist: t.distance ?? "",
    durationText: t.duration_text ?? null,
    region: t.region ?? null,
    price: Number(t.price ?? 0),
    startingPrice: t.starting_price != null ? Number(t.starting_price) : null,
    startingPriceLabel: t.starting_price_label ?? null,
    topEndPrice: t.top_end_price != null ? Number(t.top_end_price) : null,
    topEndPriceLabel: t.top_end_price_label ?? null,
    dates: sorted,
    allDates,
    dateLabel: sorted.length ? sorted.map(fmtDate).join(", ") : "",
    trekTime: t.trek_time ?? null,
    description: t.description ?? null,
    instructions: t.instructions ?? null,
    meetingPoint: t.meeting_point ?? null,
    itineraryUrl: t.itinerary_url ?? null,
    itineraryFilePath: t.itinerary_file_path ?? null,
    itineraryDays: normalizeItineraryDays(t.itinerary_days),
    seatsRemaining: remaining,
    maxSeats: maxSeats,
    seatsTaken: seatsTaken,
    isFull: remaining <= 0,
    eventType: (t.event_type as EventType) ?? "Hike",
    trekCategory: t.trek_category ?? null,
    albumUrl: t.album_url ?? null,
    extras: OUTSTATION_FIELDS.map((f) => ({
      key: f.key,
      label: typeof fieldLabels[f.key] === "string" ? fieldLabels[f.key] : f.label,
      value: String(t[f.key] ?? ""),
    })).filter((x) => hasValue(x.value)),
  };
}

/**
 * Fetch all published adventures with real seat stats.
 * Set includePast to true when the admin needs history.
 */
async function loadAdventures(includePast = false): Promise<Adventure[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [trekResult, statsMap] = await Promise.all([
    supabase
      .from("upcoming_treks")
      .select("*")
      .eq("is_archived", false)
      .eq("is_draft", false)
      .order("trek_date", { ascending: true, nullsFirst: false }),
    fetchSeatStats(),
  ]);
  if (trekResult.error) throw trekResult.error;
  const trekData = trekResult.data;

  return (trekData ?? [])
    .map((t) => mapRow(t, statsMap, today))
    .filter((a: Adventure) => {
      if (includePast) return true;
      if (a.allDates.length === 0) return true;
      return a.allDates.some((d) => d >= today);
    });
}

export function fetchAdventures(opts?: { includePast?: boolean }): Promise<Adventure[]> {
  if (opts?.includePast) return loadAdventures(true);
  if (!adventuresInFlight) {
    adventuresInFlight = loadAdventures().finally(() => {
      adventuresInFlight = null;
    });
  }
  return adventuresInFlight;
}

export async function fetchAdventureById(id: string): Promise<Adventure | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const [trekRes, statsMap] = await Promise.all([
    supabase.from("upcoming_treks").select("*").eq("id", id).maybeSingle(),
    fetchSeatStats(),
  ]);
  if (trekRes.error) throw trekRes.error;
  if (!trekRes.data) return null;
  const row = trekRes.data;
  if (row.is_archived || row.is_draft) return null;
  return mapRow(row, statsMap, today);
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

export type BookingInput = {
  trek: Adventure;
  trekDate: string; // ISO date chosen by the user
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  groupMembers: { name: string }[];
};

export type BookingResult = {
  ok: boolean;
  message?: string;
  bookingId?: string;
  code?: string;
};

const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Some details were missing or invalid. Please check and try again.",
  invalid_seats: "Please check the number of people (max 12 per booking).",
  trek_not_found: "This adventure is no longer available. Please choose another.",
  expired_date: "That date has passed. Please choose an upcoming date.",
  invalid_date: "That date isn't available for this adventure. Please pick one of the dates shown.",
  sold_out: "This adventure has just filled up. Please choose another date or adventure.",
};

/**
 * Authoritative booking submission through the server-side gateway
 * (public.create_booking). The browser sends only customer fields — the
 * database sets status/payment/source itself, validates the trek and date,
 * enforces capacity atomically, and deduplicates via client_ref. New web
 * bookings begin as "pending": our team calls the customer to confirm, which
 * matches the site's "no payment is taken online" promise.
 */
export async function submitBooking(
  input: BookingInput & { clientRef?: string },
): Promise<BookingResult> {
  const clientRef = input.clientRef ?? crypto.randomUUID();
  const members = input.groupMembers.map((m) => m.name.trim()).filter(Boolean);

  const { data, error } = await supabase.rpc("create_booking", {
    p_trek_id: input.trek.id,
    p_trek_date: input.trekDate,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email || null,
    p_age: input.age,
    p_gender: input.gender,
    p_members: members.length ? members : null,
    p_client_ref: clientRef,
  });

  if (error) {
    return {
      ok: false,
      message: "We couldn't submit your booking right now. Please try again in a moment.",
    };
  }

  if (!data?.ok) {
    const code = data?.code ?? "error";
    let message =
      BOOKING_ERROR_MESSAGES[code] ?? "We couldn't complete your booking. Please try again.";
    if (code === "sold_out" && typeof data?.remaining === "number") {
      message = `Only ${Math.max(data.remaining, 0)} seat(s) left for this adventure.`;
    }
    return { ok: false, message, code };
  }

  // A repeated submission carrying the same client_ref returns the original
  // booking (created: false) — treat it as success so a lost response or
  // retry after timeout can never create a duplicate.
  return { ok: true, bookingId: data?.booking_id, code: data?.code };
}
