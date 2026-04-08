INSERT INTO public.companies (name, org_nr, onboarding_completed, subscription_status)
SELECT 'Aurora Medias Transport AB', '559123-4567', false, 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE name = 'Aurora Medias Transport AB'
);

UPDATE public.profiles
SET company_id = (
  SELECT id FROM public.companies WHERE name = 'Aurora Medias Transport AB' LIMIT 1
)
WHERE email = 'info@auroramedia.se' OR full_name = 'Aurora Media';

UPDATE public.user_roles
SET company_id = (
  SELECT id FROM public.companies WHERE name = 'Aurora Medias Transport AB' LIMIT 1
)
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE email = 'info@auroramedia.se' OR full_name = 'Aurora Media'
);

UPDATE public.settings
SET company_id = (
  SELECT id FROM public.companies WHERE name = 'Aurora Medias Transport AB' LIMIT 1
)
WHERE email = 'info@auroramedia.se' OR company_name = 'Aurora Medias Transport AB';