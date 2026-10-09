ALTER TABLE public.upcoming_treks
  ADD COLUMN show_on_homepage boolean NOT NULL DEFAULT false;

-- Preserve the four adventures previously selected automatically by the homepage.
-- Subsequent selection is controlled explicitly by Admin, without a four-card cap.
UPDATE public.upcoming_treks SET show_on_homepage = true
WHERE id IN (
  SELECT id FROM public.upcoming_treks
  WHERE NOT is_draft AND NOT is_archived
    AND (
      (trek_date IS NULL AND cardinality(coalesce(additional_dates, '{}'::date[])) = 0)
      OR trek_date >= (now() AT TIME ZONE 'UTC')::date
      OR EXISTS (SELECT 1 FROM unnest(additional_dates) AS departure WHERE departure >= (now() AT TIME ZONE 'UTC')::date)
    )
  ORDER BY trek_date ASC NULLS LAST, id
  LIMIT 4
);
COMMENT ON COLUMN public.upcoming_treks.show_on_homepage IS
  'Admin-selected homepage card visibility. Does not affect publication or the adventure catalogue. New trips default to hidden on homepage.';
