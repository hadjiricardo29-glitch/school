-- Motosu — le compteur de notifications non lues utilisait une requête HEAD
-- avec comptage PostgREST (select("id", { count: "exact", head: true })),
-- connue pour échouer silencieusement dans certains navigateurs/bloqueurs de
-- pub/proxys ("Fetch failed loading", pas une erreur HTTP normale). On
-- bascule sur une fonction RPC dédiée, comme count_activated_referrals et
-- les autres compteurs déjà servis ainsi dans ce projet.

create or replace function public.get_unread_notification_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read = false;
$$;

revoke execute on function public.get_unread_notification_count() from anon, public;
grant execute on function public.get_unread_notification_count() to authenticated;
