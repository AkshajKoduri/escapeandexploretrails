
-- Drop the view that tripped the security-definer-view linter
DROP VIEW IF EXISTS public.trek_seat_stats;

-- Add cached seat counters on upcoming_treks
ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS seats_taken integer NOT NULL DEFAULT 0;

-- Backfill from current bookings
UPDATE public.upcoming_treks t
SET seats_taken = COALESCE(sub.taken, 0)
FROM (
  SELECT trek_id, SUM(seats_booked)::int AS taken
  FROM public.bookings
  WHERE status <> 'cancelled'
  GROUP BY trek_id
) sub
WHERE sub.trek_id = t.id;

-- Trigger function to keep seats_taken in sync
CREATE OR REPLACE FUNCTION public.sync_trek_seats_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_active boolean := (TG_OP IN ('UPDATE','DELETE')) AND (OLD.status IS DISTINCT FROM 'cancelled');
  new_active boolean := (TG_OP IN ('INSERT','UPDATE')) AND (NEW.status IS DISTINCT FROM 'cancelled');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF new_active THEN
      UPDATE public.upcoming_treks
        SET seats_taken = seats_taken + COALESCE(NEW.seats_booked, 1)
        WHERE id = NEW.trek_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF old_active THEN
      UPDATE public.upcoming_treks
        SET seats_taken = GREATEST(seats_taken - COALESCE(OLD.seats_booked, 1), 0)
        WHERE id = OLD.trek_id;
    END IF;
  ELSE -- UPDATE
    IF old_active AND OLD.trek_id IS NOT NULL THEN
      UPDATE public.upcoming_treks
        SET seats_taken = GREATEST(seats_taken - COALESCE(OLD.seats_booked, 1), 0)
        WHERE id = OLD.trek_id;
    END IF;
    IF new_active AND NEW.trek_id IS NOT NULL THEN
      UPDATE public.upcoming_treks
        SET seats_taken = seats_taken + COALESCE(NEW.seats_booked, 1)
        WHERE id = NEW.trek_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bookings_sync_seats ON public.bookings;
CREATE TRIGGER bookings_sync_seats
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_trek_seats_taken();

-- Reimplement get_trek_seat_stats as a plain SECURITY INVOKER aggregator reading upcoming_treks
CREATE OR REPLACE FUNCTION public.get_trek_seat_stats()
RETURNS TABLE(trek_id uuid, max_seats integer, seats_taken integer, seats_remaining integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    id AS trek_id,
    max_seats,
    seats_taken,
    GREATEST(max_seats - seats_taken, 0) AS seats_remaining
  FROM public.upcoming_treks;
$$;
