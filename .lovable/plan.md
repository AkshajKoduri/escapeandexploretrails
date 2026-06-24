## Goal

Make the Past Trips Drive album link actually save + open, and make it obvious that the Bookings download is per-trip.

## What I found while exploring

- The download button in **Admin → Bookings** is already per-trek (one button per trek card, filtering by `trek_id`). The data confirms bookings have distinct `trek_id` values, so a click should only export that trek. You may have been clicking the global-looking card thinking it was global — we'll make the per-trek scoping unmistakable.
- The Past Trips album link code already prepends `https://` and opens in a new tab. But the database currently has **zero** `album_url` values saved on any trek (archived or not). That strongly suggests the link isn't actually being persisted from the editor — most likely the input's native `type="url"` validation, a stale state read, or the user editing a non-archived trek.
- The "What our trekkers say" section is already removed — no action needed.

## Changes

### 1. Past Trips Drive album link (Admin → Past Trips tab)

- In the `PastTripCard` save flow, trim whitespace and accept bare domains (e.g. `drive.google.com/...`) by relaxing the input to `type="text"` and relying on our `normalizeUrl` + `new URL()` validation.
- After a successful save, also push the normalized value back into the local `trek` row optimistically so the "Open current album" link appears immediately without waiting for reload.
- Show the saved URL (read-only) under the input so the admin can visually confirm what is stored.
- On the public **Past Trips** page, keep the existing `https://` normalization (already correct) and add `referrerPolicy="no-referrer"` to the anchor so Drive doesn't block based on referrer in some browsers.

### 2. Per-trip booking download clarity

- Relabel each trek card's button to **"Download bookings for this trek (N)"** where N = the count of non-cancelled bookings for that trek. This makes it visually obvious the export is scoped.
- Add a small subtitle on the seat-summary grid: *"Each card below downloads only that trek's bookings."*
- Keep the existing filter logic (already correct: `b.trek_id === trek.id`).

### 3. No code change for testimonials (already removed).

## Files touched

- `src/pages/Admin.tsx` — `PastTripCard` save flow + input type + confirmation display; bookings tab subtitle + button label with count.
- `src/pages/PastTrips.tsx` — add `referrerPolicy="no-referrer"` to album anchor.

No database or schema changes.
