-- Motosu — bug critique trouvé en testant SASpay en conditions réelles :
-- create_deposit_request laissait toujours la colonne `reference` sur son
-- défaut auto-généré ('DEP-xxxxxxxxxx'), jamais liée à l'identifiant de
-- paiement réel retourné par le fournisseur (SASpay). Le webhook cherche
-- le dépôt via `.eq("reference", result.reference)` — comme les deux ne
-- correspondaient jamais, un dépôt SASpay restait bloqué en PENDING pour
-- toujours, même après un paiement réellement confirmé côté client.

drop function if exists public.create_deposit_request(bigint, text, text);

create or replace function public.create_deposit_request(
  p_amount bigint, p_method text, p_provider text default 'mock', p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  if exists (
    select 1 from public.deposits
    where user_id = v_user and status in ('PENDING', 'COMPLETED')
  ) then
    raise exception 'Only one deposit is allowed per account, and you already made yours';
  end if;

  insert into public.deposits (user_id, amount, method, provider, status, reference)
  values (
    v_user, p_amount, p_method, p_provider, 'PENDING',
    coalesce(p_reference, 'DEP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
  )
  returning id into v_id;

  -- MockPaymentProvider : confirmation instantanée pour la démo
  if p_provider = 'mock' then
    perform public.approve_deposit(v_id);
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_deposit_request(bigint, text, text, text) from anon, public;
