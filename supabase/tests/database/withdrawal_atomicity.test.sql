-- Vérifie : un retrait supérieur au solde disponible échoue, et qu'une
-- demande de retrait valide déplace le montant de available_balance vers
-- pending_balance de façon atomique (aucune double dépense possible).
begin;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000000', 'c2000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'test-wd@example.com', crypt('x', gen_salt('bf')), now(),
  '{}', '{"username":"test_wd_user"}'
);

update public.wallets set available_balance = 3000 where user_id = 'c2000000-0000-4000-8000-000000000001';

set local request.jwt.claims = '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$ select public.create_withdrawal_request(5000, 'mobile_money', '{"phone":"+225000"}'::jsonb) $$,
  'Un retrait supérieur au solde disponible (5000 > 3000) doit échouer'
);

select is(
  (select available_balance from public.wallets where user_id = 'c2000000-0000-4000-8000-000000000001'),
  3000::bigint,
  'Le solde reste inchangé après un retrait refusé (rollback complet de la fonction)'
);

select lives_ok(
  $$ select public.create_withdrawal_request(2000, 'mobile_money', '{"phone":"+225000"}'::jsonb) $$,
  'Un retrait de 2000 (<= solde disponible) réussit'
);

select is(
  (select available_balance from public.wallets where user_id = 'c2000000-0000-4000-8000-000000000001'),
  1000::bigint,
  'available_balance passe de 3000 à 1000 (3000 - 2000)'
);

select is(
  (select pending_balance from public.wallets where user_id = 'c2000000-0000-4000-8000-000000000001'),
  2000::bigint,
  'pending_balance passe à 2000 (les fonds sont réservés, pas encore décaissés)'
);

select * from finish();
rollback;
