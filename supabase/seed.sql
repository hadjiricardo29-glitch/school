-- ============================================================
-- Motosu — SEED DE DÉVELOPPEMENT — DEV ONLY
-- Ne JAMAIS exécuter ce script sur un projet Supabase de production.
-- Crée 1 admin + 5 utilisateurs de démo + 10 missions + soumissions,
-- transactions, commissions, dépôts et retraits d'exemple.
--
-- Identifiants de démonstration (DEV ONLY) :
--   admin@example.com   / MotosuDemo#2026  (ADMIN)
--   prince@example.com  / MotosuDemo#2026  (USER, racine du réseau)
--   marie@example.com   / MotosuDemo#2026  (USER, filleule de prince)
--   koffi@example.com   / MotosuDemo#2026  (USER, filleul de marie)
--   aisha@example.com   / MotosuDemo#2026  (USER, filleule de prince)
--   fatou@example.com   / MotosuDemo#2026  (USER, filleule de koffi)
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Comptes auth (déclenche public.handle_new_user -> profile + wallet)
-- ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'admin@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"admin","first_name":"Admin","last_name":"Motosu","country":"Côte d''Ivoire","phone_code":"+225","phone":"0100000001"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'prince@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"prince","first_name":"Prince","last_name":"Kouassi","country":"Côte d''Ivoire","phone_code":"+225","phone":"0100000002"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'marie@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"marie","first_name":"Marie","last_name":"Diallo","country":"Sénégal","phone_code":"+221","phone":"0100000003","referral_code":"prince"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'koffi@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"koffi","first_name":"Koffi","last_name":"Yao","country":"Côte d''Ivoire","phone_code":"+225","phone":"0100000004","referral_code":"marie"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'aisha@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"aisha","first_name":"Aisha","last_name":"Traoré","country":"Mali","phone_code":"+223","phone":"0100000005","referral_code":"prince"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
   'fatou@example.com', crypt('MotosuDemo#2026', gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"username":"fatou","first_name":"Fatou","last_name":"Cissé","country":"Sénégal","phone_code":"+221","phone":"0100000006","referral_code":"koffi"}',
   now(), now(), '', '', '', '');

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       'email', now(), now(), now()
from auth.users u
where u.id in (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006'
);

update public.profiles set role = 'ADMIN' where id = 'a0000000-0000-4000-8000-000000000001';

-- ------------------------------------------------------------
-- 2. Dépôts d'activation (mock, instantanés) — doivent précéder les
--    soumissions de mission car un compte doit être "activé"
--    (total_deposited >= account_activation_min_deposit, migration 0006)
--    avant de pouvoir réclamer une mission ou demander un retrait.
--    aisha reçoit en plus un dépôt "manual" qui reste PENDING, pour
--    illustrer la file d'attente de validation admin sur /admin/deposits.
-- ------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.create_deposit_request(5000, 'mobile_money', 'mock');

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.create_deposit_request(2500, 'mobile_money', 'mock');

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.create_deposit_request(2500, 'mobile_money', 'mock');

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}';
select public.create_deposit_request(2500, 'mobile_money', 'mock');
select public.create_deposit_request(5000, 'bank_transfer', 'manual');

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000006","role":"authenticated"}';
select public.create_deposit_request(2500, 'mobile_money', 'mock');

reset request.jwt.claims;

