-- Vérifie : une mission à participation unique ne peut pas être réclamée
-- deux fois par le même utilisateur.
begin;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000000', 'c1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'test-dup@example.com', crypt('x', gen_salt('bf')), now(),
  '{}', '{"username":"test_dup_user"}'
);

insert into public.tasks (id, title, description, category, reward, status, single_submission_per_user, created_by)
values ('c1000000-0000-4000-8000-000000000002', 'Single task', 'desc', 'OTHER', 500, 'PUBLISHED', true, null);

select lives_ok(
  $$ insert into public.task_submissions (task_id, user_id, status) values ('c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'STARTED') $$,
  'La première réclamation de la mission réussit'
);

select throws_ok(
  $$ insert into public.task_submissions (task_id, user_id, status) values ('c1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'STARTED') $$,
  'Une deuxième réclamation de la même mission à participation unique échoue'
);

select * from finish();
rollback;
