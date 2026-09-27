ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS trip_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.upcoming_treks
  DROP CONSTRAINT IF EXISTS upcoming_treks_trip_details_object_check;

ALTER TABLE public.upcoming_treks
  ADD CONSTRAINT upcoming_treks_trip_details_object_check
  CHECK (jsonb_typeof(trip_details) = 'object');

COMMENT ON COLUMN public.upcoming_treks.trip_details IS
  'Structured inclusions, exclusions, packages, payment policy, things to carry, instructions, and cancellation policy.';
