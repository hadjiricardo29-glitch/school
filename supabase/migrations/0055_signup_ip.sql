-- Motosu — IP de création du compte, distincte de la dernière IP de
-- connexion. Capturée au premier appel jamais reçu de record_login pour ce
-- profil (signup avec confirmation email désactivée : juste après
-- l'inscription ; confirmation activée : à la première connexion après
-- confirmation — dans les deux cas, c'est bien l'IP associée à la création
-- réelle du compte, pas une connexion ultérieure).

alter table public.profiles add column if not exists signup_ip text;

create or replace function public.record_login(p_ip_address text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.login_events (user_id, ip_address, user_agent)
  values (v_user, p_ip_address, p_user_agent);

  update public.profiles
  set last_login_ip = p_ip_address,
      last_login_at = now(),
      signup_ip = coalesce(signup_ip, p_ip_address)
  where id = v_user;
end;
$$;
