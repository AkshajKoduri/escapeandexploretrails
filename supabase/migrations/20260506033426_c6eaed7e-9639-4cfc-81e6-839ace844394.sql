
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  age INTEGER,
  gender TEXT,
  aadhaar_number TEXT,
  aadhaar_photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trek_name TEXT NOT NULL,
  primary_name TEXT NOT NULL,
  primary_age INTEGER NOT NULL,
  primary_gender TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  primary_email TEXT,
  primary_aadhaar TEXT NOT NULL,
  primary_aadhaar_photo TEXT NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Booking members (group)
CREATE TABLE public.booking_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  aadhaar_number TEXT NOT NULL,
  aadhaar_photo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own booking members" ON public.booking_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  );
CREATE POLICY "Users insert own booking members" ON public.booking_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid())
  );

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('aadhaar-photos', 'aadhaar-photos', false);

CREATE POLICY "Users upload own aadhaar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'aadhaar-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users read own aadhaar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'aadhaar-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users delete own aadhaar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'aadhaar-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );
