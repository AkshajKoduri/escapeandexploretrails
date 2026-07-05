
-- Allow "Bike Ride" as an event type
ALTER TABLE public.upcoming_treks DROP CONSTRAINT IF EXISTS upcoming_treks_event_type_check;
ALTER TABLE public.upcoming_treks ADD CONSTRAINT upcoming_treks_event_type_check
  CHECK (event_type = ANY (ARRAY['Hike'::text, 'Cycling Ride'::text, 'Outstation Trek'::text, 'Bike Ride'::text]));

-- Gallery images table
CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  storage_path text,
  category text NOT NULL DEFAULT 'General'
    CHECK (category = ANY (ARRAY['Hike','Cycling Ride','Outstation Trek','Bike Ride','General'])),
  display_order integer NOT NULL DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_images TO anon;
GRANT SELECT ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery images are publicly readable"
  ON public.gallery_images FOR SELECT
  USING (true);

CREATE INDEX gallery_images_display_order_idx ON public.gallery_images(display_order);
