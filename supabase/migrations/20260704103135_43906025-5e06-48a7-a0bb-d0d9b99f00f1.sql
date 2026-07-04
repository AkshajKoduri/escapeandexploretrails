
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upcoming_treks TO anon;

CREATE POLICY "Public can insert bookings" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can view bookings" ON public.bookings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can update bookings" ON public.bookings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete bookings" ON public.bookings
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public can insert booking members" ON public.booking_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can view booking members" ON public.booking_members
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public can update booking members" ON public.booking_members
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete booking members" ON public.booking_members
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public can insert treks" ON public.upcoming_treks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public can update treks" ON public.upcoming_treks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete treks" ON public.upcoming_treks
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Public upload trek images" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'trek-images');
CREATE POLICY "Public update trek images" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'trek-images') WITH CHECK (bucket_id = 'trek-images');
CREATE POLICY "Public delete trek images" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'trek-images');

CREATE POLICY "Public read itineraries" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'itineraries');
CREATE POLICY "Public upload itineraries" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'itineraries');
CREATE POLICY "Public update itineraries" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'itineraries') WITH CHECK (bucket_id = 'itineraries');
CREATE POLICY "Public delete itineraries" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'itineraries');
