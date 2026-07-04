
-- Drop permissive public policies on bookings
DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can delete bookings" ON public.bookings;

-- Drop permissive public policies on booking_members
DROP POLICY IF EXISTS "Public can view booking members" ON public.booking_members;
DROP POLICY IF EXISTS "Public can update booking members" ON public.booking_members;
DROP POLICY IF EXISTS "Public can delete booking members" ON public.booking_members;

-- Drop permissive public policies on callback_requests
DROP POLICY IF EXISTS "Public can view callback requests" ON public.callback_requests;
DROP POLICY IF EXISTS "Public can update callback requests" ON public.callback_requests;
DROP POLICY IF EXISTS "Public can delete callback requests" ON public.callback_requests;

-- Drop permissive public write policies on upcoming_treks (keep public SELECT policy)
DROP POLICY IF EXISTS "Public can insert treks" ON public.upcoming_treks;
DROP POLICY IF EXISTS "Public can update treks" ON public.upcoming_treks;
DROP POLICY IF EXISTS "Public can delete treks" ON public.upcoming_treks;

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Public read itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Public upload itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Public update itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Public delete itineraries" ON storage.objects;
DROP POLICY IF EXISTS "Public upload trek images" ON storage.objects;
DROP POLICY IF EXISTS "Public update trek images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete trek images" ON storage.objects;

-- Restrict EXECUTE on SECURITY DEFINER function has_role to server-side only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
