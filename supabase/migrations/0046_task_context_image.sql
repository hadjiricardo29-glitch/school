-- Motosu — image + description de contexte par tâche, affichées à
-- l'utilisateur avant qu'il réponde au quiz (aide à répondre : ex. la photo
-- d'un produit pour une tâche d'annotation de sentiment).

alter table public.tasks add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-images', 'task-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "anyone can view task images"
  on storage.objects for select
  using (bucket_id = 'task-images');

create policy "staff upload task images"
  on storage.objects for insert
  with check (bucket_id = 'task-images' and public.is_staff());

create policy "staff update task images"
  on storage.objects for update
  using (bucket_id = 'task-images' and public.is_staff());

create policy "staff delete task images"
  on storage.objects for delete
  using (bucket_id = 'task-images' and public.is_staff());
