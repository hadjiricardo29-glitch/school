-- Motosu — logique métier financière (fonctions RPC atomiques)
-- Chaque fonction s'exécute dans une seule transaction Postgres implicite :
-- soit toutes les écritures (wallet + ledger + commissions + notifications
-- + audit log) réussissent, soit aucune n'est appliquée.

-- ============================================================
-- MISSIONS : approbation / rejet d'une soumission
-- ============================================================
create or replace function public.approve_submission(p_submission_id uuid, p_review_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_txn_id uuid;
  v_upline_id uuid;
  v_level int;
  v_max_level int;
  v_rule public.commission_rules%rowtype;
  v_commission_amount bigint;
  v_commission_txn_id uuid;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','MODERATOR','TASK_MANAGER') then
    raise exception 'Not authorized to approve submissions';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if v_submission.status not in ('SUBMITTED','UNDER_REVIEW') then
    raise exception 'Submission is not pending review';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id for update;

  update public.task_submissions
  set status = 'APPROVED', reviewed_by = v_actor, reviewed_at = now(), review_note = p_review_note
  where id = p_submission_id;

  update public.tasks set completions_count = completions_count + 1 where id = v_task.id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (
    v_submission.user_id, 'TASK_REWARD', v_task.reward, v_task.currency, 'COMPLETED',
    'Récompense: ' || v_task.title,
    jsonb_build_object('task_id', v_task.id, 'submission_id', p_submission_id)
  ) returning id into v_txn_id;

  update public.wallets
  set available_balance = available_balance + v_task.reward,
      total_earned = total_earned + v_task.reward,
      updated_at = now()
  where user_id = v_submission.user_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    v_submission.user_id, 'TASK_APPROVED', 'Mission approuvée',
    'Votre mission "' || v_task.title || '" a été approuvée. +' || v_task.reward || ' ' || v_task.currency,
    jsonb_build_object('task_id', v_task.id, 'submission_id', p_submission_id)
  );

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'APPROVE_TASK', 'task_submission', p_submission_id,
    jsonb_build_object('status', v_submission.status), jsonb_build_object('status', 'APPROVED'));

  -- Cascade de commissions de parrainage multi-niveaux (config commission_rules)
  select coalesce(max(level), 0) into v_max_level from public.commission_rules where active = true;
  v_upline_id := v_submission.user_id;
  for v_level in 1..v_max_level loop
    select referred_by into v_upline_id from public.profiles where id = v_upline_id;
    exit when v_upline_id is null;

    select * into v_rule from public.commission_rules where level = v_level and active = true;
    if not found then
      continue;
    end if;

    v_commission_amount := floor(v_task.reward * v_rule.percentage / 100.0)::bigint + v_rule.fixed_amount;
    if v_commission_amount <= 0 then
      continue;
    end if;

    insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
    values (
      v_upline_id, 'REFERRAL_COMMISSION', v_commission_amount, v_task.currency, 'COMPLETED',
      'Commission niveau ' || v_level || ' — ' || v_task.title,
      jsonb_build_object('source_user_id', v_submission.user_id, 'task_id', v_task.id, 'level', v_level)
    ) returning id into v_commission_txn_id;

    update public.wallets
    set available_balance = available_balance + v_commission_amount,
        total_earned = total_earned + v_commission_amount,
        updated_at = now()
    where user_id = v_upline_id;

    insert into public.commissions (beneficiary_id, source_user_id, source_transaction_id, level, amount, transaction_id)
    values (v_upline_id, v_submission.user_id, v_txn_id, v_level, v_commission_amount, v_commission_txn_id);

    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_upline_id, 'COMMISSION_RECEIVED', 'Commission reçue',
      '+' || v_commission_amount || ' ' || v_task.currency || ' de commission (niveau ' || v_level || ')',
      jsonb_build_object('level', v_level, 'source_user_id', v_submission.user_id)
    );
  end loop;
end;
$$;

create or replace function public.reject_submission(p_submission_id uuid, p_review_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.task_submissions%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','MODERATOR','TASK_MANAGER') then
    raise exception 'Not authorized to reject submissions';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if v_submission.status not in ('SUBMITTED','UNDER_REVIEW') then
    raise exception 'Submission is not pending review';
  end if;

  update public.task_submissions
  set status = 'REJECTED', reviewed_by = v_actor, reviewed_at = now(), review_note = p_review_note
  where id = p_submission_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  select v_submission.user_id, 'TASK_REJECTED', 'Mission rejetée',
    'Votre soumission pour "' || t.title || '" a été rejetée.' || coalesce(' Motif : ' || p_review_note, ''),
    jsonb_build_object('task_id', v_submission.task_id, 'submission_id', p_submission_id)
  from public.tasks t where t.id = v_submission.task_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'REJECT_TASK', 'task_submission', p_submission_id,
    jsonb_build_object('status', v_submission.status), jsonb_build_object('status', 'REJECTED'));
