ALTER TABLE public.upcoming_treks ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE POLICY "Admins update any booking"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));