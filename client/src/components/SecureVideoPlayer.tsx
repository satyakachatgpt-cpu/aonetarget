import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

interface SecureVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onEnded?: () => void;
  className?: string;
}

const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  src,
  title,
  poster,
  onEnded,
  className = ''
}) => {
  const student = useAuthStore(s => s.student);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');

  const updateWatermark = useCallback(() => {
    if (!student) return;
    const phone = student.phone || '';
    const masked = phone.length > 4 ? phone.slice(0, 2) + '***' + phone.slice(-2) : phone;
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setWatermarkText(`${masked} • ${ts}`);
  }, [student]);

  useEffect(() => {
    updateWatermark();
    const interval = setInterval(updateWatermark, 60000);
    return () => clearInterval(interval);
  }, [updateWatermark]);

  useEffect(() => {
    const handleVisChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, []);

  useEffect(() => {
    const preventCtx = (e: Event) => e.preventDefault();
    const el = containerRef.current;
    if (el) {
      el.addEventListener('contextmenu', preventCtx);
      return () => el.removeEventListener('contextmenu', preventCtx);
    }
  }, []);

  const isYouTube = src?.includes('youtube.com') || src?.includes('youtu.be');

  if (isYouTube) {
    let embedUrl = src;
    const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&#]+)/);
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=0&modestbranding=1&rel=0&showinfo=0`;
    }

    return (
      <div ref={containerRef} className={`relative ${className}`} style={{ position: 'relative' }}>
        <iframe
          src={embedUrl}
          className="w-full aspect-video rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Video'}
          style={{ border: 'none' }}
        />
        {watermarkText && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            color: 'rgba(255,255,255,0.15)',
            fontSize: '11px', fontFamily: 'monospace',
            pointerEvents: 'none', zIndex: 10,
            textShadow: '0 0 2px rgba(0,0,0,0.3)'
          }}>
            {watermarkText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full aspect-video rounded-lg bg-black"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); onEnded?.(); }}
        style={{ WebkitMediaControls: 'none' } as any}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: 'calc(100% - 40px)',
        pointerEvents: 'none', zIndex: 5
      }} />
      {watermarkText && (
        <>
          <div style={{
            position: 'absolute', top: 12, right: 12,
            color: 'rgba(255,255,255,0.12)',
            fontSize: '11px', fontFamily: 'monospace',
            pointerEvents: 'none', zIndex: 10,
            textShadow: '0 0 2px rgba(0,0,0,0.3)'
          }}>
            {watermarkText}
          </div>
          <div style={{
            position: 'absolute', bottom: 50, left: 12,
            color: 'rgba(255,255,255,0.08)',
            fontSize: '10px', fontFamily: 'monospace',
            pointerEvents: 'none', zIndex: 10
          }}>
            {watermarkText}
          </div>
        </>
      )}
    </div>
  );
};

export default SecureVideoPlayer;
