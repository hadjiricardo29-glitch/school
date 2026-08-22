-- Motosu — bucket de stockage pour les images de formations, uploadées
-- directement depuis l'ordinateur de l'admin (plus de champ URL externe
-- pour les images — les liens restent réservés aux vidéos de réseaux sociaux).

insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

create policy "anyone can view course thumbnails"
  on storage.objects for select
  using (bucket_id = 'course-thumbnails');

create policy "staff upload course thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'course-thumbnails' and public.is_staff());

create policy "staff update course thumbnails"
  on storage.objects for update
  using (bucket_id = 'course-thumbnails' and public.is_staff());

create policy "staff delete course thumbnails"
  on storage.objects for delete
  using (bucket_id = 'course-thumbnails' and public.is_staff());
