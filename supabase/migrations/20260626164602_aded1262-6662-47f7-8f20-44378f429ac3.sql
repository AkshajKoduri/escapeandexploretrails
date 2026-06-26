
-- 1. user_roles: drop recursive admin policy so has_role can be SECURITY INVOKER
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;

-- 2. Convert has_role from SECURITY DEFINER to SECURITY INVOKER
--    Relies on user_roles RLS "Users view own roles" (auth.uid() = user_id) to scope reads.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 3. Replace SECURITY DEFINER get_trek_seat_stats with a view + invoker function.
--    The view aggregates counts only (no PII) and is readable by anon/authenticated.
CREATE OR REPLACE VIEW public.trek_seat_stats AS
SELECT
  t.id AS trek_id,
  t.max_seats,
  COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int AS seats_taken,
  GREATEST(t.max_seats - COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int, 0) AS seats_remaining
FROM public.upcoming_treks t
LEFT JOIN public.bookings b ON b.trek_id = t.id
GROUP BY t.id, t.max_seats;

GRANT SELECT ON public.trek_seat_stats TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_trek_seat_stats()
RETURNS TABLE(trek_id uuid, max_seats integer, seats_taken integer, seats_remaining integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT trek_id, max_seats, seats_taken, seats_remaining FROM public.trek_seat_stats;
$$;

-- 4. Storage: remove broad SELECT/listing policies on public buckets.
--    Files in public buckets still load via getPublicUrl (direct CDN access).
DROP POLICY IF EXISTS "Public read trek images" ON storage.objects;
DROP POLICY IF EXISTS "Itineraries are publicly accessible" ON storage.objects;

-- 5. Storage: allow users to UPDATE their own Aadhaar photo (mirrors existing INSERT/DELETE/SELECT).
DROP POLICY IF EXISTS "Users update own aadhaar" ON storage.objects;
CREATE POLICY "Users update own aadhaar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'aadhaar-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'aadhaar-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6. booking_members: allow users to update/delete their own group members.
DROP POLICY IF EXISTS "Users update own booking members" ON public.booking_members;
CREATE POLICY "Users update own booking members"
ON public.booking_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_members.booking_id AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_members.booking_id AND b.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users delete own booking members" ON public.booking_members;
CREATE POLICY "Users delete own booking members"
ON public.booking_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_members.booking_id AND b.user_id = auth.uid()
  )
);
