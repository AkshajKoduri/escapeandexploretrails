
## Trip "View More Info" improvements

### 1. Wider desktop modal
In `src/components/site/Treks.tsx`, change the trip info `DialogContent` from `max-w-2xl` to a responsive wider size (e.g. `sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl`). Mobile stays as-is (full width with margins from shadcn defaults).

### 2. Structured itinerary — database
New migration to add a column to `upcoming_treks`:
- `itinerary_days jsonb NOT NULL DEFAULT '[]'::jsonb` — array of `{ title: string, description: string }`.

Keep `itinerary_file_path` and `itinerary_url` columns as-is (PDF fallback).

### 3. Admin upload UI (`src/pages/Admin.tsx`)
In the trek create/edit form add an "Itinerary (structured)" section:
- Repeating rows of `Day Title` (input) + `Day Description` (textarea) with Add day / Remove day buttons, drag-free simple ordering.
- Existing PDF upload stays below, labeled "Optional: Upload PDF fallback".
- On save, send `itinerary_days` array via the existing admin-api `updateTrek` / trek insert path (extend the edge function whitelist to include `itinerary_days`).

### 4. Full-screen itinerary view
New route `src/pages/Itinerary.tsx` at path `/itinerary/:trekId` (registered in `src/App.tsx`):
- Loads the trek row (public `upcoming_treks` already readable).
- Header with trek name, back button, and Share button.
- If `itinerary_days` non-empty → render each day as a shadcn `Accordion` item (single-collapsible, collapsed by default), using existing font/colors (`font-heading text-primary`, muted description).
  - If a PDF also exists, show a small "View as PDF" link that swaps to the embedded PDF viewer (or opens signed URL in new tab).
- Else if only PDF exists → full-screen embedded viewer using signed URL from `itinerary-signed-url` edge function, with a "Download PDF" link.
- Else → "Itinerary coming soon" message.

Share button:
- If `navigator.share` exists → call it with `{ title, url: window.location.href }`.
- Else → `navigator.clipboard.writeText(...)` + sonner `toast.success("Link copied!")`.
- Minimum 44px height (`h-11`), styled with `bg-accent text-accent-foreground` to match site.

### 5. Trip info modal changes (`Treks.tsx`)
- Remove the embedded `<object>`/`<iframe>` PDF block.
- Replace with a single primary button "View Itinerary" (min `h-11`, accent styling, full-width on mobile) that navigates via react-router `Link` to `/itinerary/:trekId`. Only shown when `itinerary_days.length > 0` OR `itineraryFilePath` OR `itineraryUrl` exists.
- Drop the `itinerary-signed-url` fetch from this modal (moved to the new page).

### 6. Collapsible Description & Instructions
In the trip info modal, wrap the Description and Special Instructions sections in shadcn `Accordion` (type="single", collapsible, `defaultValue={undefined}` so collapsed by default). Chevron rotation comes built-in with `AccordionTrigger`. Keep heading text style (`font-heading font-bold text-primary`) inside the trigger.

### 7. Data mapping
Extend `TrekCard` type in `Treks.tsx` with `itineraryDays: Array<{title:string; description:string}>` and populate from `t.itinerary_days`. Pass through to the "View Itinerary" button visibility check.

### Files touched
- New migration: add `itinerary_days` column.
- `supabase/functions/admin-api/index.ts` — allow `itinerary_days` in trek payload.
- `src/pages/Admin.tsx` — structured itinerary editor UI.
- `src/components/site/Treks.tsx` — wider modal, remove embedded PDF, add "View Itinerary" link, collapsible Description/Instructions.
- New `src/pages/Itinerary.tsx` — full-screen view with accordion + share + PDF fallback.
- `src/App.tsx` — register `/itinerary/:trekId` route.
- `src/integrations/supabase/types.ts` — regenerated after migration.

### Out of scope
No changes to booking flow, other admin tabs, styling tokens, or unrelated pages.
