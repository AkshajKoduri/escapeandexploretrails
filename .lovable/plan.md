## Goal
Replace the current three pricing fields in the Admin trek form (Starting Price + its label sub-input, Top End Price + its label sub-input) with a single **Starting Price (₹)** number input. Show it on the user-facing trek cards and details as **"Starting Price Rs. 15,800/-"** (matching the reference screenshot).

## Changes

### 1. `src/pages/Admin.tsx` (form only — no DB migration)
- Remove the `Top End Price (₹)` field (both the number input and its label sub-input).
- In the `Starting Price (₹)` field, remove the second free-text label input — keep only the number input.
- Stop sending `starting_price_label`, `top_end_price`, `top_end_price_label` on insert/update (send them as `null` so any previously stored values are cleared on next save).
- The admin list row keeps showing the price but simplified to just the starting price (no range).
- Internal state keys (`starting_price_label`, `top_end_price*`) can stay in the form-state type to avoid churn, but the UI no longer renders inputs for them.

### 2. `src/components/site/Treks.tsx` (public cards + detail modal)
- Replace the current price block (which renders `startingPrice` and `topEndPrice` on separate lines with parenthetical labels) with a single line:
  - `Starting Price Rs. 15,800/-`
- Applies to both the card view (~line 249) and the open-trek detail view (~line 293).
- Fallback logic unchanged: if `startingPrice` is null, fall back to `price` (also rendered in the same "Starting Price Rs. X/-" format); if neither is set, render nothing / current "Price on request" behaviour is preserved.
- The `topEndPrice` / label fields are simply no longer read.

### 3. Not touched
- Database schema (`starting_price`, `top_end_price`, `*_label` columns stay — they just stop being written/read).
- `BookingPage.tsx` pricing (uses the flat `price` column and is unrelated to this display).
- Any other file.

## Technical notes
- No migration is included — keeping the extra columns dormant avoids destructive changes and lets us restore range pricing later if needed. If you'd rather drop the columns entirely, say so and I'll add a migration.
- Display format is hard-coded as `Starting Price Rs. {value.toLocaleString("en-IN")}/-` to match the reference image exactly (note: "Rs." not "₹", and the trailing `/-`).
