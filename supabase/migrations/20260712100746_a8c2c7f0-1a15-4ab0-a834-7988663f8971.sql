
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_founder BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members are publicly viewable"
  ON public.team_members FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.team_members (full_name, role_title, bio, photo_url, badges, display_order, is_founder)
VALUES (
  'Ashok',
  'Founder & Lead Trek Guide',
  E'Ashok is the heart and soul of E2 Trails. An experienced trek leader, he has guided countless safe and secure expeditions across India — earning the trust of adventurers from all walks of life.\n\nHe once built a successful career in the software industry, but his unwavering love for the outdoors pulled him toward the trails. Choosing passion over a desk job, Ashok resigned to dedicate himself fully to trekking and to mentoring young adventurers — sharing not just routes, but a way of life rooted in nature, safety, and camaraderie.',
  NULL,
  '[{"icon":"🧭","label":"Lead Guide"},{"icon":"🛡️","label":"Safety Certified"},{"icon":"💚","label":"Mentor to Young Trekkers"}]'::jsonb,
  1,
  true
);