end;
$$;

-- ============================================================
-- RETRAITS : demande, approbation (déduction atomique), rejet
-- ============================================================
create or replace function public.create_withdrawal_request(p_amount bigint, p_method text, p_destination jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_min bigint;
  v_fee_pct numeric;
  v_fee_fixed bigint;
  v_fee bigint;
  v_net bigint;
  v_cooldown_hours numeric;
  v_last_request timestamptz;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  v_min := public.get_setting_numeric('withdrawal_min_amount', 1000);
  if p_amount < v_min then
    raise exception 'Amount is below the minimum withdrawal of % FCFA', v_min;
  end if;

  v_cooldown_hours := public.get_setting_numeric('withdrawal_cooldown_hours', 24);
  select created_at into v_last_request
  from public.withdrawal_requests
  where user_id = v_user and status in ('PENDING','PROCESSING')
  order by created_at desc limit 1;
  if v_last_request is not null and v_cooldown_hours > 0 and v_last_request > now() - (v_cooldown_hours || ' hours')::interval then
    raise exception 'You already have a pending withdrawal request, please wait for it to be processed';
  end if;

  select * into v_wallet from public.wallets where user_id = v_user for update;
  if v_wallet.available_balance < p_amount then
    raise exception 'Insufficient available balance';
  end if;

  v_fee_pct := public.get_setting_numeric('withdrawal_fee_percentage', 0);
  v_fee_fixed := public.get_setting_numeric('withdrawal_fee_fixed', 0);
  v_fee := floor(p_amount * v_fee_pct / 100.0)::bigint + v_fee_fixed;
  v_net := p_amount - v_fee;
  if v_net <= 0 then
    raise exception 'Amount too small after fees';
  end if;

  update public.wallets
  set available_balance = available_balance - p_amount,
      pending_balance = pending_balance + p_amount,
      updated_at = now()
  where user_id = v_user;

  insert into public.withdrawal_requests (user_id, amount, fee, net_amount, method, destination, status)
  values (v_user, p_amount, v_fee, v_net, p_method, p_destination, 'PENDING')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.approve_withdrawal(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.withdrawal_requests%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN') then
    raise exception 'Not authorized to approve withdrawals';
  end if;

  select * into v_w from public.withdrawal_requests where id = p_withdrawal_id for update;
  if not found then
    raise exception 'Withdrawal request not found';
  end if;
  if v_w.status not in ('PENDING','PROCESSING') then
    raise exception 'Withdrawal request is not pending';
  end if;

  update public.wallets
  set pending_balance = pending_balance - v_w.amount,
      total_withdrawn = total_withdrawn + v_w.net_amount,
      updated_at = now()
  where user_id = v_w.user_id;

  update public.withdrawal_requests
  set status = 'COMPLETED', processed_by = v_actor, processed_at = now()
  where id = p_withdrawal_id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (v_w.user_id, 'WITHDRAWAL', -v_w.amount, 'XOF', 'COMPLETED', 'Retrait approuvé',
    jsonb_build_object('withdrawal_id', p_withdrawal_id, 'fee', v_w.fee, 'net_amount', v_w.net_amount));

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_w.user_id, 'WITHDRAWAL_APPROVED', 'Retrait approuvé',
    'Votre retrait de ' || v_w.net_amount || ' FCFA a été traité.',
    jsonb_build_object('withdrawal_id', p_withdrawal_id));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'APPROVE_WITHDRAWAL', 'withdrawal_request', p_withdrawal_id,
    jsonb_build_object('status', v_w.status), jsonb_build_object('status', 'COMPLETED'));
end;
$$;

create or replace function public.reject_withdrawal(p_withdrawal_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.withdrawal_requests%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN') then
    raise exception 'Not authorized to reject withdrawals';
  end if;

  select * into v_w from public.withdrawal_requests where id = p_withdrawal_id for update;
  if not found then
    raise exception 'Withdrawal request not found';
  end if;
  if v_w.status not in ('PENDING','PROCESSING') then
    raise exception 'Withdrawal request is not pending';
  end if;

  update public.wallets
  set available_balance = available_balance + v_w.amount,
      pending_balance = pending_balance - v_w.amount,
      updated_at = now()
  where user_id = v_w.user_id;

  update public.withdrawal_requests
  set status = 'REJECTED', processed_by = v_actor, processed_at = now(), rejection_reason = p_reason
  where id = p_withdrawal_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_w.user_id, 'WITHDRAWAL_REJECTED', 'Retrait rejeté',
    'Votre demande de retrait a été rejetée.' || coalesce(' Motif : ' || p_reason, ''),
    jsonb_build_object('withdrawal_id', p_withdrawal_id));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'REJECT_WITHDRAWAL', 'withdrawal_request', p_withdrawal_id,
    jsonb_build_object('status', v_w.status), jsonb_build_object('status', 'REJECTED', 'reason', p_reason));