-- ------------------------------------------------------------
-- 3. Missions (créées par l'admin)
-- ------------------------------------------------------------
insert into public.tasks (id, title, description, category, reward, estimated_time, difficulty, instructions, requirements, max_completions, single_submission_per_user, status, created_by) values
  ('b0000000-0000-4000-8000-000000000001', 'Suivre et aimer notre page Instagram', 'Abonnez-vous à notre page Instagram officielle et aimez les 3 dernières publications.', 'SOCIAL_MEDIA', 1500, '5 min', 'EASY', 'Suivez le compte puis envoyez une capture d''écran.', 'Compte Instagram public requis', 200, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 'Rédiger un avis sur le Play Store', 'Laissez un avis honnête de 3 lignes minimum sur notre application mobile.', 'CONTENT', 2000, '10 min', 'EASY', 'Publiez l''avis puis copiez le texte dans le formulaire de preuve.', 'Application installée', 150, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003', 'Répondre à un sondage de 5 minutes', 'Sondage sur les habitudes numériques des jeunes africains.', 'SURVEYS', 1000, '5 min', 'EASY', 'Répondez à toutes les questions du sondage.', 'Aucun', null, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000004', 'Partager notre publication en story', 'Partagez notre dernière publication en story WhatsApp ou Instagram pendant 24h.', 'SOCIAL_MEDIA', 1200, '5 min', 'EASY', 'Envoyez une capture d''écran de la story active.', 'Minimum 50 contacts', 300, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000005', 'Tester la nouvelle fonctionnalité de paiement', 'Testez le flux de dépôt démo et signalez tout bug rencontré.', 'APP_TESTING', 5000, '20 min', 'MEDIUM', 'Effectuez un dépôt démo et un retrait, notez vos observations.', 'Compte actif depuis 7 jours', 50, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000006', 'Créer une courte vidéo de présentation', 'Vidéo de 30 à 60 secondes présentant la plateforme sur TikTok ou Reels.', 'CONTENT', 8000, '45 min', 'HARD', 'Publiez la vidéo puis envoyez le lien.', 'Compte public, minimum 200 vues', 20, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000007', 'Collecter 20 avis clients pour une étude', 'Interrogez 20 personnes de votre entourage sur leurs habitudes d''achat en ligne.', 'DATA', 6000, '2 heures', 'MEDIUM', 'Compilez les réponses dans un document et envoyez le lien.', 'Modèle de questionnaire fourni', 30, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000008', 'Promouvoir notre offre sur un groupe communautaire', 'Publiez notre offre dans un groupe Facebook ou WhatsApp d''au moins 500 membres.', 'MARKETING', 3000, '10 min', 'EASY', 'Envoyez une capture d''écran de la publication.', 'Groupe actif de 500+ membres', 40, true, 'PAUSED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000009', 'Traduire une page produit en anglais', 'Traduisez le texte fourni du français vers l''anglais.', 'DIGITAL', 4000, '30 min', 'MEDIUM', 'Le texte source est fourni au démarrage de la mission.', 'Bon niveau d''anglais', 15, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000010', 'Signaler des bugs sur l''application mobile', 'Explorez l''application et documentez tout bug rencontré.', 'APP_TESTING', 3500, '30 min', 'MEDIUM', 'Décrivez chaque bug avec les étapes de reproduction.', 'Réservé aux testeurs vérifiés', 10, true, 'DRAFT', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000011', 'Regarder 5 publicités partenaires', 'Visionnez 5 publicités courtes de nos partenaires jusqu''à la fin.', 'ADS', 500, '5 min', 'EASY', 'Regardez chaque publicité en entier, sans passer.', 'Aucun', null, false, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000012', 'Quiz culture générale digitale', 'Répondez correctement à 10 questions sur le digital et les réseaux sociaux.', 'QUIZ', 800, '5 min', 'EASY', 'Score minimum de 7/10 requis pour valider.', 'Aucun', null, true, 'PUBLISHED', 'a0000000-0000-4000-8000-000000000001');

-- ------------------------------------------------------------
-- 4. Soumissions (insertion directe : les triggers de garde-fou
--    s'appliquent quand même car ce sont des BEFORE INSERT triggers)
-- ------------------------------------------------------------
insert into public.task_submissions (id, task_id, user_id, status, proof_text, submitted_at) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'SUBMITTED', 'Abonné et 3 publications likées, capture jointe.', now() - interval '5 days'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'SUBMITTED', 'Sondage complété intégralement.', now() - interval '4 days'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'SUBMITTED', 'Dépôt et retrait démo testés, aucun bug trouvé.', now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'SUBMITTED', 'Avis 5 étoiles publié sur le Play Store.', now() - interval '3 days'),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'SUBMITTED', 'Story publiée, capture en pièce jointe.', now() - interval '2 hours'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'SUBMITTED', 'Abonnement effectué.', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005', 'SUBMITTED', 'Avis publié.', now() - interval '6 hours'),
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006', 'SUBMITTED', 'Réponses envoyées.', now() - interval '3 days');

-- ------------------------------------------------------------
-- 5. Approbations / rejet via les vraies fonctions RPC, en
--    impersonnant chaque acteur via request.jwt.claims (comme
--    le ferait PostgREST) pour exercer exactement le chemin de
--    code de production (cascade de commissions incluse).
-- ------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.approve_submission('c0000000-0000-4000-8000-000000000001', 'Preuve conforme');
select public.approve_submission('c0000000-0000-4000-8000-000000000002', 'Merci !');
select public.approve_submission('c0000000-0000-4000-8000-000000000004', 'Avis vérifié');
select public.approve_submission('c0000000-0000-4000-8000-000000000006', 'Bon travail');
select public.reject_submission('c0000000-0000-4000-8000-000000000008', 'Réponses incomplètes, merci de resoumettre');
-- c0000000...003, 005, 007 restent SUBMITTED pour démontrer la file d'attente admin

-- ------------------------------------------------------------
-- 6. Retraits : un complété, un en attente
-- ------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.create_withdrawal_request(2000, 'mobile_money', '{"phone":"+225 0100000002"}'::jsonb);

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.approve_withdrawal(id) from public.withdrawal_requests
where user_id = 'a0000000-0000-4000-8000-000000000002' and status = 'PENDING'
order by created_at desc limit 1;

set local request.jwt.claims = '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.create_withdrawal_request(1200, 'mobile_money', '{"phone":"+221 0100000003"}'::jsonb);
-- reste PENDING pour démontrer la file d'attente admin

reset request.jwt.claims;

commit;
