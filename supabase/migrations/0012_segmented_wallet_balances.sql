-- Motosu — soldes segmentés par source de gain (Wallet / TikTok / Vidéos / Publicités / Sondages)
--
-- Inspiré de la structure "Withdrawals Centre" d'une plateforme concurrente :
-- chaque source de gain a son propre solde retirable, au lieu d'un unique
-- pot commun. `public.wallets` reste la source de vérité pour le TOTAL
-- agrégé (leaderboard, admin, dashboard global) — `wallet_balances` est le
-- détail par catégorie, tenu strictement en cohérence avec l'agrégat à
-- chaque mouvement d'argent (jamais l'un sans l'autre, dans la même
-- transaction Postgres implicite de chaque fonction RPC).

create type public.earning_bucket as enum ('WALLET','TIKTOK','VIDEOS','ADS','SURVEYS');

create table public.wallet_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket public.earning_bucket not null,
  available_balance bigint not null default 0,
  total_earned bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, bucket),
  constraint wallet_balances_non_negative check (available_balance >= 0 and total_earned >= 0)
);
create index idx_wallet_balances_user on public.wallet_balances (user_id);

alter table public.wallet_balances enable row level security;

create policy "users read own wallet balances" on public.wallet_balances
  for select using (auth.uid() = user_id or public.is_staff());

create policy "staff read/write wallet balances" on public.wallet_balances
  for all using (public.current_role() in ('ADMIN','FINANCE_ADMIN')) with check (public.current_role() in ('ADMIN','FINANCE_ADMIN'));

-- ============================================================
-- Mapping catégorie de mission -> bucket de gain.
-- Tout ce qui n'est pas TikTok/Vidéos/Pub/Sondage (missions génériques,
-- dépôts, bonus, commissions, ajustements admin) atterrit dans 'WALLET'.
-- ============================================================
create or replace function public.task_category_bucket(p_category public.task_category)
returns public.earning_bucket
language sql
immutable
as $$
  select case p_category
    when 'TIKTOK' then 'TIKTOK'::public.earning_bucket
    when 'VIDEOS' then 'VIDEOS'::public.earning_bucket
    when 'ADS' then 'ADS'::public.earning_bucket
    when 'SURVEYS' then 'SURVEYS'::public.earning_bucket
    else 'WALLET'::public.earning_bucket
  end;
$$;

-- ============================================================
-- Helper interne : crédite un bucket (upsert) sans jamais toucher à
-- l'agrégat public.wallets — chaque appelant décide séparément de créditer
-- aussi l'agrégat, pour garder le mouvement d'argent explicite à chaque
-- endroit plutôt que caché dans un trigger.
-- ============================================================
create or replace function public.credit_wallet_bucket(p_user_id uuid, p_bucket public.earning_bucket, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallet_balances (user_id, bucket, available_balance, total_earned)
  values (p_user_id, p_bucket, greatest(p_amount, 0), greatest(p_amount, 0))
  on conflict (user_id, bucket) do update
  set available_balance = public.wallet_balances.available_balance + greatest(p_amount, 0),
      total_earned = public.wallet_balances.total_earned + greatest(p_amount, 0),
      updated_at = now();
end;
$$;

-- ============================================================
-- approve_submission : crédite maintenant aussi le bucket de la catégorie
-- de la mission (récompense) et le bucket WALLET (commissions de parrainage).
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
  v_bucket public.earning_bucket;
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
  v_bucket := public.task_category_bucket(v_task.category);

  update public.task_submissions
  set status = 'APPROVED', reviewed_by = v_actor, reviewed_at = now(), review_note = p_review_note
  where id = p_submission_id;

  update public.tasks set completions_count = completions_count + 1 where id = v_task.id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (
    v_submission.user_id, 'TASK_REWARD', v_task.reward, v_task.currency, 'COMPLETED',
    'Récompense: ' || v_task.title,
    jsonb_build_object('task_id', v_task.id, 'submission_id', p_submission_id, 'bucket', v_bucket)
  ) returning id into v_txn_id;

  update public.wallets
  set available_balance = available_balance + v_task.reward,
      total_earned = total_earned + v_task.reward,
      updated_at = now()
  where user_id = v_submission.user_id;

  perform public.credit_wallet_bucket(v_submission.user_id, v_bucket, v_task.reward);

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

    perform public.credit_wallet_bucket(v_upline_id, 'WALLET', v_commission_amount);

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

-- ============================================================
-- approve_deposit : les dépôts créditent toujours le bucket WALLET (argent
-- "générique", pas rattaché à une catégorie de mission).
-- ============================================================
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

  perform public.credit_wallet_bucket(v_d.user_id, 'WALLET', v_d.amount);

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

-- ============================================================
-- claim_daily_spin : le gain de la roue atterrit dans le bucket WALLET.
-- ============================================================
create or replace function public.claim_daily_spin()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_next_at timestamptz;
  v_min bigint;
  v_max bigint;
  v_reward bigint;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not public.get_setting_bool('spin_enabled', false) then
    raise exception 'Spin is currently disabled';
  end if;
  if not public.is_account_activated(v_user) then
    raise exception 'Account not activated — please make a deposit to unlock the spin';
  end if;

  v_next_at := public.get_next_spin_at(v_user);
  if now() < v_next_at then
    raise exception 'Next spin available at %', v_next_at;
  end if;

  v_min := public.get_setting_numeric('spin_min_reward', 50);
  v_max := public.get_setting_numeric('spin_max_reward', 500);
  if v_max < v_min then
    v_max := v_min;
  end if;
  v_reward := v_min + floor(random() * (v_max - v_min + 1))::bigint;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (v_user, 'BONUS', v_reward, 'XOF', 'COMPLETED', 'Roue de la chance', jsonb_build_object('source', 'spin'));

  update public.wallets
  set available_balance = available_balance + v_reward,
      total_earned = total_earned + v_reward,
      updated_at = now()
  where user_id = v_user;

  perform public.credit_wallet_bucket(v_user, 'WALLET', v_reward);

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_user, 'SYSTEM', 'Roue de la chance', 'Vous avez gagné ' || v_reward || ' FCFA !', jsonb_build_object('source', 'spin'));

  return v_reward;
