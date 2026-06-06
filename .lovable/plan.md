## What we'll change

### 1. Drive album link "blocked"
Most likely cause: users paste links like `drive.google.com/...` without `https://`, so the browser treats it as a relative path and the click does nothing. Fix in both `PastTrips.tsx` and the admin "Open current album" anchor:
- Normalize the URL before rendering: if it doesn't start with `http://` or `https://`, prepend `https://`.
- Keep `target="_blank" rel="noopener noreferrer"`.
- Also normalize on save in admin (Trips form + Past Trips card) so bad values never reach the DB again.

### 2. New "Draft" section for restored past trips
Add a third state to treks (besides active & archived):
- **Migration**: add column `is_draft boolean NOT NULL DEFAULT false` to `upcoming_treks`.
- **Public site filters** (`Treks.tsx`, homepage, `BookingPage.tsx` trek picker, `PastTrips.tsx`) — exclude drafts (`is_draft = false AND is_archived = false` for active; archived stays as-is; drafts shown nowhere public).
- **Admin Dashboard**: add a new **Drafts** tab between Trips and Past Trips (4 tabs total).
  - Past Trips card → "Restore" button now sets `is_archived = false, is_draft = true` → trek lands in **Drafts**.
  - Drafts tab lists draft treks with two actions: **Publish** (sets `is_draft = false` → goes back to Active Trips) and **Move to Past Trips** (sets `is_archived = true, is_draft = false`).
  - Edit/Delete also available on each draft card.

### 3. Per-trip "Download bookings"
- Remove the global top-right "Download bookings" button.
- On each per-trek seat-summary card inside the **Bookings** tab, add a small "⬇ Download (.xlsx)" button that exports **only that trek's** bookings + members using the same Excel format as today.
- Filename: `e2trails-<trek-slug>-<timestamp>.xlsx`.

### 4. Remove "What Our Trekkers Say"
- Delete the `<Testimonials />` import + usage from `src/pages/Index.tsx`.
- Delete `src/components/site/Testimonials.tsx`.
- Remove any nav link / anchor pointing to `#testimonials` in `Navbar.tsx` / `Footer.tsx` if present.

### 5. Admin can cancel bookings
- In the expanded booking row of the Bookings tab, add a red **Cancel booking** button (only shown when `status !== 'cancelled'`).
- On click → confirm dialog → `UPDATE bookings SET status='cancelled' WHERE id=...`. This automatically frees the seat because `get_trek_seat_stats` already excludes cancelled bookings.
- Show a "Cancelled" badge on cancelled bookings; hide the Cancel button for them.
- **RLS**: add a policy on `bookings` allowing `UPDATE` when `has_role(auth.uid(), 'admin')` so admins can change status (current policies likely scope updates to the booking owner).

## Out of scope
- Booking page UI/text, founder section, group-leader highlighting, itinerary upload — all untouched.
- Existing bookings data, members, storage buckets — untouched.

## Technical notes
- Migration: `ALTER TABLE upcoming_treks ADD COLUMN is_draft boolean NOT NULL DEFAULT false;` + admin-update RLS policy on `bookings`.
- After migration, `src/integrations/supabase/types.ts` regenerates automatically; then update `Admin.tsx`, `PastTrips.tsx`, `BookingPage.tsx`, `Treks.tsx`, `Index.tsx` to use `is_draft` filter and the new UI.
