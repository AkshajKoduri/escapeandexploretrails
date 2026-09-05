-- =============================================================================
-- E2 TRAILS — PHASE 1: BOOKING INTEGRITY FOUNDATION (ONE-CLICK APPLY)
--
-- STATUS: Authored in the repository. NOT yet applied to any database.
-- Apply: Supabase dashboard -> SQL Editor -> paste this WHOLE file -> Run.
-- No CLI, no keys, one click. See supabase/PHASE1_APPLY_CHECKLIST.md.
--
-- This migration makes the web-booking system safe WITHOUT an edge-function
-- deploy: public.create_booking() is SECURITY DEFINER and granted to the
-- anonymous role, so the website calls it directly (like an API). The browser
-- never gets table grants on booking rows and can never choose status,
-- payment_status, booking_source, seat counts or ids.
--
-- What this migration does
--   1. Adds bookings.trek_date      (the customer-selected date, validated)
--   2. Adds bookings.client_ref     (idempotency key: retries never duplicate)
--   3. CHECK seats_booked >= 1
--   4. FK bookings.trek_id -> upcoming_treks.id (only if no orphaned rows)
--   5. Fixes the anonymous has_role() 401: every RLS policy whose expression
--      calls has_role() is scoped so it only applies to authenticated users
--      (SELECT policies re-created TO authenticated; unused INSERT/UPDATE/
--      DELETE has_role policies dropped — the admin UI runs through the
--      service-role edge function, which bypasses RLS).
--   6. Removes anonymous direct-write on bookings / booking_members /
--      upcoming_treks (grants + policies). After this, the ONLY public write
--      path is public.create_booking(). callback_requests keeps its anon
--      INSERT — the callback form writes directly and has no privileged fields.
--   7. public.get_explorer_count() — a purpose-built, SECURITY DEFINER,
--      counts-only function the homepage calls for "Explorers guided" so anon
--      never needs raw access to booking rows (fixes the "0+ Explorers" bug).
--   8. public.create_booking(...) — the atomic, race-safe booking gateway,
--      callable by anon. Validates trek + date + capacity under a row lock,
--      sets status/payment_status/booking_source itself, dedupes on
--      client_ref, inserts booking + members in one transaction.
--
-- Transition note: until the frontend cutover, the old client insert path
-- keeps failing exactly as it does today (has_role 401 inside the seat-sync
-- trigger). This migration does not regress the live flow; it makes the safe
-- path possible. Apply it, confirm back, and the cutover follows.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1 + 2. trek_date + client_ref (idempotency key)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS trek_date date,
  ADD COLUMN IF NOT EXISTS client_ref uuid;

-- NULLs are allowed (admin/manual bookings have no client_ref); PostgreSQL
-- treats NULLs as distinct in unique indexes, so this never blocks legit rows.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_client_ref_uidx
  ON public.bookings (client_ref);

-- ---------------------------------------------------------------------------
-- 3. Sanity constraint on seats (guarded: no IF NOT EXISTS for constraints)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_seats_booked_positive'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_seats_booked_positive CHECK (seats_booked >= 1);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Foreign key bookings.trek_id -> upcoming_treks.id (skip if orphans exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_trek_id_fkey'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.trek_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.upcoming_treks t WHERE t.id = b.trek_id)
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Skipping bookings_trek_id_fkey: orphaned trek_id rows exist. Clean them up, then add the FK manually.';
    RETURN;
  END IF;

  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_trek_id_fkey
    FOREIGN KEY (trek_id) REFERENCES public.upcoming_treks(id) ON DELETE SET NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Stop anonymous access from erroring on has_role()
--
-- Any RLS policy on the tables below whose expression calls has_role() raises
-- "permission denied for function has_role" for anon (EXECUTE is service_role
-- only). SELECT policies are re-created TO authenticated so anon reads return
-- empty instead of an error; other commands (INSERT/UPDATE/DELETE/ALL) that
-- depend on has_role are dropped because no current app path uses them (the
-- admin UI goes through the service-role edge function, which bypasses RLS).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname IN ('public')
      AND tablename IN ('bookings', 'booking_members', 'user_roles',
                        'profiles', 'team_members', 'upcoming_treks')
      AND position('has_role' in coalesce(qual, '')) > 0
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF pol.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (%s)',
        pol.policyname, pol.schemaname, pol.tablename, pol.qual
      );
      RAISE NOTICE 'Scoped policy % on % to authenticated only', pol.policyname, pol.tablename;
    ELSE
      RAISE NOTICE 'Dropped unused % policy % on % (service role covers admin paths)', pol.cmd, pol.policyname, pol.tablename;
    END IF;
  END LOOP;
