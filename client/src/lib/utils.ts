import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')) return url;
  // Many older items might have just the filename
  return `/uploads/${url}`;
};

export const getYouTubeVideoId = (url: string): string => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v') || '';
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1]?.split(/[?#]/)[0] || '';
  } else if (url.includes('youtube.com/live/')) {
    videoId = url.split('youtube.com/live/')[1]?.split(/[?#]/)[0] || '';
  }
  return videoId;
};

export const getYouTubeThumbnail = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
};

export const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1` : url;
};

export const getGradientPlaceholder = (name: string, gradients: string[]) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const idx = name ? name.charCodeAt(0) % gradients.length : 0;
  return { initial, gradient: gradients[idx] };
};
