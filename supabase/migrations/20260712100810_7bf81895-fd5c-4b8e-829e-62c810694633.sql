
CREATE POLICY "Public can view team photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-photos');
