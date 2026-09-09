-- Motosu — trace l'IP de connexion de chaque utilisateur (capturée côté
-- Edge Function, seul endroit qui voit le vrai en-tête réseau — jamais
-- fournie par le client) pour que le staff puisse repérer des comportements
-- suspects (plusieurs comptes connectés depuis la même IP, changement brutal
-- de localisation, etc.). N'expose jamais de mot de passe : Supabase Auth ne
-- stocke que des hachages bcrypt irréversibles, ni l'app ni personne ne peut
-- les lire en clair.

alter table public.profiles
  add column if not exists last_login_ip text,
  add column if not exists last_login_at timestamptz;

create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index login_events_user_id_idx on public.login_events(user_id);
create index login_events_ip_address_idx on public.login_events(ip_address);

alter table public.login_events enable row level security;

create policy "staff read login events" on public.login_events
  for select using (public.is_staff());

revoke all on public.login_events from anon, authenticated;

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
  set last_login_ip = p_ip_address, last_login_at = now()
  where id = v_user;
end;
$$;

revoke execute on function public.record_login(text, text) from anon, public;
grant execute on function public.record_login(text, text) to authenticated;
