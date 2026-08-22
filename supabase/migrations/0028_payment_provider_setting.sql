-- Motosu — bascule admin pour choisir le fournisseur de paiement réel
-- (dépôts) sans redéploiement de code. Reste sur 'mock' tant que
-- SASPAY_API_KEY / SASPAY_WEBHOOK_SECRET ne sont pas configurés côté
-- Edge Function — flipper ce réglage avant que le secret existe ferait
-- échouer tous les dépôts en production.

insert into public.system_settings (key, value, type)
values ('payment_provider', '"mock"'::jsonb, 'string')
on conflict (key) do nothing;
