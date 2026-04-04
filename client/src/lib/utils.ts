import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getImageUrl = (url: string | undefined | null) => {
  if (!url || typeof url !== 'string') return '';
  
  // Map absolute URLs from old server to local uploads
  if (url.startsWith('https://aonetarget.in/uploads/') || url.startsWith('http://aonetarget.in/uploads/')) {
    const filename = url.split('/').pop();
    return filename ? `/uploads/${filename}` : url;
  }

  // If it's a relative path starting with /uploads, we need to ensure it's resolved correctly
  // especially when frontend and backend are on different ports
  if (url.startsWith('/uploads/')) {
    // In development or when using IP, we need to point to the backend port (5000)
    // if the current window is on a different port (like 5173)
    if (typeof window !== 'undefined' && window.location.port !== '5000' && window.location.hostname !== 'localhost') {
       // If accessed via IP (e.g. 192.168.1.5), we must use the server's IP and port
       return `http://${window.location.hostname}:5000${url}`;
    }
    // For local development on same machine (localhost:5173), proxy usually handles it, 
    // but we'll use full path just in case for other devices
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '5000') {
      return `http://localhost:5000${url}`;
    }
  }

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
