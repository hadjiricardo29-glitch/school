-- Motosu — statut d'activation des filleuls directs ("dormants" vs actifs)
--
-- Les policies RLS sur `wallets` empêchent un user de lire le wallet de ses
-- filleuls (seul le sien, ou le staff). On expose donc uniquement le
-- booléen d'activation via une fonction SECURITY DEFINER — jamais le
-- montant réel déposé — pour permettre à /referrals de distinguer les
-- filleuls actifs des dormants sans fuite d'information financière.
-- La relation de parrainage elle-même (referred_by) est déjà publique via
-- la policy "profiles are readable by everyone", donc ceci n'ajoute pas de
-- nouvelle fuite de vie privée, juste un indicateur d'activation dérivé.

create or replace function public.get_direct_referrals_with_status(p_user_id uuid)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz,
  activated boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.created_at,
         public.is_account_activated(p.id)
  from public.profiles p
  where p.referred_by = p_user_id
  order by p.created_at desc;
$$;

grant execute on function public.get_direct_referrals_with_status(uuid) to authenticated;
