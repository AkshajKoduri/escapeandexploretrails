## Goal

1. **Past Trips album** — replace per-image uploads with a single Google Drive link (admin pastes URL, users click "View Album" to open it in a new tab).
2. **Booking page itinerary** — show an itinerary attached to each trek by the admin, as either an external link OR an uploaded PDF.

---

## Database changes

Add three columns to `upcoming_treks`:
- `album_url TEXT` — Drive link for the past-trip album
- `itinerary_url TEXT` — external link to itinerary (Drive/web URL)
- `itinerary_file_path TEXT` — storage path if a PDF was uploaded

Create a new public storage bucket `itineraries` with RLS:
- Public SELECT (so users can download)
- INSERT/UPDATE/DELETE restricted to admins via `has_role(auth.uid(), 'admin')`

The existing `trip_album_images` table stays in place (no data loss), but the UI for managing it is removed.

---

## Admin page (`src/pages/Admin.tsx`)

In the trek create/edit form:
- Add **Album Drive Link** input (URL field) — saved to `album_url`.
- Add **Itinerary** section with two options:
  - URL field for `itinerary_url`
  - File upload (PDF only, max 10MB) → uploads to `itineraries/{trek_id}/{uuid}.pdf` and saves the path to `itinerary_file_path`. A "Remove" button clears it.
- Remove the existing per-trek "manage album images" dialog/UI.

Validate URLs with zod (`z.string().url()`), allow blank.

---

## Past Trips page (`src/pages/PastTrips.tsx`)

- Drop the `trip_album_images` query and lightbox.
- Each card shows the trek's cover image and, if `album_url` is set, a prominent **"View Photo Album"** button that opens the link in a new tab.
- If no `album_url`, show a muted "Album coming soon" line.

---

## Booking page (`src/pages/BookingPage.tsx`)

In the selected-trek info card, add an **Itinerary** row when either field is set:
- `itinerary_url` → "📋 View Itinerary" link (new tab).
- `itinerary_file_path` → "📋 Download Itinerary (PDF)" link built from the public storage URL of the `itineraries` bucket.
- If both, show both.

Extend the `TrekOpt` type and `loadTreks` mapping to include the two itinerary fields.

---

## Out of scope

- No change to bookings, members, auth, or seat logic.
- The existing `trip_album_images` table is left untouched (no data loss); we simply stop reading/writing it.
