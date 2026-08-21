-- Vérifie : un utilisateur ne peut pas se parrainer lui-même, et personne
-- (y compris l'utilisateur) ne peut modifier referred_by après création
-- du compte — ce qui empêche aussi toute boucle de parrainage.
begin;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'test-self@example.com', crypt('x', gen_salt('bf')), now(),
  '{}', '{"username":"test_self_referral"}'
);

select throws_ok(
  $$ insert into public.profiles (id, username, referral_code, referred_by)
     values ('d0000000-0000-4000-8000-000000000001', 'dup_username', 'ZZZZZZZZ', 'd0000000-0000-4000-8000-000000000001') $$,
  'Un profil ne peut pas être son propre referred_by (contrainte referred_by_not_self)'
);

select throws_ok(
  $$ update public.profiles set referred_by = 'd0000000-0000-4000-8000-000000000001'
     where id = 'd0000000-0000-4000-8000-000000000001' $$,
  'referred_by ne peut pas être modifié après création du compte (anti auto-parrainage a posteriori et anti boucle)'
);

select * from finish();
rollback;
