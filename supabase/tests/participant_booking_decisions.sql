BEGIN;
-- Run in a transaction and roll back: these fixtures never persist.
DO $$
DECLARE trip uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid(); one uuid:=gen_random_uuid(); two uuid:=gen_random_uuid();
  other_booking uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); failed boolean; snapshot jsonb;
BEGIN
  INSERT INTO public.upcoming_treks(id,name,trek_date,max_seats,price) VALUES(trip,'Participant decision verification',CURRENT_DATE+30,3,100);
  INSERT INTO public.bookings(id,trek_id,trek_date,trek_name,primary_name,primary_phone,is_group,seats_booked,booking_total,amount_paid)
    VALUES(booking,trip,CURRENT_DATE+30,'Participant decision verification','Primary fixture','000',true,3,300,100);
  INSERT INTO public.booking_members(id,booking_id,full_name,aadhaar_number,aadhaar_photo)
    VALUES(one,booking,'Member one','',''),(two,booking,'Member two','','');
  SELECT jsonb_build_object('total',booking_total,'paid',amount_paid,'payment',payment_status,'refund',refund_status,'seats',seats_booked)
    INTO snapshot FROM public.bookings WHERE id=booking;
  IF (SELECT reserved_seats FROM public.bookings WHERE id=booking)<>3 OR (SELECT seats_taken FROM public.upcoming_treks WHERE id=trip)<>3 THEN RAISE EXCEPTION 'Initial reservation incorrect'; END IF;
  PERFORM public.set_participant_booking_status(booking,one,'confirmed');
  IF (SELECT primary_status FROM public.bookings WHERE id=booking)<>'pending' OR (SELECT status FROM public.booking_members WHERE id=two)<>'pending' THEN RAISE EXCEPTION 'Unselected participants changed'; END IF;
  failed:=false;
  BEGIN PERFORM public.set_participant_attendance(booking,NULL,true); EXCEPTION WHEN raise_exception THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Pending primary accepted no-show'; END IF;
  PERFORM public.set_participant_attendance(booking,one,true);
  PERFORM public.set_participant_booking_status(booking,two,'cancelled');
  PERFORM public.set_participant_booking_status(booking,two,'cancelled');
  IF (SELECT reserved_seats FROM public.bookings WHERE id=booking)<>2 OR (SELECT seats_taken FROM public.upcoming_treks WHERE id=trip)<>2 THEN RAISE EXCEPTION 'Single cancellation or idempotency failed'; END IF;
  IF (SELECT seats_taken FROM public.get_trek_departure_stats() WHERE trek_id=trip AND trek_date=CURRENT_DATE+30)<>2 THEN RAISE EXCEPTION 'Departure statistics did not release seat'; END IF;
  INSERT INTO public.bookings(id,trek_id,trek_date,trek_name,primary_name,primary_phone)
    VALUES(other_booking,trip,CURRENT_DATE+30,'Participant decision verification','Other fixture','000');
  INSERT INTO public.booking_members(id,booking_id,full_name,aadhaar_number,aadhaar_photo)
    VALUES(outsider,other_booking,'Foreign member','','');
  failed:=false;
  BEGIN PERFORM public.set_participant_booking_status(booking,outsider,'confirmed'); EXCEPTION WHEN raise_exception THEN failed:=true; END;
  IF NOT failed THEN RAISE EXCEPTION 'Foreign participant accepted'; END IF;
  failed:=false;
  BEGIN PERFORM public.set_participant_booking_status(booking,two,'confirmed'); EXCEPTION WHEN raise_exception THEN failed:=true; END;
  IF NOT failed OR (SELECT status FROM public.booking_members WHERE id=two)<>'cancelled' THEN RAISE EXCEPTION 'Capacity failure did not roll back'; END IF;
  PERFORM public.set_participant_booking_status(booking,NULL,'confirmed');
  IF snapshot IS DISTINCT FROM (SELECT jsonb_build_object('total',booking_total,'paid',amount_paid,'payment',payment_status,'refund',refund_status,'seats',seats_booked) FROM public.bookings WHERE id=booking) THEN RAISE EXCEPTION 'Payment or original group size changed'; END IF;
  IF NOT (SELECT no_show FROM public.booking_members WHERE id=one) THEN RAISE EXCEPTION 'Attendance record lost'; END IF;
  PERFORM public.set_participant_booking_status(booking,NULL,'cancelled');
  PERFORM public.set_participant_booking_status(booking,one,'cancelled');
  IF (SELECT status FROM public.bookings WHERE id=booking)<>'cancelled' OR (SELECT reserved_seats FROM public.bookings WHERE id=booking)<>0 OR (SELECT seats_taken FROM public.upcoming_treks WHERE id=trip)<>1 THEN RAISE EXCEPTION 'All-cancelled state incorrect'; END IF;
END $$;

ROLLBACK;
