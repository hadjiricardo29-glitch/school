-- Motosu — durcissement sécurité suite à un audit complet.
--
-- 1) [RÉEL] task_submissions autorise l'update direct (soumission de preuve)
--    sans jamais protéger task_id : un utilisateur pouvait démarrer une
--    mission bon marché puis, dans la requête PATCH d'envoi de preuve,
--    changer task_id vers une mission à forte récompense — approve_submission
--    fait confiance à submission.task_id pour créditer le montant, donc ceci
--    permettait de toucher la récompense d'une mission jamais réellement
--    accomplie. Corrigé par un trigger qui interdit tout changement de
--    task_id après création (même pattern que prevent_referred_by_change).
--
-- 2) [DURCISSEMENT] search_path non fixé sur task_category_bucket — ajouté,
--    par cohérence avec le reste des fonctions du schéma.
--
-- 3) [DÉFENSE EN PROFONDEUR] Le linter Supabase signale 28 fonctions
--    SECURITY DEFINER exécutables par le rôle anon. Vérification faite :
--    chacune vérifie auth.uid()/le rôle en interne et échoue proprement pour
--    un appelant anonyme — aucune n'est donc réellement exploitable telle
--    quelle. On révoque quand même l'exécution pour anon : aucun impact
--    fonctionnel (ces appels échouaient déjà tous), et ça retire la surface
--    d'attaque si l'une de ces fonctions perdait un jour sa vérification
--    interne par erreur.
--
-- 4) [DURCISSEMENT] Aucun bucket de stockage n'avait de limite de taille ni
--    de restriction de type MIME — ouvert à l'abus de stockage (fichiers
--    énormes) et, pour les buckets publics (avatars, course-thumbnails), à
--    l'hébergement de contenu arbitraire sous le domaine du projet.

create or replace function public.prevent_task_submission_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.task_id is distinct from old.task_id then
    raise exception 'task_id cannot be changed after a submission is created';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_task_submission_reassignment
  before update on public.task_submissions
  for each row execute function public.prevent_task_submission_reassignment();

create or replace function public.task_category_bucket(p_category public.task_category)
returns public.earning_bucket
language sql
immutable
set search_path = public
as $$
  select case p_category
    when 'TIKTOK' then 'TIKTOK'::public.earning_bucket
    when 'YOUTUBE' then 'YOUTUBE'::public.earning_bucket
    when 'VIDEOS' then 'VIDEOS'::public.earning_bucket
    when 'ADS' then 'ADS'::public.earning_bucket
    when 'SURVEYS' then 'SURVEYS'::public.earning_bucket
    else 'WALLET'::public.earning_bucket
  end;
$$;

revoke execute on function public.admin_adjust_balance(uuid, bigint, text) from anon;
revoke execute on function public.admin_change_role(uuid, public.user_role) from anon;
revoke execute on function public.admin_set_user_status(uuid, public.account_status) from anon;
revoke execute on function public.approve_deposit(uuid) from anon;
revoke execute on function public.approve_submission(uuid, text) from anon;
revoke execute on function public.approve_withdrawal(uuid) from anon;
revoke execute on function public.check_submission_allowed() from anon;
revoke execute on function public.claim_daily_spin() from anon;
revoke execute on function public.count_activated_referrals(uuid) from anon;
revoke execute on function public.create_deposit_request(bigint, text, text) from anon;
revoke execute on function public.create_withdrawal_request(bigint, text, jsonb, public.earning_bucket) from anon;
revoke execute on function public.credit_wallet_bucket(uuid, public.earning_bucket, bigint) from anon;
revoke execute on function public.current_role() from anon;
revoke execute on function public.get_direct_referrals_with_status(uuid) from anon;
revoke execute on function public.get_leaderboard(integer) from anon;
revoke execute on function public.get_my_rank() from anon;
revoke execute on function public.get_next_spin_at(uuid) from anon;
revoke execute on function public.get_setting_bool(text, boolean) from anon;
revoke execute on function public.get_setting_numeric(text, numeric) from anon;
revoke execute on function public.get_setting_text(text, text) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.is_account_activated(uuid) from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.prevent_referred_by_change() from anon;
revoke execute on function public.purchase_course(uuid) from anon;
revoke execute on function public.reject_deposit(uuid, text) from anon;
revoke execute on function public.reject_submission(uuid, text) from anon;
revoke execute on function public.reject_withdrawal(uuid, text) from anon;

update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','application/pdf'] where id = 'task-proofs';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'] where id = 'avatars';
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'] where id = 'course-thumbnails';
