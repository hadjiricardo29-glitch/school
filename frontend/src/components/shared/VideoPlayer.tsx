import { ExternalLink } from "lucide-react";
import type { TaskCategory } from "@/types/domain";
import { extractYoutubeVideoId, youtubeEmbedUrl } from "@/utils/video";
import { TikTokEmbed } from "@/components/shared/TikTokEmbed";

interface VideoPlayerProps {
  category: TaskCategory;
  url: string;
  title: string;
  openLabel: string;
}

/** Lecteur adapté à la plateforme de la tâche — TikTok (embed officiel) ou YouTube (16:9) — avec repli en simple lien si l'URL ne correspond à aucun des deux formats. */
export function VideoPlayer({ category, url, title, openLabel }: VideoPlayerProps) {
  if (category === "TIKTOK") {
    return <TikTokEmbed url={url} title={title} openLabel={openLabel} />;
  }

  if (category === "YOUTUBE") {
    const videoId = extractYoutubeVideoId(url);
    if (videoId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
            title={title}
          />
        </div>
      );
    }
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
      {openLabel} <ExternalLink className="size-3.5" />
    </a>
  );
}
