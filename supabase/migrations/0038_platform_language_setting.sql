-- Motosu — bascule de langue globale de la plateforme (pas un préférence
-- par utilisateur) : anglais par défaut, modifiable uniquement depuis
-- Admin > Paramètres.
insert into public.system_settings (key, value, type) values
  ('platform_language', '"en"', 'text')
on conflict (key) do nothing;
