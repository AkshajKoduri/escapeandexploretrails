
-- Recreate with security_invoker = false so aggregated counts include all bookings
DROP VIEW IF EXISTS public.trek_seat_stats;

CREATE VIEW public.trek_seat_stats
WITH (security_invoker = false) AS
SELECT
  t.id AS trek_id,
  t.max_seats,
  COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int AS seats_taken,
  GREATEST(t.max_seats - COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int, 0) AS seats_remaining
FROM public.upcoming_treks t
LEFT JOIN public.bookings b ON b.trek_id = t.id
GROUP BY t.id, t.max_seats;

GRANT SELECT ON public.trek_seat_stats TO anon, authenticated;
