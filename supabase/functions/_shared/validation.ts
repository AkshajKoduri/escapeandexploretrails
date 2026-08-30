// Server-side validation for every edge-function payload.
// Nothing reaches the database until it has passed one of these schemas.
import { z } from "npm:zod@3.23.8";

export { z };

export const uuid = z.string().uuid("Invalid id");
export const shortText = z.string().trim().max(200);
export const longText = z.string().trim().max(5000);

/** Strip keys that are not on the allow-list, then reject an empty patch. */
export function pickAllowed<T extends Record<string, unknown>>(
  patch: unknown,
  allowed: readonly string[],
): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("Invalid patch");
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (allowed.includes(k)) out[k] = v;
  }
  if (Object.keys(out).length === 0) throw new Error("No updatable fields in patch");
  return out as T;
}

// ---- Column allow-lists (never let a client set arbitrary columns) ----

export const TREK_COLUMNS = [
  "name", "location", "trek_date", "difficulty", "duration", "distance", "image_url",
  "description", "destination", "trek_time", "price", "max_seats", "meeting_point",
  "instructions", "status_override", "is_archived", "album_url", "itinerary_url",
  "itinerary_file_path", "is_draft", "event_type", "trek_difficulty", "trek_distance",
  "altitude", "region", "elevation_gain", "mountain_range", "base_village", "duration_text",
  "stay_location", "field_labels", "additional_dates", "starting_price", "starting_price_label",
  "top_end_price", "top_end_price_label", "itinerary_days", "trek_category", "seats_taken",
] as const;

export const BOOKING_COLUMNS = [
  "trek_id", "trek_name", "primary_name", "primary_age", "primary_gender", "primary_phone",
  "primary_email", "primary_aadhaar", "primary_aadhaar_photo", "is_group", "status",
  "seats_booked", "payment_status", "booking_source", "notes",
] as const;

export const CALLBACK_COLUMNS = [
  "trip_id", "trip_name", "full_name", "email", "mobile_number", "preferred_time", "status",
] as const;

export const GALLERY_COLUMNS = ["image_url", "storage_path", "category", "display_order", "alt_text"] as const;

export const TEAM_COLUMNS = ["full_name", "role_title", "bio", "photo_url", "badges", "display_order"] as const;

// ---- Reusable payload schemas ----

export const idPayload = z.object({ id: uuid });

export const patchPayload = z.object({ id: uuid, patch: z.record(z.unknown()) });

export const reorderPayload = z.object({
  updates: z.array(z.object({ id: uuid, display_order: z.number().int().min(0).max(10000) })).max(500),
});

// ---- Storage uploads ----

export const ALLOWED_BUCKETS = [
  "trek-images", "itineraries", "gallery-images", "trail-log-pdfs", "team-photos",
] as const;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const PDF_TYPES = ["application/pdf"];

const BUCKET_TYPES: Record<string, string[]> = {
  "trek-images": IMAGE_TYPES,
  "gallery-images": IMAGE_TYPES,
  "team-photos": IMAGE_TYPES,
  "itineraries": PDF_TYPES,
  "trail-log-pdfs": PDF_TYPES,
};

const BUCKET_EXTS: Record<string, string[]> = {
  "trek-images": ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  "gallery-images": ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  "team-photos": ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  "itineraries": ["pdf"],
  "trail-log-pdfs": ["pdf"],
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadPayload = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  // No traversal, no leading slash, no backslashes.
  path: z.string().min(1).max(300).regex(/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/, "Invalid path")
    .refine((p) => !p.includes(".."), "Invalid path"),
  base64: z.string().min(1),
  contentType: z.string().max(120).optional(),
  upsert: z.boolean().optional().default(false),
});

export const removePayload = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  path: z.string().min(1).max(300).refine((p) => !p.includes(".."), "Invalid path"),
});

export function assertUploadAllowed(bucket: string, path: string, contentType: string | undefined, byteLength: number) {
  if (byteLength > MAX_UPLOAD_BYTES) throw new Error("File too large (max 10 MB)");
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (!BUCKET_EXTS[bucket]?.includes(ext)) throw new Error(`File extension .${ext} not allowed for this upload`);
  const ct = (contentType ?? "").toLowerCase().split(";")[0].trim();
  if (ct && !BUCKET_TYPES[bucket]?.includes(ct)) throw new Error(`Content type ${ct} not allowed for this upload`);
}

// ---- Public (unauthenticated) payloads ----

const phone = z.string().trim().regex(/^[+]?[0-9\s()\-]{7,20}$/, "Enter a valid phone number");

export const publicBookingPayload = z.object({
  trek_id: uuid,
  primary_name: z.string().trim().min(2).max(80),
  primary_age: z.number().int().min(10).max(99).nullable().optional(),
  primary_gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).nullable().optional(),
  primary_phone: phone,
  primary_email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  is_group: z.boolean().optional().default(false),
  members: z.array(z.object({ full_name: z.string().trim().min(1).max(80) })).max(30).optional().default([]),
});

export const publicCallbackPayload = z.object({
  trip_id: uuid.nullable().optional(),
  trip_name: z.string().trim().max(200).nullable().optional(),
  full_name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Invalid email").max(255).nullable().optional().or(z.literal("")),
  mobile_number: phone,
  preferred_time: z.string().trim().max(1000).nullable().optional(),
});

export const signedUrlPayload = z.object({ trekId: uuid });
