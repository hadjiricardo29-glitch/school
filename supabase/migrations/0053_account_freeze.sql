-- Motosu — geler un compte (déjà possible via profiles.status) envoie
-- désormais une notification avec le motif choisi par l'admin (protection
-- anti-usurpation : la personne sait immédiatement pourquoi son accès est
-- coupé) et bloque réellement les actions sensibles — un compte SUSPENDED
-- ne pouvait auparavant plus se voir bloqué que par le frontend, jamais côté
-- serveur : quelqu'un avec un jeton de session volé pouvait encore retirer
-- des fonds via un appel RPC direct.

alter table public.profiles add column if not exists suspension_reason text;

-- Un nouveau paramètre en fin de liste change la signature : sans ce drop,
-- create or replace créerait une surcharge de plus au lieu de remplacer
-- l'existante (même piège que create_withdrawal_request plus haut dans
-- l'historique des migrations).
drop function if exists public.admin_set_user_status(uuid, public.account_status);

create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status, p_reason text default null)
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
  update public.profiles
  set status = p_status,
      suspension_reason = case when p_status = 'SUSPENDED' then p_reason else null end,
      updated_at = now()
  where id = p_user_id;

  if p_status = 'SUSPENDED' then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      p_user_id, 'SYSTEM', 'Compte suspendu',
      coalesce(p_reason, 'Votre compte a été temporairement suspendu pour des raisons de sécurité (protection contre l''usurpation de compte). Contactez le support pour plus d''informations.'),
      jsonb_build_object('reason', p_reason)
    );
  elsif v_old = 'SUSPENDED' and p_status = 'ACTIVE' then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (p_user_id, 'SYSTEM', 'Compte réactivé', 'Votre compte a été réactivé — vous pouvez à nouveau y accéder normalement.', '{}'::jsonb);
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, case when p_status = 'SUSPENDED' then 'SUSPEND_USER' else 'ACTIVATE_USER' end,
    'profile', p_user_id, jsonb_build_object('status', v_old), jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

revoke execute on function public.admin_set_user_status(uuid, public.account_status, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, public.account_status, text) to authenticated;

-- Défense en profondeur : même avec un jeton de session encore valide, un
-- compte suspendu ne peut plus déclencher de retrait via un appel RPC
-- direct (pas seulement bloqué par le garde-fou côté frontend).
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
  v_status public.account_status;
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

  select status into v_status from public.profiles where id = v_user;
  if v_status = 'SUSPENDED' then
    raise exception 'Your account is suspended — withdrawals are disabled';
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
