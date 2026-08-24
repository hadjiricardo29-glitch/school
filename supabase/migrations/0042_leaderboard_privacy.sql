-- Motosu — le classement exclut désormais le staff (admin, modérateurs...)
-- et le compte de test "root", et les utilisateurs peuvent choisir de
-- masquer leur propre présence. Contrepartie volontaire : un utilisateur
-- qui se masque ne voit plus les montants ($) de personne sur le
-- classement non plus (get_leaderboard renvoie total_earned = null pour
-- toutes les lignes dans ce cas) — les rangs et pseudos restent visibles.

alter table public.profiles
  add column hide_from_leaderboard boolean not null default false;

create or replace function public.get_leaderboard(p_limit int default 20)
returns table (
  rank bigint,
  username text,
  avatar_url text,
  total_earned bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller_hidden boolean;
begin
  select coalesce(p.hide_from_leaderboard, false) into v_caller_hidden
  from public.profiles p
  where p.id = auth.uid();

  return query
  select
    row_number() over (order by w.total_earned desc) as rank,
    p.username,
    p.avatar_url,
    case when v_caller_hidden then null else w.total_earned end as total_earned
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where w.total_earned > 0
    and p.role = 'USER'
    and lower(p.username) <> 'root'
    and not p.hide_from_leaderboard
  order by w.total_earned desc
  limit greatest(p_limit, 1);
end;
$$;

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
    join public.profiles p on p.id = w.user_id
    where w.total_earned > 0
      and p.role = 'USER'
      and lower(p.username) <> 'root'
      and not p.hide_from_leaderboard
  ) ranked
  where ranked.user_id = auth.uid();
$$;

grant execute on function public.get_leaderboard(int) to authenticated;
grant execute on function public.get_my_rank() to authenticated;
revoke execute on function public.get_leaderboard(int) from anon;
revoke execute on function public.get_my_rank() from anon;
