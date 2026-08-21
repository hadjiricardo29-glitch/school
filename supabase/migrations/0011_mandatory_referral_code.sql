-- Motosu — code de parrainage obligatoire à l'inscription
--
-- Le tout premier compte (avant qu'aucun profil n'existe) reste exempté :
-- il faut bien un point de départ au réseau. Au-delà, tout nouveau compte
-- doit fournir un code de parrainage qui correspond à un profil existant,
-- sinon l'inscription est rejetée. Appliqué dans le trigger (pas seulement
-- côté frontend) pour rester cohérent avec le reste du projet — défense en
-- profondeur, jamais uniquement côté client.

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

  if v_referrer_id is null and exists (select 1 from public.profiles) then
    raise exception 'A valid referral code is required to create an account';
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
