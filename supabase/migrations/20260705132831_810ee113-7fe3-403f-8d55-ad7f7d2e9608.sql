
CREATE POLICY "Anyone can read gallery-images files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');
