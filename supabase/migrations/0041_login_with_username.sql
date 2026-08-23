-- Motosu — permet de se connecter avec le nom d'utilisateur en plus de
-- l'email : Supabase Auth n'authentifie que par email, donc on résout le
-- nom d'utilisateur vers l'email correspondant AVANT signInWithPassword.
-- Doit être appelable par anon (l'utilisateur n'est pas encore connecté) —
-- révèle qu'un username existe (comme le ferait un formulaire d'inscription
-- avec vérification de disponibilité), mais jamais si le mot de passe est
-- correct : le frontend retombe sur l'identifiant saisi si aucun username
-- ne correspond, laissant signInWithPassword échouer avec son message
-- générique habituel.
create or replace function public.get_email_for_login(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  if p_identifier is null or length(trim(p_identifier)) = 0 then
    return null;
  end if;

  if p_identifier ilike '%@%' then
    return null; -- déjà un email, rien à résoudre côté client
  end if;

  select id into v_user_id from public.profiles where lower(username) = lower(trim(p_identifier));
  if v_user_id is null then
    return null;
  end if;

  select email into v_email from auth.users where id = v_user_id;
  return v_email;
end;
$$;

revoke execute on function public.get_email_for_login(text) from public;
grant execute on function public.get_email_for_login(text) to anon, authenticated;
