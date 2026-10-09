-- Add display configuration only. Capacity, booking RPCs and RLS are unchanged.
ALTER TABLE public.upcoming_treks
  ADD COLUMN departure_statuses jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.upcoming_treks
  ADD CONSTRAINT departure_statuses_valid CHECK (
    jsonb_typeof(departure_statuses) = 'object'
    AND NOT jsonb_path_exists(departure_statuses,
      '$.* ? (@ != "Available" && @ != "Filling Fast" && @ != "Last Few" && @ != "Full" && @ != "Waiting List")')
  );
COMMENT ON COLUMN public.upcoming_treks.departure_statuses IS
  'ISO departure date to Admin-selected public status. Missing dates display Available. Display only; never changes booking capacity.';

ALTER TABLE public.site_settings
  ADD COLUMN show_trip_icons boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.site_settings.show_trip_icons IS
  'Show category icons in the homepage Explore your way section; category links remain visible.';
