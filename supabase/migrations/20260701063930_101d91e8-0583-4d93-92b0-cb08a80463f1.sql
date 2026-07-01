
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- Restrict itineraries bucket reads: only users with a confirmed booking for
-- the matching trek, or admins, may download itinerary files.
CREATE POLICY "Itineraries readable by booked users or admins"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'itineraries'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.upcoming_treks t ON t.id = b.trek_id
      WHERE b.user_id = auth.uid()
        AND b.status = 'confirmed'
        AND t.itinerary_file_path = storage.objects.name
    )
  )
);
