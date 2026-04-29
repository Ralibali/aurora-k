
-- Add signature_url to assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS signature_url text;

-- Create signatures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to signatures bucket
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

-- Allow public read on signatures bucket
CREATE POLICY "Public can read signatures"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'signatures');
