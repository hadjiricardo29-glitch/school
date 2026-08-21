-- Motosu — seuil de parrainage avant retrait
--
-- Un utilisateur doit avoir au moins N filleuls directs ACTIVÉS (qui ont
-- eux-mêmes fait leur dépôt d'activation, voir is_account_activated())
-- avant de pouvoir demander un retrait. Seuil configurable, 0 = désactivé.

insert into public.system_settings (key, value, type) values
  ('withdrawal_min_referrals', '10', 'number')
on conflict (key) do nothing;

create or replace function public.count_activated_referrals(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.profiles p
  where p.referred_by = p_user_id
    and public.is_account_activated(p.id);
$$;

grant execute on function public.count_activated_referrals(uuid) to authenticated;

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
