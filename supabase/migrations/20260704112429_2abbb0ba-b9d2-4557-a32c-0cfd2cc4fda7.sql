
-- Bookings public INSERT with real validation
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
CREATE POLICY "Public can insert bookings"
  ON public.bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(btrim(primary_name)) > 0
    AND char_length(btrim(primary_phone)) > 0
    AND COALESCE(seats_booked, 1) >= 1
  );

-- Booking members public INSERT with real validation
DROP POLICY IF EXISTS "Public can insert booking members" ON public.booking_members;
CREATE POLICY "Public can insert booking members"
  ON public.booking_members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    booking_id IS NOT NULL
    AND char_length(btrim(full_name)) > 0
  );

-- Callback requests public INSERT with real validation
DROP POLICY IF EXISTS "Anyone can insert callback requests" ON public.callback_requests;
CREATE POLICY "Anyone can insert callback requests"
  ON public.callback_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(btrim(full_name)) > 0
    AND char_length(btrim(mobile_number)) > 0
  );
