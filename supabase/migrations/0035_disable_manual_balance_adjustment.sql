-- Motosu — demande explicite : personne, même ADMIN, ne doit pouvoir
-- modifier manuellement le solde d'un utilisateur. La fonction gardait déjà
-- un contrôle de rôle interne correct (ADMIN/FINANCE_ADMIN), mais on coupe
-- ici l'accès RPC pour tout le monde, y compris authenticated/admin. La
-- fonction reste définie (pas de perte de code) pour être réactivée
-- ponctuellement si un besoin légitime se présente, puis re-coupée après.
revoke execute on function public.admin_adjust_balance(uuid, bigint, text) from authenticated;
