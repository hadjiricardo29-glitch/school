-- Motosu — roue de la chance : jackpot réduit, quota hebdomadaire, tirage
-- pondéré vers les petits montants (le jackpot ne doit sortir que rarement).
--
-- power(random(), 3) au lieu de random() : la distribution uniforme est
-- remplacée par une distribution fortement penchée vers 0. Concrètement,
-- la moitié des tirages tombent dans les 12,5% inférieurs de la plage, et
-- environ 1,7% seulement dans les 5% supérieurs (proche du jackpot).

insert into public.system_settings (key, value, type) values
  ('spin_min_reward', '25', 'number'),
  ('spin_max_reward', '100', 'number'),
  ('spin_max_per_window', '2', 'number'),
  ('spin_window_days', '7', 'number')
on conflict (key) do update set value = excluded.value;

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

  v_min := public.get_setting_numeric('spin_min_reward', 25);
  v_max := public.get_setting_numeric('spin_max_reward', 100);
  if v_max < v_min then
    v_max := v_min;
  end if;
  -- Tirage pondéré : power(random(), 3) concentre le résultat près de 0,
  -- donc près de v_min la plupart du temps, très rarement près de v_max.
  v_reward := v_min + floor(power(random(), 3) * (v_max - v_min + 1))::bigint;

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
