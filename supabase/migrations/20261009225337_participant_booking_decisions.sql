BEGIN;
ALTER TABLE public.bookings ADD COLUMN primary_status text,
  ADD COLUMN reserved_seats integer;
ALTER TABLE public.booking_members ADD COLUMN status text;
UPDATE public.bookings SET primary_status=status,
  reserved_seats=CASE WHEN status='cancelled' THEN 0 ELSE seats_booked END;
UPDATE public.booking_members m SET status=b.status FROM public.bookings b WHERE b.id=m.booking_id;
ALTER TABLE public.bookings ADD CONSTRAINT primary_status_valid CHECK (primary_status IN ('pending','confirmed','cancelled')),
  ADD CONSTRAINT reserved_seats_valid CHECK (reserved_seats BETWEEN 0 AND seats_booked);
ALTER TABLE public.booking_members ADD CONSTRAINT participant_status_valid CHECK (status IN ('pending','confirmed','cancelled'));

-- The booking RPC inserts the parent before its members. Reserve the requested
-- group size immediately; participant decisions later change only reserved_seats.
CREATE FUNCTION public.initialize_participant_status() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='bookings' THEN
    NEW.primary_status:=NEW.status;
    NEW.reserved_seats:=CASE WHEN NEW.status='cancelled' THEN 0 ELSE NEW.seats_booked END;
  ELSE
    SELECT status INTO NEW.status FROM public.bookings WHERE id=NEW.booking_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.initialize_participant_status() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_initialize_participant_status BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.initialize_participant_status();
CREATE TRIGGER a_initialize_participant_status BEFORE INSERT ON public.booking_members
  FOR EACH ROW EXECUTE FUNCTION public.initialize_participant_status();
