/** Extrait l'ID numérique d'une URL de vidéo TikTok standard (…/video/1234567890). */
export function extractTiktokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

export function tiktokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
}
