-- Vérifie : A parraine B, B termine une mission de 10 000, A reçoit sa
-- commission de niveau 1 (10% par défaut, voir migration 0005), et le
-- montant crédité est exact.
begin;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'test-admin@example.com', crypt('x', gen_salt('bf')), now(), '{}', '{"username":"test_admin_a"}'),
  ('00000000-0000-0000-0000-000000000000', 'e0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'test-a@example.com', crypt('x', gen_salt('bf')), now(), '{}', '{"username":"test_upline_a"}'),
  ('00000000-0000-4000-8000-000000000000', 'e0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'test-b@example.com', crypt('x', gen_salt('bf')), now(), '{}', '{"username":"test_downline_b","referral_code":"test_upline_a"}');

update public.profiles set role = 'ADMIN' where id = 'e0000000-0000-4000-8000-000000000001';

-- neutralise le bonus de bienvenue (migration 0007) pour isoler le calcul
-- de commission testé ici, quelle que soit sa valeur configurée
update public.wallets set available_balance = 0, total_earned = 0
where user_id in ('e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003');

select is(
  (select referred_by from public.profiles where id = 'e0000000-0000-4000-8000-000000000003'),
  'e0000000-0000-4000-8000-000000000002'::uuid,
  'B est bien rattaché à A comme upline'
);

insert into public.tasks (id, title, description, category, reward, status, created_by)
values ('f0000000-0000-4000-8000-000000000001', 'Test task', 'desc', 'OTHER', 10000, 'PUBLISHED', 'e0000000-0000-4000-8000-000000000001');

insert into public.task_submissions (id, task_id, user_id, status, submitted_at)
values ('f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'SUBMITTED', now());

set local request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.approve_submission('f0000000-0000-4000-8000-000000000002', 'ok');

select is(
  (select available_balance from public.wallets where user_id = 'e0000000-0000-4000-8000-000000000003'),
  10000::bigint,
  'B reçoit bien 10 000 (récompense de la mission)'
);

select is(
  (select available_balance from public.wallets where user_id = 'e0000000-0000-4000-8000-000000000002'),
  1000::bigint,
  'A reçoit bien 1 000 de commission (10% niveau 1 sur 10 000)'
);

select is(
  (select count(*)::int from public.commissions where beneficiary_id = 'e0000000-0000-4000-8000-000000000002' and source_user_id = 'e0000000-0000-4000-8000-000000000003' and level = 1 and amount = 1000),
  1,
  'Une ligne commissions de niveau 1 et montant 1000 a été créée'
);

select * from finish();
rollback;
