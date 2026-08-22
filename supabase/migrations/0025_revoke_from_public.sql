-- Motosu — correctif de 0024 : `revoke execute ... from anon` était sans
-- effet, car anon n'avait jamais de grant EXECUTE direct — il héritait de
-- PUBLIC (visible dans proacl : `=X/postgres`, la notation Postgres pour le
-- pseudo-rôle PUBLIC). `authenticated` a son propre grant explicite déjà
-- présent, donc révoquer depuis PUBLIC ne touche qu'anon (et tout futur
-- rôle non listé), sans affecter l'accès des utilisateurs connectés.

revoke execute on function public.admin_adjust_balance(uuid, bigint, text) from public;
revoke execute on function public.admin_change_role(uuid, public.user_role) from public;
revoke execute on function public.admin_set_user_status(uuid, public.account_status) from public;
revoke execute on function public.approve_deposit(uuid) from public;
revoke execute on function public.approve_submission(uuid, text) from public;
revoke execute on function public.approve_withdrawal(uuid) from public;
revoke execute on function public.check_submission_allowed() from public;
revoke execute on function public.claim_daily_spin() from public;
revoke execute on function public.count_activated_referrals(uuid) from public;
revoke execute on function public.create_deposit_request(bigint, text, text) from public;
revoke execute on function public.create_withdrawal_request(bigint, text, jsonb, public.earning_bucket) from public;
revoke execute on function public.credit_wallet_bucket(uuid, public.earning_bucket, bigint) from public;
revoke execute on function public.current_role() from public;
revoke execute on function public.get_direct_referrals_with_status(uuid) from public;
revoke execute on function public.get_leaderboard(integer) from public;
revoke execute on function public.get_my_rank() from public;
revoke execute on function public.get_next_spin_at(uuid) from public;
revoke execute on function public.get_setting_bool(text, boolean) from public;
revoke execute on function public.get_setting_numeric(text, numeric) from public;
revoke execute on function public.get_setting_text(text, text) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_account_activated(uuid) from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.prevent_referred_by_change() from public;
revoke execute on function public.purchase_course(uuid) from public;
revoke execute on function public.reject_deposit(uuid, text) from public;
revoke execute on function public.reject_submission(uuid, text) from public;
revoke execute on function public.reject_withdrawal(uuid, text) from public;
revoke execute on function public.prevent_task_submission_reassignment() from public;
revoke execute on function public.task_category_bucket(public.task_category) from public;

-- Pris entre-deux, corrige aussi le search_path manquant repéré par le
-- linter sur le trigger ajouté dans 0024.
create or replace function public.prevent_task_submission_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_id is distinct from old.task_id then
    raise exception 'task_id cannot be changed after a submission is created';
  end if;
  return new;
end;
$$;
