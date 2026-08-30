import { z } from "zod";

/**
 * Client-side mirrors of the server-side validation in the admin edge function.
 * These exist purely for fast inline feedback — the server re-validates everything.
 */

const optionalUrl = z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal(""));

export const tripSchema = z.object({
  name: z.string().trim().min(2, "Trip name is required").max(150, "Trip name is too long"),
  event_type: z.enum(["Hike", "Cycling Ride", "Monsoon Trek", "Bike Ride"], {
    errorMap: () => ({ message: "Choose an event type" }),
  }),
  max_seats: z.number().int().min(1, "Max seats must be at least 1").max(1000, "Max seats looks too high"),
  starting_price: z.number().min(0, "Price cannot be negative").max(10_000_000).nullable().optional(),
  description: z.string().trim().max(5000, "Description is too long").optional().or(z.literal("")),
  instructions: z.string().trim().max(5000, "Instructions are too long").optional().or(z.literal("")),
  album_url: optionalUrl,
  itinerary_url: optionalUrl,
});

export const manualBookingSchema = z.object({
  trek_id: z.string().uuid("Please select a trip"),
  primary_name: z.string().trim().min(2, "Full name is required").max(80, "Name is too long"),
  primary_phone: z.string().trim().regex(/^[+]?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
  primary_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  primary_age: z.number().int().min(5).max(99, "Enter a valid age").nullable().optional(),
  seats_booked: z.number().int().min(1, "At least one seat").max(100, "Too many seats"),
  notes: z.string().trim().max(1000, "Notes are too long").optional().or(z.literal("")),
});

export const trailLogSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200, "Title is too long"),
  category: z.string().trim().min(1, "Category is required").max(100),
  description: z.string().trim().min(2, "Description is required").max(5000, "Description is too long"),
  instagram_url: optionalUrl,
});

export const teamMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100, "Name is too long"),
  role_title: z.string().trim().min(2, "Role is required").max(100, "Role is too long"),
  bio: z.string().trim().max(2000, "Bio is too long").optional().or(z.literal("")),
});

/** Returns the first validation message, or null when the input is valid. */
export function firstError(schema: z.ZodTypeAny, value: unknown): string | null {
  const r = schema.safeParse(value);
  return r.success ? null : r.error.issues[0]?.message ?? "Invalid input";
}
