import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface TikTokEmbedProps {
  url: string;
  title: string;
  openLabel: string;
}

/**
 * Résout l'URL (lien complet OU lien court vt.tiktok.com/vm.tiktok.com) via
 * l'API oEmbed officielle de TikTok pour obtenir l'ID numérique de la
 * vidéo — le widget officiel <blockquote>/embed.js ne fait, lui, qu'un
 * regex côté client sur l'URL et échoue silencieusement sur les liens
 * courts (vérifié : il pointe vers /embed/v2/null). oEmbed autorise le CORS
 * cross-origin, donc l'appel se fait directement depuis le navigateur.
 */
export function TikTokEmbed({ url, title, openLabel }: TikTokEmbedProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setVideoId(null);
    setFailed(false);
    fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error("oembed request failed");
        return res.json();
      })
      .then((data: { embed_product_id?: string }) => {
        if (cancelled) return;
        if (data.embed_product_id) setVideoId(data.embed_product_id);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        {openLabel} <ExternalLink className="size-3.5" />
      </a>
    );
  }

  if (!videoId) {
    return <div className="mx-auto aspect-[9/16] w-full max-w-xs animate-pulse rounded-md border border-border bg-surface-alt" />;
  }

  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-xs overflow-hidden rounded-md border border-border">
      <iframe src={`https://www.tiktok.com/embed/v2/${videoId}`} allow="encrypted-media; fullscreen" className="size-full" title={title} />
    </div>
  );
}
