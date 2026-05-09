
-- Extend upcoming_treks
ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS trek_time text,
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_seats integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS status_override text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Extend bookings with seats_booked
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS seats_booked integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS trek_id uuid;

-- Backfill seats_booked = 1 + member count
UPDATE public.bookings b
SET seats_booked = 1 + COALESCE((
  SELECT COUNT(*) FROM public.booking_members m WHERE m.booking_id = b.id
), 0)
WHERE seats_booked IS NULL OR seats_booked = 1;

-- Album images table
CREATE TABLE IF NOT EXISTS public.trip_album_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES public.upcoming_treks(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_album_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view album images"
  ON public.trip_album_images FOR SELECT USING (true);

CREATE POLICY "Admins insert album images"
  ON public.trip_album_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update album images"
  ON public.trip_album_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete album images"
  ON public.trip_album_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seat stats view (security_invoker so RLS applies via underlying tables)
CREATE OR REPLACE VIEW public.trek_seat_stats
WITH (security_invoker = true) AS
SELECT
  t.id AS trek_id,
  t.max_seats,
  COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int AS seats_taken,
  GREATEST(t.max_seats - COALESCE(SUM(b.seats_booked) FILTER (WHERE b.status <> 'cancelled'), 0)::int, 0) AS seats_remaining
FROM public.upcoming_treks t
LEFT JOIN public.bookings b ON b.trek_id = t.id
GROUP BY t.id, t.max_seats;

-- Allow public to view seat counts (for booking page)
GRANT SELECT ON public.trek_seat_stats TO anon, authenticated;
