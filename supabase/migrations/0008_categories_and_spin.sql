-- Motosu — élargit les catégories de missions et ajoute la Roue de la chance
-- (mécaniques génériques de rewards-app repérées dans la structure de menu
-- d'une plateforme concurrente ; implémentation et wording 100% originaux)

-- ------------------------------------------------------------
-- Nouvelles catégories de missions : les "modalités de gain" séparées
-- ailleurs (Pub, Vidéos, TikTok, Quiz) deviennent ici des catégories
-- filtrables dans la même marketplace de missions plutôt que des
-- sous-systèmes dupliqués — plus simple à maintenir, même résultat
-- pour l'utilisateur (filtrer /tasks par catégorie).
-- ------------------------------------------------------------
alter type public.task_category add value if not exists 'ADS';
alter type public.task_category add value if not exists 'VIDEOS';
alter type public.task_category add value if not exists 'TIKTOK';
alter type public.task_category add value if not exists 'QUIZ';

-- ------------------------------------------------------------
-- Roue de la chance : un tirage gratuit par intervalle configurable,
-- montant aléatoire entre deux bornes admin. Traçé comme une transaction
-- BONUS classique (metadata.source = 'spin'), donc visible dans le ledger
-- comme n'importe quel autre gain — pas de table dédiée nécessaire.
-- ------------------------------------------------------------
insert into public.system_settings (key, value, type) values
  ('spin_enabled', 'true', 'boolean'),
  ('spin_min_reward', '50', 'number'),
  ('spin_max_reward', '500', 'number'),
  ('spin_cooldown_hours', '24', 'number')
on conflict (key) do nothing;

create or replace function public.get_next_spin_at(p_user_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select max(created_at) + (public.get_setting_numeric('spin_cooldown_hours', 24) || ' hours')::interval
      from public.transactions
      where user_id = p_user_id and type = 'BONUS' and metadata->>'source' = 'spin'
    ),
    now() - interval '1 second'
  );
$$;

grant execute on function public.get_next_spin_at(uuid) to authenticated;

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

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_user, 'SYSTEM', 'Roue de la chance', 'Vous avez gagné ' || v_reward || ' FCFA !', jsonb_build_object('source', 'spin'));

  return v_reward;
end;
$$;

grant execute on function public.claim_daily_spin() to authenticated;
