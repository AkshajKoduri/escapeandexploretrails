BEGIN;

-- Booking-time package snapshots. All monetary values use exact numeric
-- arithmetic; nullable fields keep historical bookings backward compatible.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_package_id text,
  ADD COLUMN IF NOT EXISTS selected_package_name text,
  ADD COLUMN IF NOT EXISTS package_unit_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS package_price_basis text,
  ADD COLUMN IF NOT EXISTS package_currency text,
  ADD COLUMN IF NOT EXISTS booking_total numeric(12,2);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_package_unit_amount_nonnegative
    CHECK (package_unit_amount IS NULL OR package_unit_amount >= 0) NOT VALID,
  ADD CONSTRAINT bookings_booking_total_nonnegative
    CHECK (booking_total IS NULL OR booking_total >= 0) NOT VALID,
  ADD CONSTRAINT bookings_package_price_basis_valid
    CHECK (package_price_basis IS NULL OR package_price_basis IN ('per_person', 'per_booking')) NOT VALID,
  ADD CONSTRAINT bookings_package_currency_valid
    CHECK (package_currency IS NULL OR package_currency = 'INR') NOT VALID;

-- Existing name-only member rows remain valid. New public bookings validate
-- and populate these fields in create_booking_v2 below.
ALTER TABLE public.booking_members
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.booking_members
  ADD CONSTRAINT booking_members_age_valid
    CHECK (age IS NULL OR age BETWEEN 10 AND 99) NOT VALID,
  ADD CONSTRAINT booking_members_gender_valid
    CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other', 'Prefer not to say')) NOT VALID;

CREATE INDEX IF NOT EXISTS bookings_trek_departure_idx
  ON public.bookings (trek_id, trek_date)
  WHERE status IS DISTINCT FROM 'cancelled';