END $$;

-- Same treatment for storage policies that call has_role().
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND position('has_role' in coalesce(qual, '')) > 0
    ORDER BY policyname
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
    IF pol.cmd = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (%s)',
        pol.policyname, pol.qual
      );
      RAISE NOTICE 'Scoped storage policy % to authenticated only', pol.policyname;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Remove the anonymous direct-write surface on booking data.
--    After this migration the ONLY public write path is public.create_booking()
--    (granted to anon below) — the browser can no longer INSERT into these
--    tables, so it cannot set status / payment_status / seats / ids itself.
--    Callback form keeps its anon INSERT.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can insert booking members" ON public.booking_members;
DROP POLICY IF EXISTS "Public can insert treks" ON public.upcoming_treks;

REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.booking_members FROM anon;
-- upcoming_treks keeps its public SELECT (the whole website reads it); only
-- anonymous writes are removed.
REVOKE INSERT, UPDATE, DELETE ON public.upcoming_treks FROM anon;

-- ---------------------------------------------------------------------------
-- 7. Purpose-built public stats (counts only — anon never touches booking rows)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_explorer_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(seats_booked), 0)::bigint
  FROM public.bookings
  WHERE status IS DISTINCT FROM 'cancelled'
$$;

REVOKE ALL ON FUNCTION public.get_explorer_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_explorer_count() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Atomic, server-authoritative booking gateway (SECURITY DEFINER)
--
-- This function IS the public booking API. The website calls it with the
-- anonymous role; SECURITY DEFINER makes it run as its owner (postgres), so
-- it can write booking rows while the browser itself holds zero grants on the
-- booking tables. The function signature is the allow-list: the caller can
-- NEVER choose status, payment_status, booking_source, seat counts or ids.
-- All-or-nothing: the trek row is locked FOR UPDATE (serialises concurrent
-- bookings on the shared pool), the date is validated against the trek's real
-- dates and the past, capacity is checked under the lock, and the AFTER INSERT
-- trigger increments seats_taken inside the same transaction (no double
-- counting because the function never updates seats_taken itself). Retries
-- with the same client_ref return the original booking, never a duplicate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking(
  p_trek_id uuid,
  p_trek_date date,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_members text[] DEFAULT NULL,
  p_client_ref uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trek public.upcoming_treks;
  v_seats integer;
  v_booking_id uuid;
  v_existing uuid;
  v_remaining integer;
  v_members text[];
BEGIN
  -- --- Server-side input validation (the browser sends ONLY these fields) ---
  IF p_trek_id IS NULL OR p_trek_date IS NULL
     OR btrim(coalesce(p_name, '')) = '' OR btrim(coalesce(p_phone, '')) = '' THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF char_length(btrim(p_name)) > 120 OR char_length(btrim(p_phone)) > 20 THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_age IS NOT NULL AND (p_age < 1 OR p_age > 120) THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF p_email IS NOT NULL AND btrim(p_email) <> '' AND position('@' in p_email) = 0 THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  v_members := ARRAY(SELECT btrim(m) FROM unnest(coalesce(p_members, ARRAY[]::text[])) AS m WHERE btrim(m) <> '');
  v_seats := 1 + cardinality(v_members);
  IF v_seats > 12 THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_seats');
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_members) AS m WHERE char_length(m) > 120) THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  -- --- Idempotency: same submission key already processed? ---
  IF p_client_ref IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.bookings
    WHERE client_ref = p_client_ref
    LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN json_build_object('ok', true, 'created', false,
                               'booking_id', v_existing, 'seats', v_seats);
    END IF;
  END IF;

  -- --- Lock the trek row: concurrent bookings on the same trek serialize here ---
  SELECT * INTO v_trek
  FROM public.upcoming_treks
  WHERE id = p_trek_id
    AND is_draft = false
    AND is_archived = false
  FOR UPDATE;

  IF v_trek.id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'trek_not_found');
  END IF;

  -- --- The selected date must be real and not in the past ---
  IF p_trek_date < CURRENT_DATE THEN
    RETURN json_build_object('ok', false, 'code', 'expired_date');
  END IF;
  IF p_trek_date IS DISTINCT FROM v_trek.trek_date
     AND NOT (p_trek_date = ANY(coalesce(v_trek.additional_dates, ARRAY[]::date[]))) THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_date');
  END IF;

  -- --- Capacity check under the lock (shared per-trek pool, as the product
  --     behaves today). The AFTER INSERT trigger performs the increment in
  --     this same transaction, so the count stays consistent. ---
  v_remaining := coalesce(v_trek.max_seats, 0) - coalesce(v_trek.seats_taken, 0);
  IF v_seats > v_remaining THEN
    RETURN json_build_object('ok', false, 'code', 'sold_out',
                             'remaining', GREATEST(v_remaining, 0));
  END IF;

  -- --- Insert booking + members (atomic with the seat increment above) ---
  v_booking_id := gen_random_uuid();
  INSERT INTO public.bookings (
    id, trek_id, trek_date, trek_name, primary_name, primary_age, primary_gender,
    primary_phone, primary_email, primary_aadhaar, primary_aadhaar_photo,
    is_group, seats_booked, status, payment_status, booking_source, client_ref
  ) VALUES (
    v_booking_id, p_trek_id, p_trek_date, v_trek.name, btrim(p_name), p_age, p_gender,
    btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''), NULL, NULL,
    cardinality(v_members) > 0, v_seats, 'pending', 'pending', 'online', p_client_ref
  );

  IF cardinality(v_members) > 0 THEN
    INSERT INTO public.booking_members (booking_id, full_name, aadhaar_number, aadhaar_photo)
    SELECT v_booking_id, m, '', ''
    FROM unnest(v_members) AS m;
  END IF;

  RETURN json_build_object('ok', true, 'created', true,
                           'booking_id', v_booking_id, 'seats', v_seats,
                           'trek_date', p_trek_date::text);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, date, text, text, text, integer, text, text[], uuid) FROM PUBLIC;
