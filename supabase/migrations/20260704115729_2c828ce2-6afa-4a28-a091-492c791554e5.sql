
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS booking_source text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('pending','paid')),
  ADD CONSTRAINT bookings_booking_source_check CHECK (booking_source IN ('online','manual'));

-- Allow manual bookings to omit age/gender/aadhaar fields
ALTER TABLE public.bookings
  ALTER COLUMN primary_age DROP NOT NULL,
  ALTER COLUMN primary_gender DROP NOT NULL,
  ALTER COLUMN primary_aadhaar DROP NOT NULL,
  ALTER COLUMN primary_aadhaar_photo DROP NOT NULL;
