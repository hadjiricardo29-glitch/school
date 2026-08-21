-- Motosu — palier d'activation de compte par dépôt (optionnel, configurable)
--
-- Choix de conception : plutôt que de bloquer tout le dashboard tant que le
-- compte n'est pas activé, seules les actions à forte valeur (réclamer une
-- mission, demander un retrait) sont gated. L'utilisateur voit toujours son
-- dashboard/missions/équipe, avec un bandeau l'invitant à déposer — meilleure
-- expérience qu'un mur total, même mécanique business au final.
--
-- "Activé" = wallets.total_deposited >= account_activation_min_deposit.
-- Pas de nouvelle colonne : dérivé du ledger existant, ne peut pas désynchroniser.

insert into public.system_settings (key, value, type) values
  ('account_activation_enabled', 'true', 'boolean'),
  ('account_activation_min_deposit', '2000', 'number')
on conflict (key) do nothing;

create or replace function public.is_account_activated(p_user_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select case
    when not public.get_setting_bool('account_activation_enabled', false) then true
    else coalesce(
      (select total_deposited from public.wallets where user_id = p_user_id) >=
      public.get_setting_numeric('account_activation_min_deposit', 0),
      false
    )
  end;
$$;

-- Étend le garde-fou de soumission existant avec la vérification d'activation
create or replace function public.check_submission_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_existing_count int;
begin
  if not public.is_account_activated(new.user_id) then
    raise exception 'Account not activated — please make a deposit to start earning';
  end if;

  select * into v_task from public.tasks where id = new.task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  if v_task.status <> 'PUBLISHED' then
    raise exception 'This task is not currently available';
  end if;
  if v_task.deadline is not null and v_task.deadline < now() then
    raise exception 'This task deadline has passed';
  end if;
  if v_task.max_completions is not null and v_task.completions_count >= v_task.max_completions then
    raise exception 'This task has no remaining slots';
  end if;

  if v_task.single_submission_per_user then
    select count(*) into v_existing_count
    from public.task_submissions
    where task_id = new.task_id and user_id = new.user_id and status <> 'REJECTED';
    if v_existing_count > 0 then
      raise exception 'You have already claimed this task';
    end if;
  end if;

  return new;
end;
$$;

-- Étend create_withdrawal_request avec la même vérification d'activation
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
  if not public.is_account_activated(v_user) then
    raise exception 'Account not activated — please make a deposit before requesting a withdrawal';
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