-- Aggregate only non-sensitive departure capacity. The function does not
-- expose booking or participant records and leaves their RLS/grants intact.
CREATE OR REPLACE FUNCTION public.get_trek_departure_stats()
RETURNS TABLE (
  trek_id uuid,
  trek_date date,
  max_seats integer,
  seats_taken bigint,
  seats_remaining bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH departures AS (
    SELECT t.id AS trek_id,
           d.trek_date,
           coalesce(t.max_seats, 0)::integer AS max_seats
    FROM public.upcoming_treks t
    CROSS JOIN LATERAL unnest(
      array_remove(ARRAY[t.trek_date] || coalesce(t.additional_dates, ARRAY[]::date[]), NULL)
    ) AS d(trek_date)
    WHERE t.is_archived = false AND t.is_draft = false
  ), booked AS (
    SELECT b.trek_id, b.trek_date, sum(coalesce(b.seats_booked, 1))::bigint AS seats_taken
    FROM public.bookings b
    WHERE b.status IS DISTINCT FROM 'cancelled' AND b.trek_date IS NOT NULL
    GROUP BY b.trek_id, b.trek_date
  )
  SELECT d.trek_id,
         d.trek_date,
         d.max_seats,
         coalesce(b.seats_taken, 0)::bigint,
         greatest(d.max_seats::bigint - coalesce(b.seats_taken, 0), 0)::bigint
  FROM departures d
  LEFT JOIN booked b USING (trek_id, trek_date);
$$;

REVOKE ALL ON FUNCTION public.get_trek_departure_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trek_departure_stats() TO anon, authenticated, service_role;

-- Versioned public booking RPC. Keeping create_booking in place prevents a
-- migration-first rollout from interrupting clients still on the old bundle.
CREATE OR REPLACE FUNCTION public.create_booking_v2(
  p_trek_id uuid,
  p_trek_date date,
  p_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_members jsonb DEFAULT '[]'::jsonb,
  p_package_id text DEFAULT NULL,
  p_client_ref uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_trek public.upcoming_treks;
  v_member jsonb;
  v_members jsonb := coalesce(p_members, '[]'::jsonb);
  v_seats integer;
  v_booking_id uuid;
  v_existing uuid;
  v_remaining integer;
  v_packages jsonb;
  v_package jsonb;
  v_package_count integer;
  v_package_id text := nullif(btrim(coalesce(p_package_id, '')), '');
  v_package_name text;
  v_unit_amount numeric(12,2);
  v_price_basis text;
  v_currency text;
  v_total numeric(12,2);
BEGIN
  IF p_trek_id IS NULL OR p_trek_date IS NULL
     OR btrim(coalesce(p_name, '')) = '' OR btrim(coalesce(p_phone, '')) = '' THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF char_length(btrim(p_name)) > 80
     OR btrim(p_phone) !~ '^[+]?[0-9 ()-]{7,20}$'
     OR p_age IS NULL OR p_age < 10 OR p_age > 99
     OR p_gender IS NULL OR p_gender NOT IN ('Male', 'Female', 'Other', 'Prefer not to say')
     OR (p_email IS NOT NULL AND btrim(p_email) <> '' AND (char_length(p_email) > 255 OR position('@' in p_email) = 0)) THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  IF jsonb_typeof(v_members) <> 'array' OR jsonb_array_length(v_members) > 11 THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_seats');
  END IF;

  FOR v_member IN SELECT value FROM jsonb_array_elements(v_members)
  LOOP
    IF jsonb_typeof(v_member) <> 'object'
       OR btrim(coalesce(v_member->>'full_name', '')) = ''
       OR char_length(btrim(v_member->>'full_name')) > 80
       OR coalesce(v_member->>'age', '') !~ '^[0-9]{1,2}$'
       OR (v_member->>'age')::integer NOT BETWEEN 10 AND 99
       OR coalesce(v_member->>'gender', '') NOT IN ('Male', 'Female', 'Other', 'Prefer not to say')
       OR btrim(coalesce(v_member->>'phone', '')) !~ '^[+]?[0-9 ()-]{7,20}$'
       OR (nullif(btrim(coalesce(v_member->>'email', '')), '') IS NOT NULL
           AND (char_length(v_member->>'email') > 255 OR position('@' in v_member->>'email') = 0)) THEN
      RETURN json_build_object('ok', false, 'code', 'invalid_member');
    END IF;
  END LOOP;
  v_seats := 1 + jsonb_array_length(v_members);

  IF p_client_ref IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.bookings WHERE client_ref = p_client_ref LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN json_build_object('ok', true, 'created', false, 'booking_id', v_existing, 'seats', v_seats);
    END IF;
  END IF;

  SELECT * INTO v_trek
  FROM public.upcoming_treks
  WHERE id = p_trek_id AND is_draft = false AND is_archived = false
  FOR UPDATE;
  IF v_trek.id IS NULL THEN RETURN json_build_object('ok', false, 'code', 'trek_not_found'); END IF;
  IF p_trek_date < CURRENT_DATE THEN RETURN json_build_object('ok', false, 'code', 'expired_date'); END IF;
  IF p_trek_date IS DISTINCT FROM v_trek.trek_date
     AND NOT (p_trek_date = ANY(coalesce(v_trek.additional_dates, ARRAY[]::date[]))) THEN
    RETURN json_build_object('ok', false, 'code', 'invalid_date');
  END IF;

  SELECT coalesce(v_trek.max_seats, 0) - coalesce(sum(coalesce(b.seats_booked, 1)), 0)
  INTO v_remaining
  FROM public.bookings b
  WHERE b.trek_id = p_trek_id AND b.trek_date = p_trek_date
    AND b.status IS DISTINCT FROM 'cancelled';
  IF v_seats > v_remaining THEN
    RETURN json_build_object('ok', false, 'code', 'sold_out', 'remaining', greatest(v_remaining, 0));
  END IF;

  v_packages := CASE
    WHEN jsonb_typeof(v_trek.trip_details->'packages') = 'array' THEN v_trek.trip_details->'packages'
    ELSE '[]'::jsonb
  END;
  v_package_count := jsonb_array_length(v_packages);
  IF v_package_count = 1 AND v_package_id IS NULL THEN
    v_package_id := v_packages->0->>'id';
  ELSIF v_package_count > 1 AND v_package_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'package_required');
  END IF;

  IF v_package_id IS NOT NULL THEN
    SELECT value INTO v_package
    FROM jsonb_array_elements(v_packages)
    WHERE value->>'id' = v_package_id
    LIMIT 1;
    IF v_package IS NULL THEN RETURN json_build_object('ok', false, 'code', 'invalid_package'); END IF;
    v_package_name := nullif(btrim(coalesce(v_package->>'name', '')), '');
    IF coalesce(v_package->>'priceAmount', '') ~ '^\d+(\.\d{1,2})?$' THEN
      v_unit_amount := (v_package->>'priceAmount')::numeric(12,2);
    END IF;
    v_price_basis := CASE WHEN v_package->>'priceBasis' IN ('per_person', 'per_booking') THEN v_package->>'priceBasis' END;
    v_currency := CASE WHEN coalesce(v_package->>'currency', 'INR') = 'INR' THEN 'INR' END;
    IF v_unit_amount IS NOT NULL AND (v_price_basis IS NULL OR v_currency IS NULL) THEN
      RETURN json_build_object('ok', false, 'code', 'invalid_package_price');
    END IF;
    v_total := CASE
      WHEN v_unit_amount IS NULL THEN NULL
      WHEN v_price_basis = 'per_person' THEN v_unit_amount * v_seats
      ELSE v_unit_amount
    END;
  END IF;

  v_booking_id := gen_random_uuid();
  INSERT INTO public.bookings (
    id, trek_id, trek_date, trek_name, primary_name, primary_age, primary_gender,
    primary_phone, primary_email, primary_aadhaar, primary_aadhaar_photo,
    is_group, seats_booked, status, payment_status, booking_source, client_ref,
    selected_package_id, selected_package_name, package_unit_amount,
    package_price_basis, package_currency, booking_total
  ) VALUES (
    v_booking_id, p_trek_id, p_trek_date, v_trek.name, btrim(p_name), p_age, p_gender,
    btrim(p_phone), nullif(btrim(coalesce(p_email, '')), ''), NULL, NULL,
    jsonb_array_length(v_members) > 0, v_seats, 'pending', 'pending', 'online', p_client_ref,
    v_package_id, v_package_name, v_unit_amount, v_price_basis, v_currency, v_total
  );

  INSERT INTO public.booking_members (
    booking_id, full_name, age, gender, phone, email, aadhaar_number, aadhaar_photo
  )
  SELECT v_booking_id,
         btrim(value->>'full_name'),
         (value->>'age')::integer,
         value->>'gender',
         btrim(value->>'phone'),
         nullif(btrim(coalesce(value->>'email', '')), ''),
         '', ''
  FROM jsonb_array_elements(v_members);

  RETURN json_build_object(
    'ok', true, 'created', true, 'booking_id', v_booking_id,
    'seats', v_seats, 'trek_date', p_trek_date::text,
    'package_name', v_package_name, 'unit_amount', v_unit_amount,
    'price_basis', v_price_basis, 'currency', v_currency, 'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_v2(uuid, date, text, text, text, integer, text, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_v2(uuid, date, text, text, text, integer, text, jsonb, text, uuid)
  TO anon, authenticated, service_role;

COMMIT;