end;
$$;

-- ============================================================
-- admin_adjust_balance : les ajustements manuels vont dans le bucket WALLET.
-- Seuls les ajustements positifs créditent wallet_balances (un ajustement
-- négatif ne peut pas faire passer un bucket sous zéro de façon fiable sans
-- savoir d'où retirer ; il reste imputé uniquement à l'agrégat wallets).
-- ============================================================
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

  if p_amount > 0 then
    perform public.credit_wallet_bucket(p_user_id, 'WALLET', p_amount);
  end if;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (p_user_id, 'ADJUSTMENT', p_amount, 'XOF', 'COMPLETED', p_description,
    jsonb_build_object('adjusted_by', v_actor));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, new_value)
  values (v_actor, 'MANUAL_BALANCE_ADJUSTMENT', 'wallet', p_user_id,
    jsonb_build_object('amount', p_amount, 'description', p_description));
end;
$$;

-- ============================================================
-- create_withdrawal_request : nouveau paramètre p_bucket (défaut 'WALLET').
-- Déduit du bucket choisi ET de l'agrégat wallets dans la même transaction —
-- rejette si le bucket n'a pas assez de solde disponible, même si l'agrégat
-- global en aurait assez (cohérence stricte avec l'affichage par catégorie).
-- ============================================================
-- Supprime l'ancienne signature à 3 arguments : sinon Postgres traite la
-- nouvelle version (avec p_bucket par défaut) comme une SURCHARGE distincte
-- plutôt qu'un remplacement, et l'ancienne resterait appelable sans jamais
-- toucher wallet_balances.
drop function if exists public.create_withdrawal_request(bigint, text, jsonb);

create or replace function public.create_withdrawal_request(
  p_amount bigint, p_method text, p_destination jsonb, p_bucket public.earning_bucket default 'WALLET'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_wallet public.wallets%rowtype;
  v_bucket_balance public.wallet_balances%rowtype;
  v_min bigint;
  v_fee_pct numeric;
  v_fee_fixed bigint;
  v_fee bigint;
  v_net bigint;
  v_cooldown_hours numeric;
  v_last_request timestamptz;
  v_min_referrals int;
  v_activated_referrals int;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_account_activated(v_user) then
    raise exception 'Account not activated — please make a deposit before requesting a withdrawal';
  end if;

  v_min_referrals := public.get_setting_numeric('withdrawal_min_referrals', 0)::int;
  if v_min_referrals > 0 then
    v_activated_referrals := public.count_activated_referrals(v_user);
    if v_activated_referrals < v_min_referrals then
      raise exception 'You need at least % activated referrals to request a withdrawal (you currently have %)',
        v_min_referrals, v_activated_referrals;
    end if;
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

  select * into v_bucket_balance from public.wallet_balances where user_id = v_user and bucket = p_bucket for update;
  if not found or v_bucket_balance.available_balance < p_amount then
    raise exception 'Insufficient balance in the selected category (% FCFA available)', coalesce(v_bucket_balance.available_balance, 0);
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

  update public.wallet_balances
  set available_balance = available_balance - p_amount,
      updated_at = now()
  where user_id = v_user and bucket = p_bucket;

  insert into public.withdrawal_requests (user_id, amount, fee, net_amount, method, destination, status)
  values (v_user, p_amount, v_fee, v_net, p_method, p_destination || jsonb_build_object('bucket', p_bucket), 'PENDING')
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_withdrawal_request(bigint, text, jsonb, public.earning_bucket) to authenticated;

-- ============================================================
-- reject_withdrawal : doit restituer le remboursement au MÊME bucket qui a
-- été débité à la demande (stocké dans destination->>'bucket'), sinon
-- l'agrégat wallets et la somme des buckets divergent après un rejet.
-- ============================================================
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
  v_bucket public.earning_bucket;
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

  v_bucket := coalesce((v_w.destination->>'bucket')::public.earning_bucket, 'WALLET');

  update public.wallets
  set available_balance = available_balance + v_w.amount,
      pending_balance = pending_balance - v_w.amount,
      updated_at = now()
  where user_id = v_w.user_id;

  update public.wallet_balances
  set available_balance = available_balance + v_w.amount,
      updated_at = now()
  where user_id = v_w.user_id and bucket = v_bucket;

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
-- Backfill : les comptes existants (seed ou déjà en prod) ont de l'argent
-- dans wallets.available_balance sans encore de ligne wallet_balances.
-- On ne peut pas reconstituer avec certitude la catégorie d'origine de
-- chaque FCFA historique (dépôts et commissions n'ont pas de catégorie),
-- donc tout le solde existant est imputé au bucket WALLET général — les
-- prochains gains, eux, seront correctement ventilés par catégorie.
-- ============================================================
insert into public.wallet_balances (user_id, bucket, available_balance, total_earned)
select user_id, 'WALLET', available_balance, total_earned
from public.wallets
where available_balance > 0 or total_earned > 0
on conflict (user_id, bucket) do nothing;

