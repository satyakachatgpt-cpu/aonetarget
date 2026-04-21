import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// ---------- MEDIA URL HELPERS ----------

export const normalizeId = (id: any): string => {
  if (!id) return "";
  if (typeof id === 'object' && id.$oid) return String(id.$oid).toLowerCase();
  return String(id).trim().toLowerCase();
};

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
  const trimmed = url.trim();
  
  // 1. Full URLs
  if (trimmed.startsWith("http")) return trimmed;
  
  // 2. Relative paths with leading slash
  if (trimmed.startsWith("/")) return `${API_BASE}${trimmed}`;
  
  // 3. Old stored formats / Relative paths without slash
  // If it's just a filename.pdf or similar
  if (trimmed.includes('.') && !trimmed.includes('/') && !trimmed.includes('\\')) {
    return `${API_BASE}/uploads/${trimmed}`;
  }
  
  // 4. Relative paths starting with uploads/
  if (trimmed.startsWith("uploads/")) return `${API_BASE}/${trimmed}`;

  return trimmed;
};

/**
 * Returns a URL safe for iframe viewing, using proxy for external/Cloudinary URLs.
 */
export const getViewerUrl = (url: string | undefined | null): string => {
  const normalizedUrl = getPdfUrl(url);
  if (!normalizedUrl) return "";
  
  // If it's a local URL (same origin as API), we might not need proxy, 
  // but proxying ensures consistent headers for PDF viewing.
  // Especially for Cloudinary and Google Drive.
  if (normalizedUrl.includes('res.cloudinary.com') || 
      normalizedUrl.includes('drive.google.com') || 
      normalizedUrl.includes('docs.google.com') ||
      !normalizedUrl.startsWith(window.location.origin)) {
    return `${API_BASE}/api/proxy-resource?url=${encodeURIComponent(normalizedUrl)}`;
  }
  
  return normalizedUrl;
};


// ---------- YOUTUBE HELPERS ----------

export const isYouTubeUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be/.test(url);
};

export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;

  // Handle all YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/|youtu\.be\/)([^&\n?#]+)/,
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

/**
 * Converts YouTube URL to embed format.
 * Supports /live/ and watch?v= formats.
 */
export function getEmbedUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.includes("youtube.com/live/")) {
    return url.replace("live/", "embed/");
  }
  if (url.includes("watch?v=")) {
    return url.replace("watch?v=", "embed/");
  }
  return url;
}

export const getYouTubeThumbnail = (url: string): string => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
};

/**
 * Returns a consistent gradient and initial for a given title.
 * Used for placeholders when an image is missing or loading.
 * @param text The text to get an initial from (e.g. course title)
 * @param gradients An array of gradient class strings
 */
export const getGradientPlaceholder = (text: string | undefined | null, gradients: string[]) => {
  const safeText = text || 'Course';
  const initial = safeText.trim().charAt(0).toUpperCase();

  // Simple hash to pick a consistent gradient from the array
  let hash = 0;
  for (let i = 0; i < safeText.length; i++) {
    hash = safeText.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % (gradients.length || 1);
  return {
    gradient: gradients[index] || 'from-gray-400 to-gray-600',
    initial
  };
};