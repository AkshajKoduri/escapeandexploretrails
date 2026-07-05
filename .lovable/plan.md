## Goal
Remove the "Special Instructions" accordion item from the trek detail dialog in `src/components/site/Treks.tsx` and replace it with a "Dates" accordion item that uses the exact same styling (same `AccordionItem` / `AccordionTrigger` / `AccordionContent` classes as "Description" and the removed "Special Instructions").

## Changes — `src/components/site/Treks.tsx`

1. In the accordion block (~lines 310–333), remove the `instructions` `AccordionItem` and add a new `dates` `AccordionItem` in its place.
2. New item renders when `openTrek.dates.length > 0`:
   - Trigger label: **"Dates"**
   - Content: each date rendered on its own line, formatted with the existing `fmt` helper already used for `dateLabel` (e.g. one `<div>` per date). Falls back gracefully if only one date is present (still shown as a single line).
3. Update the accordion's outer conditional from `(openTrek.description || openTrek.instructions)` to `(openTrek.description || openTrek.dates.length > 0)` so the accordion still hides when there's nothing to show.
4. Leave the header line `📅 Date: {openTrek.dateLabel}` untouched (still shows a summary above the accordion) — say the word and I'll remove it too if you want the accordion to be the only place dates appear.

## Not touched
- Admin form / DB — `instructions` column and its input remain in place, just no longer shown in this dialog. Say the word if you want the field removed from the admin form as well.
- Trek card summary, Itinerary page, everything else.
- No styling changes — the new item reuses the exact classes from the existing accordion items.
