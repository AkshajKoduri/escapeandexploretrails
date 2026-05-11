
ALTER TABLE public.upcoming_treks
  ADD COLUMN IF NOT EXISTS album_url TEXT,
  ADD COLUMN IF NOT EXISTS itinerary_url TEXT,
  ADD COLUMN IF NOT EXISTS itinerary_file_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('itineraries', 'itineraries', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Itineraries are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'itineraries');

CREATE POLICY "Admins upload itineraries"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'itineraries' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update itineraries"
ON storage.objects FOR UPDATE
USING (bucket_id = 'itineraries' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete itineraries"
ON storage.objects FOR DELETE
USING (bucket_id = 'itineraries' AND public.has_role(auth.uid(), 'admin'));
