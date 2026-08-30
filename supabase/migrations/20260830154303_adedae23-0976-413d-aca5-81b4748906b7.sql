-- Public writes now go exclusively through the rate-limited, validated public-api edge function.
DROP POLICY IF EXISTS "Public can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public can insert booking members" ON public.booking_members;
DROP POLICY IF EXISTS "Anyone can insert callback requests" ON public.callback_requests;

REVOKE INSERT ON public.bookings FROM anon;
REVOKE INSERT ON public.booking_members FROM anon;
REVOKE INSERT ON public.callback_requests FROM anon;

GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.booking_members TO service_role;
GRANT ALL ON public.callback_requests TO service_role;