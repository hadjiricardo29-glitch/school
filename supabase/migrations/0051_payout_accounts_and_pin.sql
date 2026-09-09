-- Motosu — compte Mobile Money enregistré une fois (nom, pays, opérateur,
-- numéro), réutilisé pour les dépôts ET les retraits au lieu de ressaisir
-- ces informations à chaque demande. Le retrait est en plus protégé par un
-- code PIN dédié (distinct du mot de passe de connexion) — jamais lisible
-- côté client, même par son propriétaire : uniquement vérifiable via RPC.

create table public.payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  account_name text not null,
  country text not null,
  operator text not null,
  phone text not null,
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

create policy "users manage own payout account" on public.payout_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "staff read payout accounts" on public.payout_accounts
  for select using (public.is_staff());

revoke all on public.payout_accounts from anon;

-- Aucune policy SELECT/INSERT/UPDATE/DELETE ici, pour personne (staff
-- inclus) : le hash de PIN n'est jamais lu ni écrit par une requête client
-- directe, uniquement via les fonctions SECURITY DEFINER ci-dessous.
create table public.payout_pins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.payout_pins enable row level security;
revoke all on public.payout_pins from anon, authenticated;

create or replace function public.has_withdrawal_pin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.payout_pins where user_id = auth.uid());
$$;

revoke execute on function public.has_withdrawal_pin() from anon, public;
grant execute on function public.has_withdrawal_pin() to authenticated;

create or replace function public.set_withdrawal_pin(p_new_pin text, p_current_pin text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing_hash text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_new_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;

  select pin_hash into v_existing_hash from public.payout_pins where user_id = v_user;
  if v_existing_hash is not null then
    if p_current_pin is null or extensions.crypt(p_current_pin, v_existing_hash) <> v_existing_hash then
      raise exception 'Current PIN is incorrect';
    end if;
  end if;

  insert into public.payout_pins (user_id, pin_hash, updated_at)
  values (v_user, extensions.crypt(p_new_pin, extensions.gen_salt('bf')), now())
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

revoke execute on function public.set_withdrawal_pin(text, text) from anon, public;
grant execute on function public.set_withdrawal_pin(text, text) to authenticated;

-- La demande de retrait n'accepte plus de destination ad-hoc envoyée par le
-- client : elle utilise le compte enregistré (payout_accounts) et exige le
-- code PIN, vérifié côté serveur contre le hash stocké dans payout_pins.
drop function if exists public.create_withdrawal_request(bigint, text, jsonb, public.earning_bucket, text);

create or replace function public.create_withdrawal_request(
  p_amount bigint,
  p_pin text,
  p_bucket public.earning_bucket default 'WALLET'::public.earning_bucket,
  p_ip_address text default null
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
  v_account public.payout_accounts%rowtype;
  v_pin_hash text;
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

  select * into v_account from public.payout_accounts where user_id = v_user;
  if not found then
    raise exception 'Please configure your withdrawal account first';
  end if;

  select pin_hash into v_pin_hash from public.payout_pins where user_id = v_user;
  if v_pin_hash is null then
    raise exception 'Please set a withdrawal PIN first';
  end if;
  if p_pin is null or extensions.crypt(p_pin, v_pin_hash) <> v_pin_hash then
    raise exception 'Incorrect withdrawal PIN';
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

  insert into public.withdrawal_requests (user_id, amount, fee, net_amount, method, destination, status, ip_address)
  values (
    v_user, p_amount, v_fee, v_net, v_account.operator,
    jsonb_build_object('account_name', v_account.account_name, 'country', v_account.country, 'operator', v_account.operator, 'phone', v_account.phone, 'bucket', p_bucket),
    'PENDING', p_ip_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_withdrawal_request(bigint, text, public.earning_bucket, text) from public, anon;
grant execute on function public.create_withdrawal_request(bigint, text, public.earning_bucket, text) to authenticated;
