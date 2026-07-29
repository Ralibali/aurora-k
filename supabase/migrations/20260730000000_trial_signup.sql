-- Automatisk provperiod: telefonnummer på företaget för ägarens uppföljning.
-- trial_ends_at finns redan sedan 20260408190338.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
