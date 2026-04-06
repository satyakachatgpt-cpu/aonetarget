import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  // Cloudinary URLs are already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Legacy local uploads fallback
  if (url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  }
  return url;
};

export const getVideoUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  }
  return url;
};

export const getPdfUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`;
  }
  return url;
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

export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const getYouTubeThumbnail = (url: string): string => {
  const videoId = extractYouTubeId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
};

export const getGradientPlaceholder = (name: string, gradients: string[]) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const idx = name ? name.charCodeAt(0) % gradients.length : 0;
  return { initial, gradient: gradients[idx] };
};
