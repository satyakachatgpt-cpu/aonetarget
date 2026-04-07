import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// ---------- MEDIA URL HELPERS ----------

export const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
};

export const getVideoUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
};

export const getPdfUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
};

// ---------- YOUTUBE HELPERS ----------

export const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;

  // Handle all YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const toYouTubeEmbed = (url: string): string => {
  if (!url) return '';

  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url;

  const id = extractYouTubeId(url);
  if (id) return `https://www.youtube.com/embed/${id}`;

  // Return as-is if not YouTube (e.g. Cloudinary video URL)
  return url;
};

  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
};

/**
 * Detects if a YouTube URL is a LIVE stream (not a normal video).
 * Live URLs contain /live/ or youtube.com/live
 * Example live:   https://www.youtube.com/live/abc123
 * Example normal: https://www.youtube.com/watch?v=xyz
 */
export const isLiveUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('/live/') || url.includes('youtube.com/live');
};

export const getYouTubeThumbnail = (url: string): string => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
};