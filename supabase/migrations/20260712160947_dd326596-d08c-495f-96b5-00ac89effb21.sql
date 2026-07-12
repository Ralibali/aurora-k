drop policy if exists "Public can upload booking attachments" on storage.objects;
create policy "Public can upload booking attachments"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'booking-attachments'
  and lower((storage.foldername(name))[1]) = 'public'
);

drop policy if exists "Authenticated can read booking attachments" on storage.objects;
create policy "Authenticated can read booking attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'booking-attachments');