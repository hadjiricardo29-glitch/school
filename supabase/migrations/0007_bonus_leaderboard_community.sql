-- Motosu — bonus de bienvenue, classement public, liens communauté
-- (mécaniques fonctionnelles génériques de rewards-app, design/texte originaux)

insert into public.system_settings (key, value, type) values
  ('welcome_bonus_amount', '200', 'number'),
  ('community_telegram_url', '""', 'string'),
  ('community_whatsapp_url', '""', 'string')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- Bonus de bienvenue : étend handle_new_user pour créditer un
-- montant configurable (0 = désactivé) à la création du compte.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_input text;
  v_referrer_id uuid;
  v_username text;
  v_new_code text;
  v_suffix int := 0;
  v_welcome_bonus bigint;
begin
  v_username := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)));
  while exists (select 1 from public.profiles where username = v_username || case when v_suffix = 0 then '' else v_suffix::text end) loop
    v_suffix := v_suffix + 1;
  end loop;
  if v_suffix > 0 then
    v_username := v_username || v_suffix::text;
  end if;

  v_referral_input := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');
  if v_referral_input is not null then
    select id into v_referrer_id from public.profiles
    where referral_code = upper(v_referral_input) or username = lower(v_referral_input)
    limit 1;
  end if;

  loop
    v_new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_new_code);
  end loop;

  insert into public.profiles (
    id, username, first_name, last_name, country, phone_code, phone,
    referral_code, referred_by
  ) values (
    new.id,
    v_username,
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'country'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone_code'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    v_new_code,
    v_referrer_id
  );

  insert into public.wallets (user_id) values (new.id);

  v_welcome_bonus := public.get_setting_numeric('welcome_bonus_amount', 0);
  if v_welcome_bonus > 0 then
    insert into public.transactions (user_id, type, amount, currency, status, description)
    values (new.id, 'BONUS', v_welcome_bonus, 'XOF', 'COMPLETED', 'Récompense de bienvenue');

    update public.wallets
    set available_balance = available_balance + v_welcome_bonus,
        total_earned = total_earned + v_welcome_bonus
    where user_id = new.id;

    insert into public.notifications (user_id, type, title, message)
    values (new.id, 'SYSTEM', 'Bienvenue !', 'Vous avez reçu ' || v_welcome_bonus || ' FCFA pour votre inscription.');
  end if;

  if v_referrer_id is not null then
    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_referrer_id, 'REFERRAL_JOINED', 'Nouveau filleul',
      '@' || v_username || ' a rejoint votre équipe via votre lien de parrainage.',
      jsonb_build_object('referred_user_id', new.id)
    );
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- Classement public : expose uniquement (username, avatar, total_earned)
-- pour les N meilleurs gains, sans exposer la table wallets entière
-- (dont les policies RLS restent limitées à soi-même/staff).
-- ------------------------------------------------------------
create or replace function public.get_leaderboard(p_limit int default 20)
returns table (
  rank bigint,
  username text,
  avatar_url text,
  total_earned bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (order by w.total_earned desc) as rank,
    p.username,
    p.avatar_url,
    w.total_earned
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where w.total_earned > 0
  order by w.total_earned desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_leaderboard(int) to authenticated;
