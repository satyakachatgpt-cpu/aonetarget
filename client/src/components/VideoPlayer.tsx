import React, { useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onEnded?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  onEnded,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const isYouTube = src?.includes('youtube.com') || src?.includes('youtu.be');
  const isShorts = src?.includes('shorts/') || src?.includes('/shorts');

  const getVqParam = () => {
    const q = localStorage.getItem('videoQuality') || 'Auto';
    const mapping: Record<string, string> = {
      '1080p': 'hd1080',
      '720p': 'hd720',
      '480p': 'large',
      '360p': 'medium'
    };
    return mapping[q] ? `&vq=${mapping[q]}` : '';
  };

  const vqParam = getVqParam();

  let embedUrl = src;
  if (isYouTube) {
    const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/))([^?&#\s]+)/);
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0&playsinline=1&enablejsapi=1${vqParam}`;
    }
  }

  const aspectRatio = isShorts ? '9/16' : '16/9';
  const maxWidth = isShorts ? '450px' : '100%';

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {isYouTube ? (
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-none"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Video'}
        />
      ) : (
        <video
          src={src}
          poster={poster}
          className="absolute inset-0 w-full h-full object-contain"
          controls
          controlsList="nodownload"
          playsInline
          onEnded={onEnded}
        />
      )}
    </div>
  );
};

export default VideoPlayer;
