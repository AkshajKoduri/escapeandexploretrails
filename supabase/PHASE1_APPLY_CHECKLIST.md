# Phase 1 — One-click apply (no CLI, no credentials, no SQL writing)

This setup was redesigned so you never touch a terminal, never paste an API key,
and never deploy an "edge function". The whole database fix is **one file** you
paste into Supabase's web editor and click **Run**. That's it.

## What the file does (plain English)

1. Remembers the **date** your customer picked (`trek_date`).
2. Gives every booking a **receipt key** so a double-tap or refresh can never
   create two bookings.
3. Makes **seats safe**: the database itself refuses to oversell, even if two
   people book at the exact same moment, and a browser can no longer claim 50
   seats or mark itself "confirmed/paid".
4. Fixes the bug that makes the homepage show **"0+ Explorers guided"** by
   adding a safe count-only function the site can call.
5. Adds a safety rule linking each booking to a real trek (only if your data
   has no orphaned rows — if it does, the file skips that step and tells you).

The website itself is **not changed yet** — we flip it over after this runs and
you confirm.

---

## THE ONE STEP

1. In your browser, go to **https://supabase.com/dashboard** and sign in with
   the account that owns the E2 Trails project.
2. Click **your project** (the one whose URL contains `ciyvzklkslygizjnbjxw`).
3. On the left sidebar click **SQL Editor**.
4. Click the green **+ New query** button.
5. Open this file on your computer:
   `supabase/migrations/20260713000000_booking_integrity_foundation.sql`
   — select **everything** in it (Ctrl+A) and copy (Ctrl+C).
6. Click into the big empty editor box and paste (Ctrl+V).
7. Click the blue **Run** button at the bottom right.
8. You should see a green **"Success. No rows returned"** message.
   (A yellow "NOTICE" about skipping the foreign key is fine — tell us if you
   see one.)

That's the whole database change. **No rollback needed — everything here is
additive or reversible.**

---

## Optional: 30-second confidence check (read-only, safe)

If you'd like proof it worked, paste this into a new query and click Run — all
three should return success (numbers/rows), not red errors:

```sql
-- 1) the explorer counter exists
select public.get_explorer_count() as explorers;

-- 2) the booking gateway exists
select proname from pg_proc where proname = 'create_booking';

-- 3) the new booking columns exist
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'bookings'
  and column_name in ('trek_date', 'client_ref')
order by 1;
```

If all three succeed, the foundation is live.

---

## What happens next (after you confirm)

The developer then:

- flips the booking form to the new safe gateway (date is kept end-to-end,
  bookings start as "pending — we'll call you", no self-confirmation),
- points the homepage counter at the new safe function,
- tests real bookings end-to-end (valid, sold-out, duplicate-tap, bad date),
- then the trek-detail page + booking UX work can land on top.

## Honest known limits (not hidden)

- No per-visitor rate limiting yet — a determined spammer could create junk
  pending bookings. The database now refuses overselling and admins can cancel
  junk (seats return automatically). True rate limiting comes later via an edge
  function or bot protection, deployed after this foundation is live.
- This fixes the *booking path and data safety*. The visual redesign of the
  booking pages is a separate, later step.
