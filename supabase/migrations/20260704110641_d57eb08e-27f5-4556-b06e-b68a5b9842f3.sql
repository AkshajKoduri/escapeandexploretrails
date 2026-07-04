DROP POLICY IF EXISTS "Admins can view callback requests" ON public.callback_requests;
DROP POLICY IF EXISTS "Admins can update callback requests" ON public.callback_requests;
DROP POLICY IF EXISTS "Admins can delete callback requests" ON public.callback_requests;

GRANT SELECT, UPDATE, DELETE ON public.callback_requests TO anon;

CREATE POLICY "Public can view callback requests"
  ON public.callback_requests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can update callback requests"
  ON public.callback_requests FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can delete callback requests"
  ON public.callback_requests FOR DELETE
  TO anon, authenticated
  USING (true);
