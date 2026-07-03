ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS trek_difficulty text,
  ADD COLUMN IF NOT EXISTS trek_distance text,
  ADD COLUMN IF NOT EXISTS altitude text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS elevation_gain text,
  ADD COLUMN IF NOT EXISTS mountain_range text,
  ADD COLUMN IF NOT EXISTS base_village text,
  ADD COLUMN IF NOT EXISTS duration_text text,
  ADD COLUMN IF NOT EXISTS stay_location text,
  ADD COLUMN IF NOT EXISTS field_labels jsonb NOT NULL DEFAULT '{}'::jsonb;