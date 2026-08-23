-- Motosu — coffre-fort minimal pour des identifiants tiers (ex: clé API
-- Gemini pour la génération de quiz) que les Edge Functions doivent lire,
-- mais qu'aucun client (anon, authenticated, staff inclus) ne doit jamais
-- pouvoir lire via l'API REST. Contrairement à system_settings ("readable
-- by everyone"), cette table n'a AUCUNE policy — RLS activé sans aucune
-- policy équivaut à un refus total pour anon/authenticated ; seul le
-- service_role (utilisé exclusivement côté Edge Function) contourne RLS.
create table public.secure_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.secure_config enable row level security;

revoke all on public.secure_config from anon, authenticated, public;
