-- Motosu — l'expiration à 5 min (migration précédente) ne se déclenchait
-- que si quelqu'un rechargeait la page dépôt/portefeuille après le délai.
-- Déplacé côté serveur avec pg_cron : une tâche tourne chaque minute et
-- expire elle-même les dépôts PENDING trop vieux, sans dépendre d'une
-- visite utilisateur.

create extension if not exists pg_cron;

create or replace function public.expire_stale_pending_deposits()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
begin
  for v_d in
    select * from public.deposits
    where status = 'PENDING' and created_at < now() - interval '5 minutes'
    for update skip locked
  loop
    update public.deposits
    set status = 'FAILED', processed_at = now(),
        metadata = coalesce(v_d.metadata, '{}'::jsonb)
          || jsonb_build_object('rejection_reason', 'Expiré automatiquement après 5 minutes sans confirmation')
    where id = v_d.id;

    insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
    values (null, 'EXPIRE_DEPOSIT', 'deposit', v_d.id,
      jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'FAILED', 'reason', 'auto_expired'));
  end loop;
end;
$$;

-- Fonction interne uniquement invoquée par le job cron — jamais exposée à
-- un client (ni anon, ni authenticated, ni PUBLIC).
revoke execute on function public.expire_stale_pending_deposits() from anon, public, authenticated;

select cron.schedule(
  'expire-stale-pending-deposits',
  '* * * * *',
  $$select public.expire_stale_pending_deposits();$$
);
