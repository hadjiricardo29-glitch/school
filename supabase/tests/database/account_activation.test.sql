-- Vérifie : tant que le compte n'est pas "activé" (total_deposited >=
-- account_activation_min_deposit), impossible de réclamer une mission ou
-- de demander un retrait ; ça redevient possible une fois le seuil atteint.
begin;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000000', 'c3000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'test-activation@example.com', crypt('x', gen_salt('bf')), now(),
  '{}', '{"username":"test_activation_user"}'
);

insert into public.tasks (id, title, description, category, reward, status, created_by)
values ('c3000000-0000-4000-8000-000000000002', 'Activation task', 'desc', 'OTHER', 500, 'PUBLISHED', null);

select is(
  public.is_account_activated('c3000000-0000-4000-8000-000000000001'),
  false,
  'Un compte sans dépôt n''est pas activé (seuil par défaut 2000)'
);

select throws_ok(
  $$ insert into public.task_submissions (task_id, user_id, status) values ('c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 'STARTED') $$,
  'Un compte non activé ne peut pas réclamer de mission'
);

update public.wallets set total_deposited = 2000, available_balance = 2000
where user_id = 'c3000000-0000-4000-8000-000000000001';

select is(
  public.is_account_activated('c3000000-0000-4000-8000-000000000001'),
  true,
  'Le compte est activé une fois le dépôt minimum atteint'
);

select lives_ok(
  $$ insert into public.task_submissions (task_id, user_id, status) values ('c3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 'STARTED') $$,
  'Un compte activé peut réclamer une mission'
);

select * from finish();
rollback;
