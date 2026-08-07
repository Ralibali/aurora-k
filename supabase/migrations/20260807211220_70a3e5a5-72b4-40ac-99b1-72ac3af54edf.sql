ALTER TABLE public.driver_documents
  ADD CONSTRAINT driver_documents_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL;