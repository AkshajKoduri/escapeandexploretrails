
DROP VIEW IF EXISTS public.trek_seat_stats;

CREATE OR REPLACE FUNCTION public.get_trek_seat_stats()
RETURNS TABLE (trek_id uuid, max_seats integer, seats_taken integer, seats_remaining integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.max_seats,
    COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int,
    GREATEST(t.max_seats - COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int, 0)
  FROM public.upcoming_treks t
  LEFT JOIN public.bookings b ON b.trek_id = t.id
  GROUP BY t.id, t.max_seats;
$$;

GRANT EXECUTE ON FUNCTION public.get_trek_seat_stats() TO anon, authenticated;
