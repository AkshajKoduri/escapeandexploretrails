## Bug
The Excel export (`bookingsToRows` in `src/pages/Admin.tsx`) never includes the `payment_status` field, so every downloaded row appears as if it were still "Pending" regardless of what's shown in the admin list. Inline updates already refresh state via `reload()`, so the list is live — the export just isn't reading that column.

## Fix
In `src/pages/Admin.tsx`, update `bookingsToRows` to include the current payment status (and booking source, for consistency with the list view) using the same values rendered in the UI.

- Add `"Payment Status": (b.payment_status ?? "pending") === "paid" ? "Paid" : "Pending"` to the primary/leader row.
- Add `"Booking Source": b.booking_source === "manual" ? "Manual" : "Online"` to the primary/leader row.
- Mirror empty strings for these two columns in member sub-rows and the spacer row so the sheet stays aligned.
- Extend `ws["!cols"]` in `downloadTrekExcel` with two extra width entries (~16 and ~14) so the new columns render cleanly.

No other files, no schema changes, no changes to the inline status update flow (already correct).

## Verification
1. Add a manual booking, mark it Paid in the list.
2. Click the trek's Download button.
3. Open the .xlsx and confirm a `Payment Status` column exists and shows `Paid` for that row.
4. Flip it back to Pending, re-download, confirm it now shows `Pending`.
