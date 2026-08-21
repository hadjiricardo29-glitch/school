-- Motosu — fonctions utilitaires + triggers

-- ============================================================
-- current_role(): rôle du user authentifié courant (utilisé par RLS)
-- ============================================================
create or replace function public.current_role()
returns public.user_role
language sql stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('ADMIN','MODERATOR','FINANCE_ADMIN','TASK_MANAGER'), false);
$$;

-- ============================================================
-- Réglages système (system_settings) — helpers de lecture typés
-- ============================================================
create or replace function public.get_setting_numeric(p_key text, p_default numeric default 0)
returns numeric
language sql stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::numeric from public.system_settings where key = p_key), p_default);
$$;

create or replace function public.get_setting_text(p_key text, p_default text default '')
returns text
language sql stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}') from public.system_settings where key = p_key), p_default);
$$;

create or replace function public.get_setting_bool(p_key text, p_default boolean default false)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce((select (value #>> '{}')::boolean from public.system_settings where key = p_key), p_default);
$$;

-- ============================================================
-- handle_new_user(): création automatique du profil + wallet
-- à l'inscription (trigger sur auth.users), résolution du
-- parrain à partir du referral_code fourni dans raw_user_meta_data.
-- Anti auto-parrainage : le parrain doit déjà exister avant que
-- ce user n'existe, donc new.id ne peut jamais matcher.
-- Anti boucle : referred_by n'est jamais modifiable après coup
-- (voir trigger prevent_referred_by_change plus bas).
-- ============================================================
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
begin
  v_username := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)));
  -- garantit l'unicité du username en ajoutant un suffixe si besoin
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Empêche toute modification de referred_by après création
-- (anti boucle / anti modification abusive du parrain)
-- ============================================================
create or replace function public.prevent_referred_by_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referred_by is distinct from old.referred_by then
    raise exception 'referred_by cannot be changed after account creation';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_referred_by_change
  before update on public.profiles
  for each row execute function public.prevent_referred_by_change();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime('updated_at');

-- ============================================================
-- Garde-fou à la création d'une soumission de mission :
-- mission publiée, deadline non dépassée, places disponibles,
-- et empêche de réclamer deux fois une mission à participation unique.
-- ============================================================
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

create trigger trg_check_submission_allowed
  before insert on public.task_submissions
  for each row execute function public.check_submission_allowed();
