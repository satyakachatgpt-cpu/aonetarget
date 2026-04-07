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

  const regExp =
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]+)/;

  return url.match(regExp)?.[1] || null;
};

export const toYouTubeEmbed = (url: string): string | null => {
  const id = extractYouTubeId(url);
  if (!id) return null;

  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
};

export const getYouTubeThumbnail = (url: string): string => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
};