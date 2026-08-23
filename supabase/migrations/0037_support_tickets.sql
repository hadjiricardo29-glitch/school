-- Motosu — section Support demandée : les utilisateurs peuvent écrire à
-- l'équipe pour une préoccupation, le staff répond depuis l'admin.

create type public.support_ticket_status as enum ('OPEN', 'IN_PROGRESS', 'RESOLVED');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status public.support_ticket_status not null default 'OPEN',
  admin_reply text,
  replied_by uuid references public.profiles(id),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_id_idx on public.support_tickets(user_id);
create index support_tickets_status_idx on public.support_tickets(status);

alter table public.support_tickets enable row level security;

create policy "users read own tickets" on public.support_tickets
  for select using (auth.uid() = user_id);

create policy "users create own tickets" on public.support_tickets
  for insert with check (auth.uid() = user_id);

create policy "staff manage all tickets" on public.support_tickets
  for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.reply_support_ticket(p_ticket_id uuid, p_reply text, p_status public.support_ticket_status default 'RESOLVED')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_ticket public.support_tickets%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Not authorized to reply to support tickets';
  end if;
  if p_reply is null or length(trim(p_reply)) = 0 then
    raise exception 'Reply cannot be empty';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'Ticket not found';
  end if;

  update public.support_tickets
  set admin_reply = p_reply, status = p_status, replied_by = v_actor, replied_at = now(), updated_at = now()
  where id = p_ticket_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_ticket.user_id, 'SYSTEM', 'Réponse du support', p_reply, jsonb_build_object('ticket_id', p_ticket_id));
end;
$$;

revoke execute on function public.reply_support_ticket(uuid, text, public.support_ticket_status) from anon, public;

-- Même constat que sur profiles (migration 0036) : une table neuve reçoit
-- par défaut un grant large à `anon`, indépendamment de RLS. RLS bloque
-- déjà tout pour anon ici (auth.uid() est null), mais autant couper le
-- grant à la racine — aucun usage légitime anonyme sur cette table.
revoke all on public.support_tickets from anon;
