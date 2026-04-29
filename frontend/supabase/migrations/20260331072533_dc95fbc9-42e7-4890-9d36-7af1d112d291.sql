
-- Add driver_comment to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS driver_comment text;

-- Add is_available to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
