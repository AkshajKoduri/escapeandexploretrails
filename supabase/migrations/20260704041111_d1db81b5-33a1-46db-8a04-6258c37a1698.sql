ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS additional_dates date[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS starting_price numeric,
  ADD COLUMN IF NOT EXISTS starting_price_label text,
  ADD COLUMN IF NOT EXISTS top_end_price numeric,
  ADD COLUMN IF NOT EXISTS top_end_price_label text;
ALTER TABLE public.upcoming_treks ALTER COLUMN trek_date DROP NOT NULL;