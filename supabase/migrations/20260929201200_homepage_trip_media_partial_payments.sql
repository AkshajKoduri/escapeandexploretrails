BEGIN;

CREATE TABLE public.site_settings (
  id text PRIMARY KEY CHECK (id = 'homepage'),
  hero_image_path text,
  hero_alt_text text NOT NULL DEFAULT '',
  CONSTRAINT homepage_image_path_valid CHECK (
    hero_image_path IS NULL OR
    (hero_image_path LIKE 'homepage/%' AND hero_image_path !~ '\.\.' AND length(hero_image_path) <= 300)
  ),
  CONSTRAINT homepage_alt_length CHECK (length(hero_alt_text) <= 500)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
CREATE POLICY "Published homepage settings are readable"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (id = 'homepage');
INSERT INTO public.site_settings (id) VALUES ('homepage');

ALTER TABLE public.upcoming_treks
  ADD COLUMN highlights text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT trip_highlights_limit CHECK (cardinality(highlights) <= 50),
  ADD CONSTRAINT trip_gallery_array CHECK (jsonb_typeof(gallery_images) = 'array' AND jsonb_array_length(gallery_images) <= 50);

-- No default during backfill: unknown historical receipts stay unknown.
ALTER TABLE public.bookings ADD COLUMN amount_paid numeric(12,2);
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'partial', 'paid'));

UPDATE public.bookings
SET amount_paid = CASE WHEN payment_status = 'paid' THEN booking_total ELSE 0 END
WHERE payment_status = 'pending' OR (payment_status = 'paid' AND booking_total IS NOT NULL);
UPDATE public.bookings SET payment_status = 'paid'
WHERE booking_total = 0 AND amount_paid = 0;
ALTER TABLE public.bookings ALTER COLUMN amount_paid SET DEFAULT 0;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_amount_paid_nonnegative CHECK (amount_paid IS NULL OR (amount_paid >= 0 AND amount_paid <> 'NaN'::numeric)),
  ADD CONSTRAINT bookings_paid_within_total CHECK (booking_total IS NULL OR amount_paid IS NULL OR amount_paid <= booking_total);

-- Exact decimal arithmetic also protects public RPC inserts and old clients.
CREATE FUNCTION public.normalize_booking_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_price numeric(12,2);
BEGIN
  IF TG_OP = 'INSERT' AND NEW.booking_total IS NULL AND NEW.selected_package_id IS NULL THEN
    SELECT price INTO v_price FROM public.upcoming_treks WHERE id = NEW.trek_id;
    IF v_price IS NOT NULL THEN
      NEW.package_unit_amount := v_price;
      NEW.package_price_basis := 'per_person';
      NEW.package_currency := 'INR';
      NEW.booking_total := v_price * coalesce(NEW.seats_booked, 1);
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.amount_paid IS NOT DISTINCT FROM OLD.amount_paid
    AND NEW.booking_total IS NOT DISTINCT FROM OLD.booking_total
    AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.amount_paid IS NOT DISTINCT FROM OLD.amount_paid
    AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    IF NEW.payment_status = 'paid' AND NEW.booking_total IS NOT NULL THEN
      NEW.amount_paid := NEW.booking_total;
    ELSIF NEW.payment_status = 'pending' THEN NEW.amount_paid := 0;
    ELSE RAISE EXCEPTION 'Record the cumulative amount paid and confirm the booking total';
    END IF;
  END IF;
  IF NEW.amount_paid IS NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.amount_paid := 0;
    ELSE RAISE EXCEPTION 'Record the cumulative amount paid'; END IF;
  END IF;
  IF NEW.amount_paid < 0 OR NEW.amount_paid = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Amount paid must be non-negative';
  END IF;
  IF NEW.booking_total IS NULL THEN
    IF NEW.amount_paid > 0 THEN RAISE EXCEPTION 'Confirm the booking total before recording a payment'; END IF;
    NEW.payment_status := 'pending';
  ELSE
    IF NEW.booking_total = 'NaN'::numeric OR NEW.booking_total < 0 OR NEW.amount_paid > NEW.booking_total THEN
      RAISE EXCEPTION 'Amount paid cannot exceed the booking total';
    END IF;
    NEW.payment_status := CASE WHEN NEW.amount_paid = NEW.booking_total THEN 'paid'
      WHEN NEW.amount_paid = 0 THEN 'pending' ELSE 'partial' END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_booking_payment() FROM PUBLIC;
CREATE TRIGGER normalize_booking_payment
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.normalize_booking_payment();

COMMENT ON COLUMN public.bookings.amount_paid IS 'Cumulative received amount for the entire booking, not per participant; NULL means historically unknown.';

COMMIT;
