CREATE TYPE public.trek_difficulty AS ENUM ('Easy', 'Moderate', 'Hard');

CREATE TABLE public.upcoming_treks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  trek_date date NOT NULL,
  difficulty trek_difficulty NOT NULL DEFAULT 'Easy',
  duration text,
  distance text,
  image_url text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upcoming_treks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upcoming treks"
ON public.upcoming_treks FOR SELECT
USING (true);

CREATE POLICY "Admins insert treks"
ON public.upcoming_treks FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update treks"
ON public.upcoming_treks FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete treks"
ON public.upcoming_treks FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Public bucket for trek images
INSERT INTO storage.buckets (id, name, public) VALUES ('trek-images', 'trek-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read trek images"
ON storage.objects FOR SELECT
USING (bucket_id = 'trek-images');

CREATE POLICY "Admins upload trek images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trek-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update trek images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'trek-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete trek images"
ON storage.objects FOR DELETE
USING (bucket_id = 'trek-images' AND public.has_role(auth.uid(), 'admin'));