ALTER TABLE public.bookings ALTER COLUMN primary_status SET NOT NULL, ALTER COLUMN reserved_seats SET NOT NULL;
ALTER TABLE public.booking_members ALTER COLUMN status SET NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_booking_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.upcoming_treks%ROWTYPE; used integer;
BEGIN
  IF NEW.status='cancelled' OR NEW.reserved_seats=0 THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.trek_id IS NOT DISTINCT FROM OLD.trek_id
    AND NEW.trek_date IS NOT DISTINCT FROM OLD.trek_date
    AND NEW.reserved_seats<=OLD.reserved_seats THEN RETURN NEW; END IF;
  SELECT * INTO t FROM public.upcoming_treks WHERE id=NEW.trek_id FOR UPDATE;
  IF t.id IS NULL OR t.is_archived OR t.is_draft THEN RAISE EXCEPTION 'Select an active published trip'; END IF;
  IF NEW.trek_date IS NULL OR NEW.trek_date<CURRENT_DATE THEN RAISE EXCEPTION 'Select a current or upcoming departure before confirming'; END IF;
  IF NEW.trek_date IS DISTINCT FROM t.trek_date AND NOT (NEW.trek_date=ANY(coalesce(t.additional_dates,ARRAY[]::date[]))) THEN
    RAISE EXCEPTION 'This departure is no longer offered'; END IF;
  SELECT coalesce(sum(reserved_seats),0) INTO used FROM public.bookings
    WHERE trek_id=NEW.trek_id AND trek_date=NEW.trek_date AND id<>NEW.id;
  IF used+NEW.reserved_seats>t.max_seats THEN RAISE EXCEPTION 'Not enough seats available for this participant'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_trek_seats_taken() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.upcoming_treks SET seats_taken=seats_taken+NEW.reserved_seats WHERE id=NEW.trek_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.upcoming_treks SET seats_taken=greatest(seats_taken-OLD.reserved_seats,0) WHERE id=OLD.trek_id;
  ELSIF NEW.trek_id IS NOT DISTINCT FROM OLD.trek_id THEN
    IF NEW.reserved_seats<>OLD.reserved_seats THEN
      UPDATE public.upcoming_treks SET seats_taken=greatest(seats_taken+NEW.reserved_seats-OLD.reserved_seats,0) WHERE id=NEW.trek_id;
    END IF;
  ELSE
    UPDATE public.upcoming_treks SET seats_taken=greatest(seats_taken-OLD.reserved_seats,0) WHERE id=OLD.trek_id;
    UPDATE public.upcoming_treks SET seats_taken=seats_taken+NEW.reserved_seats WHERE id=NEW.trek_id;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION public.set_participant_booking_status(p_booking_id uuid,p_member_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bookings%ROWTYPE; t public.upcoming_treks%ROWTYPE; current_status text; active_count integer; confirmed_count integer; pending_count integer; member_count integer;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('confirmed','cancelled') THEN RAISE EXCEPTION 'Invalid participant status'; END IF;
  -- Same lock order as public booking creation: trip first, then booking.
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  SELECT * INTO t FROM public.upcoming_treks WHERE id=b.trek_id FOR UPDATE;
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF p_member_id IS NULL THEN current_status:=b.primary_status;
  ELSE
    SELECT status INTO current_status FROM public.booking_members WHERE id=p_member_id AND booking_id=b.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found in this booking'; END IF;
  END IF;
  IF current_status=p_status THEN RETURN; END IF;
  IF p_status='confirmed' THEN
    IF t.id IS NULL OR t.is_archived OR t.is_draft THEN RAISE EXCEPTION 'Select an active published trip'; END IF;
    IF b.trek_date IS NULL OR b.trek_date<CURRENT_DATE THEN RAISE EXCEPTION 'Select a current or upcoming departure before confirming'; END IF;
    IF b.trek_date IS DISTINCT FROM t.trek_date AND NOT (b.trek_date=ANY(coalesce(t.additional_dates,ARRAY[]::date[]))) THEN RAISE EXCEPTION 'This departure is no longer offered'; END IF;
  END IF;
  IF p_member_id IS NULL THEN
    UPDATE public.bookings SET primary_status=p_status WHERE id=b.id;
  ELSE
    UPDATE public.booking_members SET status=p_status WHERE id=p_member_id AND booking_id=b.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found in this booking'; END IF;
  END IF;
  SELECT count(*) FILTER (WHERE s<>'cancelled'),count(*) FILTER (WHERE s='confirmed'),count(*) FILTER (WHERE s='pending')
    INTO active_count,confirmed_count,pending_count FROM (
      SELECT primary_status s FROM public.bookings WHERE id=b.id
      UNION ALL SELECT status FROM public.booking_members WHERE booking_id=b.id
    ) people;
  SELECT count(*) INTO member_count FROM public.booking_members WHERE booking_id=b.id;
  IF member_count+1<>b.seats_booked THEN RAISE EXCEPTION 'Participant records do not match the group size. Review this booking before changing status'; END IF;
  UPDATE public.bookings SET reserved_seats=active_count,
    status=CASE WHEN confirmed_count>0 THEN 'confirmed' WHEN pending_count>0 THEN 'pending' ELSE 'cancelled' END
    WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.set_participant_booking_status(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_participant_booking_status(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.set_participant_attendance(p_booking_id uuid,p_member_id uuid,p_no_show boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bookings%ROWTYPE; participant_status text;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF p_no_show IS NULL THEN RAISE EXCEPTION 'Attendance is required'; END IF;
  IF p_member_id IS NULL THEN participant_status:=b.primary_status;
  ELSE
    SELECT status INTO participant_status FROM public.booking_members WHERE id=p_member_id AND booking_id=b.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found in this booking'; END IF;
  END IF;
  IF p_no_show AND participant_status<>'confirmed' THEN RAISE EXCEPTION 'Only confirmed participants can be marked as no show'; END IF;
  IF p_member_id IS NULL THEN UPDATE public.bookings SET primary_no_show=p_no_show WHERE id=b.id;
  ELSE UPDATE public.booking_members SET no_show=p_no_show WHERE id=p_member_id AND booking_id=b.id; END IF;
END $$;

-- Keep the existing validated public RPC and its grants, replacing only the
-- capacity operand. No package/payment/validation behavior changes.
DO $$ DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.create_booking_v2(uuid,date,text,text,text,integer,text,jsonb,text,uuid)'::regprocedure) INTO definition;
  IF position('coalesce(b.seats_booked, 1)' in definition)=0 THEN RAISE EXCEPTION 'Unexpected booking RPC capacity expression'; END IF;
  EXECUTE replace(definition,'coalesce(b.seats_booked, 1)','coalesce(b.reserved_seats, b.seats_booked, 1)');
  SELECT pg_get_functiondef('public.get_trek_departure_stats()'::regprocedure) INTO definition;
  IF position('coalesce(b.seats_booked, 1)' in definition)=0 THEN RAISE EXCEPTION 'Unexpected departure statistics expression'; END IF;
  EXECUTE replace(definition,'coalesce(b.seats_booked, 1)','coalesce(b.reserved_seats, b.seats_booked, 1)');
  SELECT pg_get_functiondef('public.get_explorer_count()'::regprocedure) INTO definition;
  EXECUTE replace(definition,'SUM(seats_booked)','SUM(reserved_seats)');
END $$;
COMMENT ON COLUMN public.bookings.reserved_seats IS 'Pending and confirmed participants reserve seats. No-show retains reservation. Original seats_booked and payment snapshots stay unchanged.';
COMMIT;
