-- Motosu — BUG CRITIQUE : le webhook SASpay (supabase/functions/payments,
-- route /webhook) appelle approve_deposit/reject_deposit via un client
-- SERVICE ROLE (aucun utilisateur connecté, auth.uid() = null). Les deux
-- fonctions exigeaient un profil ADMIN/FINANCE_ADMIN pour auth.uid() —
-- testé et confirmé : un appel avec auth.uid() null lève toujours
-- "Not authorized to approve deposits". Résultat : même une fois le bug de
-- référence ET le bug de mapping de statut SASpay corrigés, un paiement
-- réellement confirmé par le client serait resté bloqué en PENDING pour
-- toujours — le webhook n'a jamais pu fonctionner de bout en bout.
--
-- Fix : autoriser explicitement les appels authentifiés avec le JWT
-- service_role (celui que l'Edge Function utilise pour le webhook), en plus
-- des rôles ADMIN/FINANCE_ADMIN existants et du bypass self-mock.

create or replace function public.approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_is_self_mock boolean;
  v_is_service_role boolean;
begin
  select * into v_d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if v_d.status <> 'PENDING' then
    raise exception 'Deposit is not pending';
  end if;

  v_is_service_role := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
  select role into v_actor_role from public.profiles where id = v_actor;
  v_is_self_mock := (v_d.provider = 'mock' and v_actor = v_d.user_id);
  if not v_is_self_mock and not v_is_service_role and (v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN')) then
    raise exception 'Not authorized to approve deposits';
  end if;

  update public.wallets
  set available_balance = available_balance + v_d.amount,
      total_deposited = total_deposited + v_d.amount,
      updated_at = now()
  where user_id = v_d.user_id;

  perform public.credit_wallet_bucket(v_d.user_id, 'WALLET', v_d.amount);

  update public.deposits
  set status = 'COMPLETED', processed_by = v_actor, processed_at = now()
  where id = p_deposit_id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (v_d.user_id, 'DEPOSIT', v_d.amount, 'XOF', 'COMPLETED',
    case when v_d.provider = 'mock' then 'Frais d''activation (démo)' else 'Frais d''activation confirmés' end,
    jsonb_build_object('deposit_id', p_deposit_id, 'method', v_d.method, 'provider', v_d.provider));

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_d.user_id, 'PAYMENT_RECEIVED', 'Compte activé',
    'Frais d''activation de ' || v_d.amount || ' FCFA payés — votre compte est actif.',
    jsonb_build_object('deposit_id', p_deposit_id));

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'APPROVE_DEPOSIT', 'deposit', p_deposit_id,
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'COMPLETED'));
end;
$$;

create or replace function public.reject_deposit(p_deposit_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.deposits%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_is_service_role boolean;
begin
  v_is_service_role := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
  select role into v_actor_role from public.profiles where id = v_actor;
  if not v_is_service_role and (v_actor_role is null or v_actor_role not in ('ADMIN','FINANCE_ADMIN')) then
    raise exception 'Not authorized to reject deposits';
  end if;

  select * into v_d from public.deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit not found';
  end if;
  if v_d.status <> 'PENDING' then
    raise exception 'Deposit is not pending';
  end if;

  update public.deposits
  set status = 'FAILED', processed_by = v_actor, processed_at = now(),
      metadata = v_d.metadata || jsonb_build_object('rejection_reason', p_reason)
  where id = p_deposit_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (v_actor, 'REJECT_DEPOSIT', 'deposit', p_deposit_id,
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'FAILED', 'reason', p_reason));
end;
$$;

revoke execute on function public.approve_deposit(uuid) from anon, public;
revoke execute on function public.reject_deposit(uuid, text) from anon, public;
