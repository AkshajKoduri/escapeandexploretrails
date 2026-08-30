# Security Hardening Pass

A full review of the app against the six requirements. Some are already satisfied; the rest below are the real gaps to close.

## What already holds up

- No secrets in source: the admin password, service-role key and DB URL are all read from environment/secret storage in the edge functions. The only client-side keys are the public project URL and publishable key, which are designed to ship in the browser.
- No raw SQL string building anywhere: every database call goes through the Supabase query builder or parameterized RPC, so injection is not reachable.
- Every privileged write (treks, gallery, team, trail log, bookings, storage uploads) already runs server-side in the `admin-api` function rather than from the browser.

## Gaps to fix

### 1. Admin session handling
Today the admin password is stored in browser session storage and replayed as a header on every request; the login screen also decides access purely client-side. Replace with a proper server-issued session:
- `admin-api` gains `login` and `logout` actions. `login` verifies the password with a constant-time comparison and returns a short-lived signed session token (HMAC with a generated server secret, ~8h expiry).
- All other actions require a valid token and reject anything else with 401, before any work happens.
- The browser stores only the opaque token; the raw password is never persisted.
- The admin screen treats a failed token check as logged out.

### 2. Rate limiting on public endpoints
Add a shared in-memory sliding-window limiter used by both edge functions, keyed by client IP:
- Admin login: 5 attempts per 15 min per IP, with lockout response.
- Other admin actions: 120/min per session.
- `itinerary-signed-url`: 30/min per IP.
- Public writes (bookings, callback requests, contact enquiries) move behind a new `public-api` edge function with a 5/min per-IP limit, so the anonymous insert paths can't be scripted for spam.

### 3. Server-side input validation
Client-side Zod exists only on the booking and contact forms; the server accepts whatever it is sent.
- Add Zod (Deno import) schemas in the edge functions for every action payload: field types, max lengths, allowed enum values, UUID checks, and an allow-list of updatable columns so a patch can't set arbitrary fields.
- Uploads validated for MIME type (images/PDF only), extension, and size cap (10 MB) before hitting storage.
- Add matching client-side Zod schemas to the admin trip/gallery/team/trail-log forms so users get inline errors instead of server rejections.

### 4. Tighten anonymous database access
The anonymous insert policies on `bookings`, `booking_members` and `callback_requests` allow direct writes from any browser. Once public writes route through `public-api` (service role), revoke the anonymous insert grants and policies on those three tables so the validated, rate-limited path is the only way in.

### 5. Dependency verification
Audit every package in `package.json` and every remote import in the edge functions: confirm each resolves on the official registry, check latest version and last publish date, and flag anything unmaintained or with known advisories. Report findings; no unrequested version bumps.

## Technical notes

- New secret: an HMAC signing key for admin session tokens, generated server-side (never displayed).
- New files: `supabase/functions/_shared/rateLimit.ts`, `_shared/validation.ts`, `_shared/adminSession.ts`, `supabase/functions/public-api/index.ts`.
- Modified: `admin-api/index.ts`, `itinerary-signed-url/index.ts`, `src/lib/adminApi.ts`, `src/components/AdminRoute.tsx`, `src/pages/Admin.tsx`, `src/pages/BookingPage.tsx`, `src/components/site/Contact.tsx`, `src/components/site/Treks.tsx` (callback form submit path).
- One migration to drop the anonymous insert policies/grants on the three public-write tables.
- Rate limits are per-instance in memory; adequate for this traffic level, and noted as such rather than pretending to be distributed.
- Closes with a security scan and a build/typecheck.