-- anon = the website's public booking form; authenticated = future logged-in
-- bookings; service_role = admin/manual + optional future edge function.
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, text, text, text, integer, text, text[], uuid) TO anon, authenticated, service_role;

-- Re-assert the seat-sync trigger exists (guards against a drifted DB where it
-- may have been dropped; the capacity logic above depends on it).
CREATE OR REPLACE FUNCTION public.sync_trek_seats_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_active boolean := (TG_OP IN ('UPDATE','DELETE')) AND (OLD.status IS DISTINCT FROM 'cancelled');
  new_active boolean := (TG_OP IN ('INSERT','UPDATE')) AND (NEW.status IS DISTINCT FROM 'cancelled');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF new_active THEN
      UPDATE public.upcoming_treks
        SET seats_taken = seats_taken + COALESCE(NEW.seats_booked, 1)
        WHERE id = NEW.trek_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF old_active THEN
      UPDATE public.upcoming_treks
        SET seats_taken = GREATEST(seats_taken - COALESCE(OLD.seats_booked, 1), 0)
        WHERE id = OLD.trek_id;
    END IF;
  ELSE -- UPDATE
    IF old_active AND OLD.trek_id IS NOT NULL THEN
      UPDATE public.upcoming_treks
        SET seats_taken = GREATEST(seats_taken - COALESCE(OLD.seats_booked, 1), 0)
        WHERE id = OLD.trek_id;
    END IF;
    IF new_active AND NEW.trek_id IS NOT NULL THEN
      UPDATE public.upcoming_treks
        SET seats_taken = seats_taken + COALESCE(NEW.seats_booked, 1)
        WHERE id = NEW.trek_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_seats ON public.bookings;
CREATE TRIGGER bookings_sync_seats
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_trek_seats_taken();

COMMIT;
