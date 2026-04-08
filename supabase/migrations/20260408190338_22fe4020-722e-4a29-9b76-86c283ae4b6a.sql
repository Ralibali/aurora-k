
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.platform_announcements ADD COLUMN IF NOT EXISTS target TEXT NOT NULL DEFAULT 'all';
