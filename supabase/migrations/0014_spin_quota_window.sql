-- Motosu — la roue de la chance passe d'un cooldown fixe à un quota glissant
-- ("N tirages tous les X jours" au lieu de "1 tirage toutes les X heures").

insert into public.system_settings (key, value, type) values
  ('spin_max_per_window', '3', 'number'),
  ('spin_window_days', '5', 'number')
on conflict (key) do nothing;

create or replace function public.get_next_spin_at(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select created_at
    from public.transactions
    where user_id = p_user_id
      and type = 'BONUS'
      and metadata->>'source' = 'spin'
      and created_at > now() - (public.get_setting_numeric('spin_window_days', 5) || ' days')::interval
    order by created_at asc
  )
  select case
    when (select count(*) from recent) < public.get_setting_numeric('spin_max_per_window', 3)::int
      then now() - interval '1 second'
    else (select created_at from recent limit 1) + (public.get_setting_numeric('spin_window_days', 5) || ' days')::interval
  end;
$$;

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
