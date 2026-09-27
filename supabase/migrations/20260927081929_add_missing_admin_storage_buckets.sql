-- These buckets were previously created outside migration history. Keep them
-- private: public reads use signed URLs, while admin writes use service_role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'gallery-images',
    'gallery-images',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  ),
  (
    'trail-log-pdfs',
    'trail-log-pdfs',
    false,
    10485760,
    ARRAY['application/pdf']
  ),
  (
    'team-photos',
    'team-photos',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
