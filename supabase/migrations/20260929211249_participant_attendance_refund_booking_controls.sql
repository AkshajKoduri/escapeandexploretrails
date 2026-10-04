BEGIN;
ALTER TABLE public.bookings
  ADD COLUMN primary_no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN refund_approved numeric(12,2),
  ADD COLUMN amount_refunded numeric(12,2),
  ADD COLUMN refund_status text GENERATED ALWAYS AS (
    CASE WHEN coalesce(refund_approved,0)=0 THEN 'not_applicable'
      WHEN coalesce(amount_refunded,0)=0 THEN 'pending'
      WHEN amount_refunded<refund_approved THEN 'partial' ELSE 'refunded' END
  ) STORED,
  ADD CONSTRAINT refund_amounts_valid CHECK (
    (refund_approved IS NULL AND amount_refunded IS NULL) OR
    (refund_approved IS NOT NULL AND amount_refunded IS NOT NULL
      AND refund_approved >= 0 AND refund_approved <> 'NaN'::numeric
      AND amount_refunded >= 0 AND amount_refunded <= refund_approved
      AND (refund_approved=0 OR (amount_paid IS NOT NULL AND refund_approved<=amount_paid)))
  );
ALTER TABLE public.booking_members ADD COLUMN no_show boolean NOT NULL DEFAULT false;

-- Use the same trek row lock as public booking creation, including manual inserts.
CREATE FUNCTION public.guard_booking_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.upcoming_treks%ROWTYPE; used integer;
BEGIN
  IF NEW.status='cancelled' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW.trek_id IS NOT DISTINCT FROM OLD.trek_id AND NEW.trek_date IS NOT DISTINCT FROM OLD.trek_date
    AND NEW.seats_booked IS NOT DISTINCT FROM OLD.seats_booked THEN RETURN NEW; END IF;
  SELECT * INTO t FROM public.upcoming_treks WHERE id=NEW.trek_id FOR UPDATE;
  IF t.id IS NULL OR t.is_archived OR t.is_draft THEN RAISE EXCEPTION 'Select an active published trip'; END IF;
  IF NEW.trek_date IS NULL OR NEW.trek_date<CURRENT_DATE THEN RAISE EXCEPTION 'Select a current or upcoming departure before confirming'; END IF;
  IF NEW.trek_date IS DISTINCT FROM t.trek_date AND NOT (NEW.trek_date=ANY(coalesce(t.additional_dates,ARRAY[]::date[]))) THEN
    RAISE EXCEPTION 'This departure is no longer offered'; END IF;
  SELECT coalesce(sum(seats_booked),0) INTO used FROM public.bookings
    WHERE trek_id=NEW.trek_id AND trek_date=NEW.trek_date AND status<>'cancelled' AND id<>NEW.id;
  IF used+NEW.seats_booked>t.max_seats THEN RAISE EXCEPTION 'Not enough seats available for this booking'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_booking_capacity() FROM PUBLIC;
CREATE TRIGGER guard_booking_capacity BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_capacity();

CREATE FUNCTION public.set_participant_attendance(p_booking_id uuid,p_member_id uuid,p_no_show boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF p_no_show IS NULL THEN RAISE EXCEPTION 'Attendance is required'; END IF;
  IF p_no_show AND b.status<>'confirmed' THEN RAISE EXCEPTION 'Only confirmed participants can be marked as no show'; END IF;
  IF p_member_id IS NULL THEN UPDATE public.bookings SET primary_no_show=p_no_show WHERE id=b.id;
  ELSE
    UPDATE public.booking_members SET no_show=p_no_show WHERE id=p_member_id AND booking_id=b.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found in this booking'; END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_participant_attendance(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_participant_attendance(uuid,uuid,boolean) TO service_role;
COMMENT ON COLUMN public.bookings.refund_approved IS 'NULL means not recorded; approved amount for the entire booking. Does not issue a transfer.';
COMMENT ON COLUMN public.booking_members.no_show IS 'False means not marked, not confirmed attendance. Does not release seats.';
COMMIT;
