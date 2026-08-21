-- Motosu — vidéo intégrée pour les missions de type "regarder une vidéo"
-- (ex: TikTok). Le lecteur est embarqué directement dans l'application au
-- lieu de renvoyer l'utilisateur vers l'app externe.

alter table public.tasks add column if not exists video_url text;
