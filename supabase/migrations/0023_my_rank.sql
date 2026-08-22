-- Motosu — classement : donne à chaque utilisateur son propre rang (gains
-- cumulés) sans exposer les gains des autres comptes, pour l'afficher en
-- StatCard sur le dashboard sans repasser par get_leaderboard() côté client.

create or replace function public.get_my_rank()
returns table(rank bigint, total_earned bigint)
language sql
stable
security definer
set search_path = public
as $$
  select ranked.rank, ranked.total_earned
  from (
    select w.user_id, row_number() over (order by w.total_earned desc) as rank, w.total_earned
    from public.wallets w
    where w.total_earned > 0
  ) ranked
  where ranked.user_id = auth.uid();
$$;

grant execute on function public.get_my_rank() to authenticated;
