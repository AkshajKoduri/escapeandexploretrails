-- Rename "Outstation Trek" -> "Monsoon Trek" across data and constraints

-- upcoming_treks
ALTER TABLE public.upcoming_treks DROP CONSTRAINT IF EXISTS upcoming_treks_event_type_check;
UPDATE public.upcoming_treks SET event_type = 'Monsoon Trek' WHERE event_type = 'Outstation Trek';
ALTER TABLE public.upcoming_treks
  ADD CONSTRAINT upcoming_treks_event_type_check
  CHECK (event_type = ANY (ARRAY['Hike'::text, 'Cycling Ride'::text, 'Monsoon Trek'::text, 'Bike Ride'::text]));

-- gallery_images
ALTER TABLE public.gallery_images DROP CONSTRAINT IF EXISTS gallery_images_category_check;
UPDATE public.gallery_images SET category = 'Monsoon Trek' WHERE category = 'Outstation Trek';
ALTER TABLE public.gallery_images
  ADD CONSTRAINT gallery_images_category_check
  CHECK (category = ANY (ARRAY['Hike'::text,'Cycling Ride'::text,'Monsoon Trek'::text,'Bike Ride'::text,'General'::text]));
