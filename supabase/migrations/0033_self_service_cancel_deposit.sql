-- Motosu — jusqu'ici, seul un ADMIN/FINANCE_ADMIN (ou le webhook via
-- service_role, migration 0032) pouvait débloquer un dépôt PENDING coincé
-- (ex: SIM sans solde, réseau indisponible, l'utilisateur change d'avis).
-- En production, ça veut dire contacter le support à chaque échec — pas
-- soutenable. Ajoute une annulation self-service : le propriétaire du
-- dépôt peut l'annuler lui-même tant qu'il est PENDING.

create or replace function public.cancel_own_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if v_d.user_id <> v_actor then
    raise exception 'Not authorized to cancel this deposit';
  end if;
  if v_d.status <> 'PENDING' then
    raise exception 'Deposit is not pending';
  end if;

  update public.deposits
  set status = 'FAILED', processed_by = v_actor, processed_at = now(),
      metadata = coalesce(v_d.metadata, '{}'::jsonb) || jsonb_build_object('rejection_reason', 'Annulé par l''utilisateur')
  where id = p_deposit_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'CANCEL_DEPOSIT', 'deposit', p_deposit_id,
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'FAILED', 'reason', 'user_cancelled'));
end;
$$;

revoke execute on function public.cancel_own_deposit(uuid) from anon, public;
