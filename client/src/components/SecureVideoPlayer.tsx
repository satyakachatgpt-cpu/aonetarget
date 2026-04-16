import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { extractYouTubeId, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';
import { getAuthHeaders } from '../services/apiClient';

interface SecureVideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onEnded?: () => void;
  className?: string;
  // Watch History tracking props
  videoId?: string;
  courseId?: string;
  courseTitle?: string;
  thumbnail?: string;
  duration?: string;
}

const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  src,
  title,
  poster,
  onEnded,
  className = '',
  videoId,
  courseId,
  courseTitle,
  thumbnail,
  duration,
}) => {
  const student = useAuthStore(s => s.student);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const progressSavedRef = useRef(0); // last saved progress %

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

  // Save watch history progress
  const saveProgress = useCallback((progressPercent: number) => {
    if (!student || !videoId) return;
    const studentId = student.id || (student as any)._id;
    if (!studentId) return;

    fetch(`/api/students/${studentId}/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        videoId,
        title: title || '',
        courseId: courseId || '',
        courseTitle: courseTitle || '',
        thumbnail: thumbnail || '',
        duration: duration || '',
        watchProgress: progressPercent,
      }),
    }).catch(() => { /* silent fail - don't interrupt playback */ });
  }, [student, videoId, title, courseId, courseTitle, thumbnail, duration]);

  // Keep a ref of the absolute latest pct for unmount saving
  const latestPctRef = useRef(0);

  // Unmount save
  useEffect(() => {
    return () => {
      if (latestPctRef.current > 0) {
        saveProgress(latestPctRef.current);
      }
    };
  }, [saveProgress]);

  // Track video progress every 10% increment
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pct = Math.round((video.currentTime / video.duration) * 100);
    latestPctRef.current = pct;
    
    // Save every 10% increment
    if (pct - progressSavedRef.current >= 10) {
      progressSavedRef.current = pct;
      saveProgress(pct);
    }
  }, [saveProgress]);

  // Save on video end (100%)
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    saveProgress(100);
    onEnded?.();
  }, [saveProgress, onEnded]);

  const isYouTube = isYouTubeUrl(src);

  // Save initial entry when video starts playing (for YouTube too)
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (progressSavedRef.current === 0) {
      saveProgress(0);
    }
  }, [saveProgress]);

  if (isYouTube) {
    const videoId_ = extractYouTubeId(src);
    const embedUrl = toYouTubeEmbed(src);

    // Save history entry for YouTube when component mounts (can't track time in iframe)
    useEffect(() => {
      if (student && videoId) {
        saveProgress(0);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        className="w-full aspect-video rounded-lg bg-black cursor-pointer"
        controls
        autoPlay
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        onPlay={handlePlay}
        onPause={() => {
          setIsPlaying(false);
          const video = videoRef.current;
          if (video && video.duration) {
             const pct = Math.round((video.currentTime / video.duration) * 100);
             saveProgress(pct);
          }
        }}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={(e) => console.error("Video playback error", e)}
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
