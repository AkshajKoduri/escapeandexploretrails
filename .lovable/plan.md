# Admin & Booking System Upgrade

Razorpay and the customer ratings system will be handled in separate follow-up plans. This plan focuses on trip management, seat availability, auto status, and the Past Trips archive.

## 1. Database changes

Extend `upcoming_treks` with the new trip fields, then add two supporting tables.

**`upcoming_treks` — new columns**
- `destination` (text)
- `trek_time` (text, e.g. "6:00 AM")
- `price` (numeric, required)
- `max_seats` (integer, required, default 30)
- `meeting_point` (text)
- `instructions` (text)
- `status_override` (text, nullable: `Upcoming` / `Ongoing` / `Completed` / `Archived`) — only set when admin manually overrides the date-derived status
- `is_archived` (boolean, default false)

**`trip_album_images` (new table)** — for Past Trips photo albums
- `trek_id` (uuid, FK to upcoming_treks)
- `image_url` (text)
- `caption` (text, optional)
- Public read; admin-only write.

**`bookings` — new column**
- `seats_booked` (integer, default 1) — equals `1 + group members count`, used for fast seat math.

**Derived seat availability**
A SQL view `trek_seat_stats` returning `trek_id`, `seats_taken` (sum of `seats_booked` from confirmed bookings), `seats_remaining`. Customer page reads from this.

**Derived status (computed in app, not stored)**
- `status_override` if set, otherwise:
  - `trek_date > today` → Upcoming
  - `trek_date = today` → Ongoing
  - `trek_date < today` → Completed
- `is_archived = true` → Past Trips tab regardless of date.

RLS stays consistent with existing tables (admin full write, public read on treks/album).

## 2. Admin dashboard rebuild (`/admin`)

Convert the page into a tabbed dashboard:

```text
┌─ Trek Lead Dashboard ──────────────────────────────┐
│ [Trips] [Bookings] [Past Trips] [Export]           │
└────────────────────────────────────────────────────┘
```

**Trips tab**
- Table of all non-archived treks with: name, date, status badge (auto), price, seats taken / max, actions.
- "Add trip" opens a modal/drawer form with all fields from section 2 of the brief (title, destination, date, time, price, max seats, description, image, meeting point, instructions, difficulty, duration, distance).
- Each row: Edit (same form pre-filled), Archive (moves to Past Trips), Delete, "Adjust seat limit" inline action that requires explicit confirm (per requirement that seat limits are the only field never auto-changed).
- Form values persist exactly as entered; nothing is auto-reset.

**Bookings tab**
- Filterable table (by trek, by status). Shows primary trekker, phone, group size, seats booked, booking date.
- Row expand reveals group members and Aadhaar info.
- Per-trek summary card: seats taken vs max, "Trip Full" indicator.

**Past Trips tab**
- List of archived treks. Each card opens an album manager:
  - Upload multiple images to `trek-images` bucket under `albums/{trek_id}/`.
  - Reorder / delete album images.
- Ratings UI is stubbed for now (placeholder section saying "Coming soon"); ratings flow handled in a later plan.

**Export tab**
- Keeps the existing one-click `.xlsx` download (already implemented). Adds a per-trek export option.

UI uses existing shadcn primitives (Tabs, Dialog, Table, Badge) for a clean minimal look matching current design tokens.

## 3. Customer-facing changes

**`Treks.tsx` (Upcoming Treks section)**
- Pulls only treks where derived status is `Upcoming` or `Ongoing` and `is_archived = false`.
- Each card shows: image, name, date, time, destination, price, "X seats remaining" / "Trip Full" badge from `trek_seat_stats`.
- "Book Now" disabled when full.

**`BookingPage.tsx`**
- Trek selection limited to non-full, non-archived treks.
- Shows live seat count, price, meeting point and instructions for the selected trek.
- On submit: validates seats remaining ≥ requested (1 + members) inside a transaction-style check, then inserts booking with `seats_booked` set correctly. If full, shows error and refreshes list.

**New `/past-trips` route + nav link**
- Grid of archived trek "albums". Click opens a lightbox gallery of the trek's images.
- Placeholder area for ratings (to be filled in next plan).
- Visible to all signed-in users.

## 4. Sync & data integrity

- All admin writes use Supabase; customer pages already use `supabase.from(...)` so updates appear on next fetch.
- Add lightweight realtime subscription on `upcoming_treks` and `bookings` for the booking page so seat counts update live without refresh.
- Seat math is server-truth via the `trek_seat_stats` view — never cached in client state beyond the current fetch.

## 5. Out of scope (tracked for later)

- Razorpay checkout, payment status on bookings, refund flow.
- Customer rating submission + display on Past Trips.
- GoDaddy custom domain wiring (done in Lovable publish settings, not code).

## Technical notes

- Migration order: add columns + table + view → backfill `seats_booked = 1 + member_count` for existing bookings → switch UI to new fields.
- `status_override` lets admin freeze a trip as Completed early or keep one Upcoming past its date without fighting the date logic.
- Album images reuse the existing public `trek-images` bucket under an `albums/` prefix, so no new bucket/policies needed.
- Mobile: dashboard tabs collapse to a select on small screens; tables become stacked cards under `md`.
