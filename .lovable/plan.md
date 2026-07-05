# The Trail Log — Implementation Plan

## 1. Database (migration)
Create `public.trail_log`:
- `id uuid pk default gen_random_uuid()`
- `title text not null`
- `category text not null` — CHECK in (`Trail Guide`, `Trek Journal`, `Tips & Advice`, `Event Recap`)
- `description text not null`
- `pdf_url text` (nullable), `pdf_storage_path text` (nullable, for deletion)
- `instagram_url text` (nullable)
- CHECK: exactly one of `pdf_url` / `instagram_url` is set
- `created_at timestamptz default now()`

Grants: `SELECT` to `anon, authenticated`; `ALL` to `service_role`.
RLS: enable; policy "Anyone can view" for SELECT to anon+authenticated. Inserts/deletes go through the existing `admin-api` edge function using the service-role client (so no public write policies needed — matches how gallery works).

Storage: new **private** bucket `trail-log-pdfs`. Add `storage.objects` RLS allowing service_role only; public page uses 6-hour signed URLs (same pattern as `gallery-images`).

## 2. Admin API (edge function + `src/lib/adminApi.ts`)
Add actions: `listTrailLog`, `insertTrailLog` (accepts title, category, description, and either `pdf_storage_path` or `instagram_url`), `deleteTrailLog` (also removes PDF from storage when present).

Frontend helper `adminUploadFile` already supports arbitrary buckets — reuse it for `trail-log-pdfs`.

## 3. Admin UI — new "The Trail Log" tab in `src/pages/Admin.tsx`
- Form: Title, Category dropdown, Description textarea, radio toggle between "Upload PDF" (file input) and "Instagram URL" (text). Validation: one of the two required.
- List view: title, category chip, date, source badge (PDF/IG), Delete button with confirm.

## 4. Public page `/trail-log` (`src/pages/TrailLog.tsx`)
- Register route in `src/App.tsx`.
- Layout: reuse site background, `Navbar`, `Footer`.
- Header: script-font subheading "— Adventures, guides & stories" + `<h1>` "The Trail Log" (match existing section header style used in Treks/Gallery).
- Filter pills: All / Trail Guides / Trek Journals / Tips & Advice / Event Recaps — same styling as Treks/Gallery pills, client-side filter.
- Cards grid (responsive 1/2/3 cols): category tag, title, description, formatted date, and either:
  - **PDF post** → "View PDF" button opening signed URL in new tab.
  - **Instagram post** → embedded preview via Instagram's `blockquote` embed + `//www.instagram.com/embed.js` script (loaded once per page); falls back to a "View on Instagram" link.
- Empty state (no posts at all): "Stories from the trail are coming soon. Check back after our next adventure!"

## 5. Homepage preview — new `src/components/site/TrailLogPreview.tsx`
- Inserted in `src/pages/Index.tsx` immediately after the `Treks` (Upcoming Treks) section.
- Subheading "— From the community", heading "The Trail Log".
- Shows the 3 most recent posts as the same card component used on the full page.
- "View All" pill button → `/trail-log`.
- Same empty-state copy when no posts exist.

## 6. Navbar
Add `{ label: "The Trail Log", href: "/trail-log", external: true }` between "About Us" and "Gallery" in `src/components/site/Navbar.tsx` (uses `Link` because `external: true` in that file means "react-router link").

## 7. Styling
All new UI uses existing tokens: `bg-charcoal`, `text-accent`, `font-heading`, `font-script`, gradient-orange buttons, `shadow-card`. No new colors or fonts.

## Judgment calls / notes
- PDFs stored in a **private** bucket with signed URLs (matches gallery pattern imposed by workspace policy). Signed URLs are refreshed on each page load.
- Instagram embeds rely on Instagram's public embed script; if the user is offline or IG blocks the embed, the card degrades to a link.
- Category values stored in singular form ("Trail Guide") but displayed as plural in filter pills ("Trail Guides"), matching the request.
- Writes go through the existing admin edge function (service-role) — no public insert/delete policies, consistent with gallery & treks admin flow.
