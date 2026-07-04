CREATE TABLE public.callback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID,
  trip_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  mobile_number TEXT NOT NULL,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.callback_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.callback_requests TO authenticated;
GRANT ALL ON public.callback_requests TO service_role;

ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert callback requests"
  ON public.callback_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view callback requests"
  ON public.callback_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update callback requests"
  ON public.callback_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete callback requests"
  ON public.callback_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
