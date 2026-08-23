-- Motosu — audit IDOR / extraction de données demandé par l'utilisateur.
-- Trois trous trouvés et corrigés ici :
--
-- 1) CRITIQUE — `profiles` avait une policy SELECT `qual: true` (lisible par
--    tout le monde) ET un grant SELECT à `anon`. Concrètement, N'IMPORTE QUI
--    sur internet, sans même être connecté, pouvait faire
--    GET /rest/v1/profiles?select=* avec la clé anon publique et récupérer
--    téléphone, prénom/nom, pays, code de parrainage, rôle... de TOUS les
--    utilisateurs. Corrigé : lecture restreinte à sa propre ligne (le staff
--    garde un accès complet via la policy "staff manage all profiles"
--    existante), et tous les privilèges anon sur la table sont révoqués
--    (aucun usage légitime ne passe par un accès anonyme direct à la table).
--
-- 2) CRITIQUE — `credit_wallet_bucket` (aide interne appelée par
--    approve_deposit/claim_daily_spin/admin_adjust_balance) n'avait AUCUN
--    contrôle et était directement appelable via
--    POST /rest/v1/rpc/credit_wallet_bucket par n'importe quel utilisateur
--    connecté, avec n'importe quel user_id/bucket/montant. Ne débloque pas
--    un retrait à lui seul (wallets.available_balance reste le vrai
--    plafond, vérifié séparément), mais permet de fausser arbitrairement
--    wallet_balances (répartition par catégorie, total_earned utilisé
--    potentiellement par le classement). Corrigé : accès RPC direct coupé,
--    reste utilisable en interne (les fonctions SECURITY DEFINER qui
--    l'appellent s'exécutent avec les droits du propriétaire, pas de
--    l'appelant).
--
-- 3) IDOR plus mineur — `count_activated_referrals` et
--    `get_direct_referrals_with_status` acceptaient un p_user_id arbitraire
--    sans vérifier qu'il correspond à l'appelant (ou à du staff). Usage
--    actuel toujours avec son propre id côté client, mais rien n'empêchait
--    d'appeler l'API avec l'id de quelqu'un d'autre pour lire son réseau de
--    parrainage. Corrigé avec un contrôle explicite.
--
-- Remplace aussi le calcul de l'arbre d'équipe (TeamPage), qui faisait
-- jusqu'ici des `select("*") from profiles` bruts recursifs côté client —
-- cassé par le point (1) puisqu'il lisait les lignes d'autres utilisateurs.
-- Nouvelle fonction get_my_team_tree(), toujours ancrée sur auth.uid() (donc
-- aucun paramètre id arbitraire possible), qui renvoie tout le sous-réseau
-- en un seul aller-retour au lieu d'un appel récursif par niveau.

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "users read own profile" on public.profiles for select using (auth.uid() = id);

revoke all on public.profiles from anon;

revoke execute on function public.credit_wallet_bucket(uuid, earning_bucket, bigint) from anon, authenticated, public;

create or replace function public.count_activated_referrals(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user_id = auth.uid() or public.is_staff() then (
      select count(*)::int
      from public.profiles p
      where p.referred_by = p_user_id
        and public.is_account_activated(p.id)
    )
    else 0
  end;
$$;

create or replace function public.get_direct_referrals_with_status(p_user_id uuid)
returns table(id uuid, username text, first_name text, last_name text, avatar_url text, created_at timestamptz, activated boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.created_at,
         public.is_account_activated(p.id)
  from public.profiles p
  where p.referred_by = p_user_id
    and (p_user_id = auth.uid() or public.is_staff())
  order by p.created_at desc;
$$;

create or replace function public.get_my_team_tree(p_max_depth int default 10)
returns table(id uuid, username text, first_name text, last_name text, avatar_url text, created_at timestamptz, referred_by uuid, depth int, activated boolean)
language sql
stable
security definer
set search_path = public
as $$
  with recursive downline as (
    select p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.created_at, p.referred_by, 0 as depth
    from public.profiles p
    where p.id = auth.uid()
    union all
    select p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.created_at, p.referred_by, d.depth + 1
    from public.profiles p
    join downline d on p.referred_by = d.id
    where d.depth < p_max_depth
  )
  select d.id, d.username, d.first_name, d.last_name, d.avatar_url, d.created_at, d.referred_by, d.depth,
         public.is_account_activated(d.id)
  from downline d
  order by d.depth;
$$;

revoke execute on function public.count_activated_referrals(uuid) from anon, public;
revoke execute on function public.get_direct_referrals_with_status(uuid) from anon, public;
revoke execute on function public.get_my_team_tree(int) from anon, public;