end;
$$;

-- ============================================================
-- DÉPÔTS : demande (auto-complétée en mode mock démo) et approbation manuelle
-- ============================================================
create or replace function public.create_deposit_request(p_amount bigint, p_method text, p_provider text default 'mock')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  insert into public.deposits (user_id, amount, method, provider, status)
  values (v_user, p_amount, p_method, p_provider, 'PENDING')
  returning id into v_id;

  -- MockPaymentProvider : confirmation instantanée pour la démo
  if p_provider = 'mock' then
    perform public.approve_deposit(v_id);
  end if;

  return v_id;
end;
$$;

create or replace function public.approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_is_self_mock boolean;
begin
  select * into v_d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if v_d.status <> 'PENDING' then
    raise exception 'Deposit is not pending';
  end if;

  select role into v_actor_role from public.profiles where id = v_actor;
  v_is_self_mock := (v_d.provider = 'mock' and v_actor = v_d.user_id);
  if not v_is_self_mock and (v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN')) then
    raise exception 'Not authorized to approve deposits';
  end if;

  update public.wallets
  set available_balance = available_balance + v_d.amount,
      total_deposited = total_deposited + v_d.amount,
      updated_at = now()
  where user_id = v_d.user_id;

  update public.deposits
  set status = 'COMPLETED', processed_by = v_actor, processed_at = now()
  where id = p_deposit_id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (v_d.user_id, 'DEPOSIT', v_d.amount, 'XOF', 'COMPLETED',
    case when v_d.provider = 'mock' then 'Dépôt démo' else 'Dépôt confirmé' end,
    jsonb_build_object('deposit_id', p_deposit_id, 'method', v_d.method, 'provider', v_d.provider));

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_d.user_id, 'PAYMENT_RECEIVED', 'Dépôt reçu',
    '+' || v_d.amount || ' FCFA ajoutés à votre solde.',
    jsonb_build_object('deposit_id', p_deposit_id));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'APPROVE_DEPOSIT', 'deposit', p_deposit_id,
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'COMPLETED'));
end;
$$;

create or replace function public.reject_deposit(p_deposit_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN') then
    raise exception 'Not authorized to reject deposits';
  end if;

  select * into v_d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if v_d.status <> 'PENDING' then
    raise exception 'Deposit is not pending';
  end if;

  update public.deposits
  set status = 'FAILED', processed_by = v_actor, processed_at = now(),
      metadata = v_d.metadata || jsonb_build_object('rejection_reason', p_reason)
  where id = p_deposit_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'REJECT_DEPOSIT', 'deposit', p_deposit_id,
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'FAILED', 'reason', p_reason));
end;
$$;

-- ============================================================
-- ADMIN : gestion des utilisateurs (toujours auditée)
-- ============================================================
create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_old public.account_status;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','MODERATOR') then
    raise exception 'Not authorized to change user status';
  end if;

  select status into v_old from public.profiles where id = p_user_id;
  update public.profiles set status = p_status, updated_at = now() where id = p_user_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, case when p_status = 'SUSPENDED' then 'SUSPEND_USER' else 'ACTIVATE_USER' end,
    'profile', p_user_id, jsonb_build_object('status', v_old), jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_change_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_old public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role <> 'ADMIN' then
    raise exception 'Only ADMIN can change user roles';
  end if;

  select role into v_old from public.profiles where id = p_user_id;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'CHANGE_ROLE', 'profile', p_user_id, jsonb_build_object('role', v_old), jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_adjust_balance(p_user_id uuid, p_amount bigint, p_description text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN') then
    raise exception 'Not authorized to adjust balances';
  end if;
  if p_description is null or length(trim(p_description)) = 0 then
    raise exception 'A description is required for manual balance adjustments';
  end if;

  update public.wallets
  set available_balance = available_balance + p_amount, updated_at = now()
  where user_id = p_user_id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (p_user_id, 'ADJUSTMENT', p_amount, 'XOF', 'COMPLETED', p_description,
    jsonb_build_object('adjusted_by', v_actor));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, new_value)
  values (v_actor, 'MANUAL_BALANCE_ADJUSTMENT', 'wallet', p_user_id,
    jsonb_build_object('amount', p_amount, 'description', p_description));
end;
$$;
