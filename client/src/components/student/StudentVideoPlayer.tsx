import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { useDispatch } from 'react-redux';
import { updateProgress, setPlaybackSpeed as setReduxSpeed } from '../../store/slices/playerSlice';
import { getImageUrl, extractYouTubeId, isYouTubeUrl, toYouTubeEmbed, getPdfUrl, parseDurationToSeconds } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { getAuthHeaders, API_BASE_URL } from '../../services/apiClient';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface StudentVideoPlayerProps {
  videoId: string;
  src: string;
  title: string;
  onClose: () => void;
  courseId?: string;
  courseTitle?: string;
  thumbnail?: string;
  duration?: string;
  isLive?: boolean;
  onMarkComplete?: () => void;
  chatMessages?: any[];
  onSendMessage?: (msg: string) => void;
  isAdmin?: boolean;
  provider?: 'youtube' | 'hls' | 'direct';
  streamUrl?: string;
  youtubeUrl?: string;
  onNext?: () => void;
  pdf1?: string;
  pdf2?: string;
  studyMaterial?: string;
  onChatVisibilityChange?: (isVisible: boolean) => void;
}

const StudentVideoPlayer: React.FC<StudentVideoPlayerProps> = ({
  videoId: propVideoId,
  src,
  title,
  onClose,
  courseId,
  courseTitle,
  thumbnail,
  duration: propDuration,
  isLive = false,
  onMarkComplete,
  chatMessages = [],
  onSendMessage,
  isAdmin = false,
  provider: propProvider,
  streamUrl,
  youtubeUrl,
  onNext,
  pdf1,
  pdf2,
  studyMaterial,
  onChatVisibilityChange,
}) => {
  const dispatch = useDispatch();
  const { student } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const initialDurationSecs = typeof propDuration === 'string' ? parseDurationToSeconds(propDuration) : (typeof propDuration === 'number' ? propDuration : 0);
  const [duration, setDuration] = useState(initialDurationSecs || 0);

  useEffect(() => {
    if (propDuration) {
      const parsed = typeof propDuration === 'string' ? parseDurationToSeconds(propDuration) : propDuration;
      if (parsed > 0) {
        setDuration(prev => (prev > 0 ? prev : parsed));
      }
    }
  }, [propDuration]);

  const seekGraceUntilRef = useRef<number>(0);
  const targetSeekTimeRef = useRef<number>(0);
  const [showControls, setShowControls] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'quality' | 'speed'>('main');
  const [showChat, setShowChat] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [viewport, setViewport] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 0, 
    height: typeof window !== 'undefined' ? window.innerHeight : 0 
  });
  
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completedSentRef = useRef<Record<string, boolean>>({}); // Prevent duplicate calls for same video in same session

  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragPercentage, setDragPercentage] = useState<number | null>(null);

  const getEffectiveDuration = useCallback(() => {
    if (duration > 0) return duration;
    if (playerRef.current?.getDuration) {
      const ytDur = playerRef.current.getDuration();
      if (ytDur > 0) {
        setDuration(ytDur);
        return ytDur;
      }
    }
    if (videoRef.current?.duration && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
      return videoRef.current.duration;
    }
    if (propDuration) {
      const p = typeof propDuration === 'string' ? parseDurationToSeconds(propDuration) : propDuration;
      if (p > 0) {
        setDuration(p);
        return p;
      }
    }
    return 0;
  }, [duration, propDuration]);

  const calculateScrubPercentage = (clientX: number, clientY: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    
    // Check if CSS fallback rotation is currently active
    const _isPhysicalLandscape = viewport.width > viewport.height;
    const _isMobile = viewport.width < 1024;
    const _isLandscape = orientation === 'landscape';
    const _needsRotation = !isAdmin && _isMobile && _isLandscape && !_isPhysicalLandscape;

    let percentage = 0;
    if (_needsRotation) {
      let y = clientY - rect.top;
      if (y < 0) y = 0;
      if (y > rect.height) y = rect.height;
      percentage = rect.height > 0 ? y / rect.height : 0;
    } else {
      let x = clientX - rect.left;
      if (x < 0) x = 0;
      if (x > rect.width) x = rect.width;
      percentage = rect.width > 0 ? x / rect.width : 0;
    }
    return Math.max(0, Math.min(1, percentage));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const effDuration = getEffectiveDuration();
    if (!progressBarRef.current || effDuration <= 0) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    
    if (progressBarRef.current.setPointerCapture) {
      try { progressBarRef.current.setPointerCapture(e.pointerId); } catch (err) {}
    }
    
    const pct = calculateScrubPercentage(e.clientX, e.clientY);
    setDragPercentage(pct);
    setCurrentTime(pct * effDuration);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const effDuration = getEffectiveDuration();
    if (!isDraggingRef.current || effDuration <= 0) return;
    const pct = calculateScrubPercentage(e.clientX, e.clientY);
    setDragPercentage(pct);
    setCurrentTime(pct * effDuration);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    
    if (progressBarRef.current?.releasePointerCapture) {
      try { progressBarRef.current.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    
    setIsDragging(false);
    isDraggingRef.current = false;
    
    const pct = calculateScrubPercentage(e.clientX, e.clientY);
    setDragPercentage(null);
    applySeek(pct);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const effDuration = getEffectiveDuration();
    if (!progressBarRef.current || effDuration <= 0 || e.touches.length === 0) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    const touch = e.touches[0];
    const pct = calculateScrubPercentage(touch.clientX, touch.clientY);
    setDragPercentage(pct);
    setCurrentTime(pct * effDuration);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const effDuration = getEffectiveDuration();
    if (!isDraggingRef.current || effDuration <= 0 || e.touches.length === 0) return;
    const touch = e.touches[0];
    const pct = calculateScrubPercentage(touch.clientX, touch.clientY);
    setDragPercentage(pct);
    setCurrentTime(pct * effDuration);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    setIsDragging(false);
    isDraggingRef.current = false;
    const touch = e.changedTouches[0];
    if (touch) {
      const pct = calculateScrubPercentage(touch.clientX, touch.clientY);
      setDragPercentage(null);
      applySeek(pct);
    } else {
      setDragPercentage(null);
    }
  };

  const applySeek = (percentage: number) => {
    const effDuration = getEffectiveDuration();
    if (!effDuration || effDuration <= 0) return;
    const targetTime = percentage * effDuration;

    if (isLive) {
      // If user released within 15 seconds of duration or at >= 97% of the bar -> Jump to live head
      if (percentage >= 0.97 || (effDuration - targetTime) <= 15) {
        handleJumpToLive();
        return;
      }

      // In live stream: available DVR buffer is typically last 4 hours (14400s)
      const minSeek = Math.max(0, effDuration - 14400);
      const clampedTime = Math.max(minSeek, Math.min(effDuration, targetTime));

      seekGraceUntilRef.current = Date.now() + 1500;
      targetSeekTimeRef.current = clampedTime;
      setCurrentTime(clampedTime);

      if (isYoutube && playerRef.current?.seekTo) {
        playerRef.current.seekTo(clampedTime, true);
        if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
      } else if (videoRef.current) {
        videoRef.current.currentTime = clampedTime;
      }
    } else {
      // Recorded video seek
      const clampedTime = Math.max(0, Math.min(effDuration, targetTime));
      seekGraceUntilRef.current = Date.now() + 1500;
      targetSeekTimeRef.current = clampedTime;
      setCurrentTime(clampedTime);

      if (isYoutube && playerRef.current?.seekTo) {
        playerRef.current.seekTo(clampedTime, true);
        if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
      } else if (videoRef.current) {
        videoRef.current.currentTime = clampedTime;
      }
    }
  };
  // HANDLE ORIENTATION & VIEWPORT (Debounced for stability)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const updateViewport = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscapeView = w > h;
      const isMobileView = w < 1024;
      
      setViewport({ width: w, height: h });
      
      if (!isAdmin) {
        setOrientation(isLandscapeView ? 'landscape' : 'portrait');
      }

      // Physical landscape on mobile: auto enter fullscreen + lock orientation (immersive mode)
      if (isMobileView && isLandscapeView && !isAdmin) {
        const el = document.documentElement;
        if (!document.fullscreenElement && el.requestFullscreen) {
          el.requestFullscreen().then(() => {
            if ((screen.orientation as any)?.lock) {
              (screen.orientation as any).lock('landscape').catch(() => {});
            }
            setIsFullscreen(true);
          }).catch(() => {});
        }
      } else if (isMobileView && !isLandscapeView) {
        // Portrait on mobile: exit fullscreen
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
        setIsFullscreen(false);
      }
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, 150);
    };

    // Sync fullscreen state with browser fullscreen change (e.g. user presses back)
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isFs) {
        setIsFullscreen(false);
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
      } else {
        setIsFullscreen(true);
      }
    };

    // Initial sync
    updateViewport();
    
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      clearTimeout(timeoutId);
      const doc: any = document;
      const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (isFs && exitFs) {
        try { exitFs.call(doc); } catch (e) {}
      }
      if ((screen.orientation as any)?.unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch (e) {}
      }
    };
  }, [isAdmin]);

  // LOAD PLAYER SETTINGS
  useEffect(() => {
    const savedSpeed = localStorage.getItem('player_speed');
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      setPlaybackSpeed(speed);
      dispatch(setReduxSpeed(speed));
    }
  }, [dispatch]);

  // PROGRESS LOGIC
  const saveProgress = useCallback((time: number, total: number) => {
    if (!propVideoId || isLive) return;
    
    // Save to local storage
    const progressData = JSON.parse(localStorage.getItem('player_progress') || '{}');
    progressData[propVideoId] = { 
      videoId: propVideoId,
      timestamp: time, 
      duration: total, 
      updated: Date.now(),
      title,
      courseId,
      thumbnail: thumbnail || null
    };
    localStorage.setItem('player_progress', JSON.stringify(progressData));
    
    // Save to Redux
    dispatch(updateProgress({ videoId: propVideoId, timestamp: time, duration: total }));

    // Sync to Backend (Safe mode - zero break)
    const syncToBackend = async () => {
      const studentId = student?.id || (student as any)?._id;
      if (!studentId) return;

      try {
        await fetch(`${API_BASE_URL}/progress/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            userId: studentId,
            courseId: courseId,
            courseTitle: courseTitle,
            videoId: propVideoId,
            progress: time,
            duration: total,
            title,
            thumbnail,
            videoUrl: src,
            youtubeUrl: youtubeUrl
          })
        });
      } catch (err) {
        console.warn('[Sync] Backend progress save failed:', err);
      }
    };
    syncToBackend();
  }, [propVideoId, isLive, dispatch, title, courseId, thumbnail, student]);

  const getSavedProgress = useCallback(() => {
    if (!propVideoId) return 0;
    const progressData = JSON.parse(localStorage.getItem('player_progress') || '{}');
    const saved = progressData[propVideoId];
    if (saved && saved.timestamp > 10 && saved.timestamp < (saved.duration - 10)) {
      return saved.timestamp;
    }
    return 0;
  }, [propVideoId]);

  const isPhysicalLandscape = viewport.width > viewport.height;
  const isMobile = viewport.width < 1024;
  const isLandscape = orientation === 'landscape';
  const needsRotation = !isAdmin && isMobile && isLandscape && !isPhysicalLandscape;

  // Professional fullscreen toggle (like YouTube)
  const toggleFullscreen = () => {
    const doc: any = document;
    const isCurrentlyFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isFullscreen
    );

    if (!isCurrentlyFullscreen) {
      // 1. If on iOS and standard video element can enter native fullscreen (hides status bar on iPhone)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS && videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        try {
          (videoRef.current as any).webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        } catch (e) {
          console.warn('[Player] iOS webkitEnterFullscreen failed, falling back:', e);
        }
      }

      // 2. Enter fullscreen + lock landscape if mobile
      const el: any = document.documentElement;
      const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;

      if (requestFs) {
        requestFs.call(el).then(() => {
          if (isMobile && (screen.orientation as any)?.lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
          setIsFullscreen(true);
          if (isMobile) setOrientation('landscape');
        }).catch(() => {
          setIsFullscreen(true);
          if (isMobile) setOrientation('landscape');
        });
      } else {
        setIsFullscreen(true);
        if (isMobile) setOrientation('landscape');
      }
    } else {
      // Exit fullscreen + unlock orientation
      const exitFs = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;

      if (exitFs && (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)) {
        exitFs.call(doc).then(() => {
          if (isMobile && (screen.orientation as any)?.unlock) {
            (screen.orientation as any).unlock();
          }
          setIsFullscreen(false);
          if (isMobile) setOrientation('portrait');
        }).catch(() => {
          setIsFullscreen(false);
          if (isMobile) setOrientation('portrait');
        });
      } else {
        if (isMobile && (screen.orientation as any)?.unlock) {
          try { (screen.orientation as any).unlock(); } catch (e) {}
        }
        setIsFullscreen(false);
        if (isMobile) setOrientation('portrait');
      }
    }
  };

  // BRANCHING LOGIC: Determine engine
  const getYouTubeIdRobust = (url: string): string | null => {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
  };

  const activeProvider = propProvider || (isYouTubeUrl(src) ? 'youtube' : (src?.includes('.m3u8') ? 'hls' : 'direct'));
  const activeSrc = activeProvider === 'youtube' ? (youtubeUrl || src) : (streamUrl || src);
  const youtubeId = activeProvider === 'youtube' ? getYouTubeIdRobust(activeSrc) : null;
  const isYoutube = activeProvider === 'youtube' && !!youtubeId;
  const isHls = activeProvider === 'hls';
  const isDirect = activeProvider === 'direct';
  const [isYoutubeUnplayable, setIsYoutubeUnplayable] = useState(false);

  // INITIALIZE YT SDK
  useEffect(() => {
    if (!youtubeId) return;

    const init = () => {
      // Prevent double init
      if (playerRef.current || !youtubeId) return;

      const targetId = `student-player-${youtubeId}`;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      try {
        new window.YT.Player(targetId, {
          height: '100%',
          width: '100%',
          videoId: youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            fs: 0,
            disablekb: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (e: any) => {
              playerRef.current = e.target;
              setIsReady(true);
              const total = e.target.getDuration();
              setDuration(total);
              setAvailableQualities(e.target.getAvailableQualityLevels() || []);
              
              // RESUME PLAYBACK (Only for non-live videos)
              if (!isLive) {
                const resumeTime = getSavedProgress();
                if (resumeTime > 0) {
                  e.target.seekTo(resumeTime, true);
                }
              } else {
                // Ensure live stream starts at the live edge
                try {
                  const liveDur = e.target.getDuration();
                  if (liveDur > 0) {
                    setDuration(liveDur);
                    setCurrentTime(liveDur);
                    e.target.seekTo(liveDur + 3600, true);
                  } else {
                    e.target.seekTo(Number.MAX_SAFE_INTEGER, true);
                  }
                } catch (err) {}
              }
              
              // Apply saved speed
              const savedSpeed = localStorage.getItem('player_speed');
              if (savedSpeed) e.target.setPlaybackRate(parseFloat(savedSpeed));

              e.target.playVideo();
            },
            onStateChange: (e: any) => {
              const s = e.data;
              if (s === 1) { 
                 setIsPlaying(true); 
                 setAvailableQualities(e.target.getAvailableQualityLevels() || []);
                 setDuration(e.target.getDuration());
              }
              else if (s === 2) {
                setIsPlaying(false);
                saveProgress(e.target.getCurrentTime(), e.target.getDuration());
              }
              else if (s === 0) { // ENDED
                saveProgress(e.target.getDuration(), e.target.getDuration());
                if (autoNextEnabled && onNext) onNext();
              }
            },
            onError: (e: any) => {
              console.error("[Player] YouTube Loading Error:", e.data);
              // Aggressively catch ALL errors (restricted, deleted, invalid id, etc.)
              // to prevent native YouTube error UI and redirects.
              setIsYoutubeUnplayable(true);
            }
          }
        });
      } catch (err) {
        console.error("[Player] Init Exception:", err);
      }
    };

    if (!window.YT || !window.YT.Player) {
      if (!document.getElementById('yt-sdk-scr')) {
        const t = document.createElement('script'); t.id = 'yt-sdk-scr';
        t.src = "https://www.youtube.com/iframe_api";
        const f = document.getElementsByTagName('script')[0];
        f.parentNode?.insertBefore(t, f);
      }
      window.onYouTubeIframeAPIReady = () => {
        init();
      };
    } else { 
      init(); 
    }

    return () => {
      if (playerRef.current) { 
        playerRef.current.destroy(); 
        playerRef.current = null; 
      }
    };
  }, [youtubeId, isYoutube]);

  // INITIALIZE HLS/DIRECT ENGINE
  useEffect(() => {
    if (isYoutube || !videoRef.current || !activeSrc) return;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        });
        hlsRef.current = hls;
        hls.loadSource(getImageUrl(activeSrc));
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsReady(true);
          // Resume logic for HLS
          const resumeTime = getSavedProgress();
          if (resumeTime > 0 && videoRef.current) {
            videoRef.current.currentTime = resumeTime;
          }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = getImageUrl(activeSrc);
        setIsReady(true);
      }
    } else if (isDirect) {
      videoRef.current.src = getImageUrl(activeSrc);
      setIsReady(true);
      // Resume logic for Direct
      const resumeTime = getSavedProgress();
      if (resumeTime > 0 && videoRef.current) {
        videoRef.current.currentTime = resumeTime;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSrc, isHls, isDirect, isYoutube]);

  // PROGRESS TICK & AUTO-SAVE
  const lastSavedTimeRef = useRef<number>(-1);

  useEffect(() => {
    let saveTimeout: any;
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        let time = 0;
        let total = duration;
        if (isYoutube && playerRef.current?.getCurrentTime) {
          time = playerRef.current.getCurrentTime();
          total = playerRef.current.getDuration() || duration;
          if (total > 0 && Math.abs(total - duration) > 1) {
            setDuration(total);
          }
        } else if ((isHls || isDirect) && videoRef.current) {
          time = videoRef.current.currentTime;
          total = videoRef.current.duration || duration;
          if (total > 0 && Math.abs(total - duration) > 1) {
            setDuration(total);
          }
        }
        if (!isDraggingRef.current) {
          const now = Date.now();
          if (now < seekGraceUntilRef.current) {
            if (Math.abs(time - targetSeekTimeRef.current) <= 2) {
              seekGraceUntilRef.current = 0;
              setCurrentTime(time);
            }
          } else {
            setCurrentTime(time);
          }
        }
        
        // Auto-save every 30 seconds (throttled to once per second)
        const currentSecond = Math.floor(time);
        if (currentSecond > 0 && currentSecond % 30 === 0 && lastSavedTimeRef.current !== currentSecond) {
          lastSavedTimeRef.current = currentSecond;
          saveProgress(time, total);
        }

        // AUTOMATIC COMPLETION TRACKING (STRICT 90% OR LAST 10 SECONDS)
        if (total > 0 && propVideoId && !isLive && onMarkComplete) {
          const watchedPercent = (time / total) * 100;
          const remainingSeconds = total - time;
          
          if ((watchedPercent >= 90 || remainingSeconds <= 10) && !completedSentRef.current[propVideoId]) {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Player] Auto-completing video ${propVideoId}: ${watchedPercent.toFixed(1)}% watched, ${remainingSeconds.toFixed(1)}s remaining`);
            }
            completedSentRef.current[propVideoId] = true;
            onMarkComplete();
          }
        }
      }, 500);
    } else { 
      clearInterval(intervalRef.current);
      // Save on pause
      if (currentTime > 0) saveProgress(currentTime, duration);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isYoutube, saveProgress, currentTime, duration, propVideoId, isLive, onMarkComplete]);

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    // Desktop: 3s, Mobile: 4s
    const timeout = isMobile ? 4000 : 3000;
    
    // Only set timeout if we are playing AND not in a state that requires controls to stay (dragging/settings)
    if (isPlaying && !isDragging && !showSettingsMenu) {
      controlsTimeoutRef.current = setTimeout(() => { 
        setShowControls(false); 
      }, timeout);
    }
  }, [isPlaying, isDragging, showSettingsMenu]);

  useEffect(() => {
    handleUserActivity();
  }, [isPlaying, isDragging, showSettingsMenu, handleUserActivity]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState); // Instant UI feedback

    if (isYoutube) {
      if (!playerRef.current) return;
      if (nextState) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    } else {
      if (!videoRef.current) return;
      if (nextState) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const skip = (s: number) => {
    const totalDuration = (isYoutube && playerRef.current?.getDuration ? playerRef.current.getDuration() : 0) || duration;
    const cur = (isYoutube && playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() : 0) || currentTime;

    if (isLive) {
      if (s > 0 && cur + s >= totalDuration - 10) {
        handleJumpToLive();
        return;
      }
      const minSeek = Math.max(0, totalDuration - 14400);
      const t = Math.max(minSeek, Math.min(totalDuration, cur + s));
      if (isYoutube && playerRef.current?.seekTo) {
        playerRef.current.seekTo(t, true);
        if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
      } else if (videoRef.current) {
        videoRef.current.currentTime = t;
      }
      setCurrentTime(t);
    } else {
      const t = Math.max(0, Math.min(totalDuration, cur + s));
      if (isYoutube && playerRef.current?.seekTo) {
        playerRef.current.seekTo(t, true);
      } else if (videoRef.current) {
        videoRef.current.currentTime = t;
      }
      setCurrentTime(t);
    }
  };

  const handleJumpToLive = () => {
    if (isYoutube && playerRef.current) {
      try {
        const liveDuration = (typeof playerRef.current.getDuration === 'function' ? playerRef.current.getDuration() : 0) || duration || 0;
        const seekTarget = liveDuration > 0 ? (liveDuration + 3600) : Number.MAX_SAFE_INTEGER;
        
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(seekTarget, true);
        }
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
        if (liveDuration > 0) {
          setCurrentTime(liveDuration);
          setDuration(liveDuration);
        }
      } catch (err) {
        console.warn('Jump to live error:', err);
      }
    } else if (videoRef.current) {
      let targetTime = duration;
      if (hlsRef.current && (hlsRef.current as any).liveSyncPosition) {
        targetTime = (hlsRef.current as any).liveSyncPosition;
      } else if (videoRef.current.seekable && videoRef.current.seekable.length > 0) {
        targetTime = videoRef.current.seekable.end(videoRef.current.seekable.length - 1);
      } else if (videoRef.current.duration && isFinite(videoRef.current.duration)) {
        targetTime = videoRef.current.duration;
      }
      if (targetTime > 0) {
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    }
  };

  const handleQualityChange = (q: string) => {
    if (!playerRef.current) return;
    setCurrentQuality(q);
    playerRef.current.setPlaybackQualityRange(q, q);
    playerRef.current.setPlaybackQuality(q);
    setShowQualityMenu(false);
    const time = playerRef.current.getCurrentTime();
    playerRef.current.loadVideoById({ videoId: youtubeId, startSeconds: time, suggestedQuality: q });
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('player_speed', speed.toString());
    dispatch(setReduxSpeed(speed));
    if (isYoutube && playerRef.current) {
      playerRef.current.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  // KEYBOARD CONTROLS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const activeTag = activeEl?.tagName || '';
      const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeEl?.isContentEditable;

      // SECURITY: Block dev-tools / save / print shortcuts on media pages
      if (!isTyping) {
        const k = e.key.toLowerCase();
        if (
          e.key === 'F12' ||
          ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['s', 'u', 'p'].includes(k)) ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k))
        ) {
          e.preventDefault();
          return;
        }
      }

      // Don't trigger if user is typing in chat
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'KeyM':
          e.preventDefault();
          const nextMute = !isMuted;
          setIsMuted(nextMute);
          if (isYoutube && playerRef.current) {
            if (nextMute) playerRef.current.mute();
            else playerRef.current.unMute();
          } else if (videoRef.current) {
            videoRef.current.muted = nextMute;
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, togglePlay]);

  // HARDWARE / PHONE BACK BUTTON HANDLER
  useEffect(() => {
    const handleVideoBack = (e: Event) => {
      e.preventDefault();

      // 1. If settings menu open, close it
      if (showSettingsMenu || showQualityMenu) {
        setShowSettingsMenu(false);
        setShowQualityMenu(false);
        return;
      }

      // 2. If live chat open, close it
      if (showChat) {
        setShowChat(false);
        if (onChatVisibilityChange) onChatVisibilityChange(false);
        return;
      }

      // 3. If fullscreen active, exit fullscreen
      if (isFullscreen || document.fullscreenElement) {
        toggleFullscreen();
        return;
      }

      // 4. Otherwise, exit video player
      onClose();
    };

    window.addEventListener('app:video-back', handleVideoBack);
    return () => window.removeEventListener('app:video-back', handleVideoBack);
  }, [showSettingsMenu, showQualityMenu, showChat, isFullscreen, onClose, toggleFullscreen, onChatVisibilityChange]);

  const formatTime = (s: number, forceHours = false) => {
    if (!s || isNaN(s) || s < 0) return forceHours ? '00:00:00' : '0:00';
    const totalSecs = Math.floor(s);
    const hrs = Math.floor(totalSecs / 3600);
    const min = Math.floor((totalSecs % 3600) / 60);
    const sec = totalSecs % 60;
    if (hrs > 0 || forceHours) {
      return `${hrs.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const openPdf = (url: string, pdfTitle: string) => {
    const returnPath = window.location.hash.replace(/^#/, '') || window.location.pathname;
    window.location.hash = `#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent(pdfTitle)}&returnTo=${encodeURIComponent(returnPath)}`;
  };

  const mapQuality = (q: string) => {
    const map: any = { hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
    return map[q] || q;
  };

  return (
    <div 
      data-student-video-player="true"
      className="fixed inset-0 z-[1000000] bg-black font-outfit select-none overflow-hidden p-0"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div 
        className={`absolute bg-black transition-all duration-500 ease-in-out shadow-2xl ${
          needsRotation 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 scale-100 z-50' 
            : 'inset-0 w-full h-full border-0 overflow-hidden'
        }`}
        style={{ 
          transformOrigin: 'center center',
          width: needsRotation ? `${viewport.height}px` : '100%',
          height: needsRotation ? `${viewport.width}px` : '100%',
          maxWidth: needsRotation ? `${viewport.height}px` : '100%',
          maxHeight: needsRotation ? `${viewport.width}px` : '100%'
        }}
      >
        <div className="absolute inset-0 z-10 bg-black w-full h-full">
           {/* Player Engine Surface - Native interaction restored */}
           <div className="absolute inset-0 z-10 w-full h-full">
            {isYoutube ? (
              <div className="relative w-full h-full">
                {isYoutubeUnplayable ? (
                  <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950 p-6 text-center select-none animate-in fade-in duration-500">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                      <span className="material-symbols-rounded text-4xl text-white/30">video_settings</span>
                    </div>
                    <h3 className="text-white font-bold text-xl mb-3">Playback Restricted</h3>
                    <p className="text-white/50 text-sm max-w-[300px] mb-8 leading-relaxed">
                      For security and privacy, this video can only be played directly on the YouTube platform.
                    </p>
                    <a 
                      href={`https://www.youtube.com/watch?v=${youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-[#FF0000] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                    >
                      <span className="material-symbols-rounded text-xl">open_in_new</span>
                      Watch on YouTube
                    </a>
                  </div>
                ) : (
                  <>
                    <div 
                      id={`student-player-${youtubeId}`} 
                      className="w-full h-full pointer-events-none" 
                    />
                    {/* INVISIBLE OVERLAY TO BLOCK YOUTUBE NATIVE UI INTERACTION */}
                    <div 
                      className="absolute inset-0 z-[50] cursor-pointer" 
                      onClick={togglePlay}
                    />
                  </>
                )}
              </div>
            ) : (
              <video 
                ref={videoRef}
                playsInline
                className="w-full h-full object-contain pointer-events-auto"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onClick={togglePlay}
              />
            )}
           </div>
        </div>

        {/* Watermark Overlay - DRM Protection */}
        <div
          className="absolute bottom-20 right-3 z-30 pointer-events-none select-none"
          aria-hidden="true"
        >
          <span
            className="text-white font-bold tracking-widest whitespace-nowrap"
            style={{ opacity: 0.12, userSelect: 'none', fontSize: '11px', fontFamily: 'monospace' }}
          >
            {student?.phone
              ? `AONE-${String(student.phone).slice(-4)}`
              : (student?.email?.split('@')[0] || student?.name || 'AONE TARGET')}
          </span>
        </div>

        {/* Top Control Bar */}
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/95 via-black/40 to-transparent z-40 p-6 flex items-start justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          style={{ paddingTop: `max(1.5rem, env(safe-area-inset-top))` }}>
            <button 
              onClick={onClose} 
              data-video-back-btn="true"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto shadow-xl"
            >
               <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>
            
            <div className="flex items-center gap-3">
               {isLive && (
                 <button 
                   onClick={() => {
                     const next = !showChat;
                     setShowChat(next);
                     if (onChatVisibilityChange) onChatVisibilityChange(next);
                   }}
                   className={`h-9 px-4 rounded-full border transition-all flex items-center gap-2 pointer-events-auto ${showChat ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30'}`}
                 >
                    <span className="material-symbols-rounded text-lg">chat</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Chat</span>
                 </button>
               )}
                {isAdmin ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                     <span className="material-symbols-rounded text-sm text-red-500 animate-pulse">visibility</span>
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Admin Preview</span>
                  </div>
                ) : null}
                {/* PDF buttons removed from inside player top bar per user request - available outside on course screen */}
            </div>
        </div>

        {/* Bottom Controls - Increased Contrast and Area */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 sm:p-6 pb-6 sm:pb-8 pt-16 sm:pt-24 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress Bar (Custom Pointer-based Scrubber) */}
            <div 
              ref={progressBarRef}
              className="relative w-full h-10 sm:h-8 flex items-center mb-4 sm:mb-6 cursor-pointer select-none group pointer-events-auto touch-none py-3"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
            {(() => {
              const isAtLiveEdge = isLive && (!duration || (duration - currentTime) <= 10);
              const liveProgress = isAtLiveEdge ? 100 : (duration > 0 ? (currentTime / duration) * 100 : 100);
              const currentProgressPercent = isLive ? liveProgress : (duration > 0 ? (currentTime / duration) * 100 : 0);
              const scrubberPercent = Math.min(100, Math.max(0, dragPercentage !== null ? dragPercentage * 100 : currentProgressPercent));

              return (
                <>
                   {/* Background Track */}
                   <div className="absolute left-0 right-0 h-1 sm:h-1 bg-white/25 rounded-full transition-all group-hover:h-1.5" />
                   {/* Filled Track */}
                   <div 
                     className={`absolute left-0 h-1 sm:h-1 rounded-full ${isDragging ? '' : 'transition-all duration-75'} ${isLive ? 'bg-red-600' : 'bg-white'}`} 
                     style={{ width: `${scrubberPercent}%` }} 
                   />
                   {/* Thumb */}
                   <div 
                     className={`absolute h-4.5 w-4.5 sm:h-3.5 sm:w-3.5 rounded-full transform -translate-x-1/2 ${isDragging ? 'scale-125' : 'transition-all duration-75'} ${isLive ? 'bg-red-600 shadow-[0_0_12px_rgba(239,68,68,1)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'}`} 
                     style={{ left: `${scrubberPercent}%` }} 
                   />
                </>
              );
            })()}
            </div>

            <div className="flex items-center justify-between pointer-events-auto gap-2">
               {/* Left Controls */}
               <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 overflow-hidden">
                  <button onClick={togglePlay} className="text-white hover:scale-110 active:scale-90 transition-all flex items-center justify-center shrink-0">
                     <span className="material-symbols-rounded text-[28px] sm:text-[32px] fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  
                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                     <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-all active:scale-90 flex items-center">
                        <span className="material-symbols-rounded text-[22px] sm:text-[26px]">replay_10</span>
                     </button>
                     <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-all active:scale-90 flex items-center">
                        <span className="material-symbols-rounded text-[22px] sm:text-[26px]">forward_10</span>
                     </button>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                     <button 
                       onClick={() => { 
                         if(isYoutube && playerRef.current){ 
                           if(isMuted){ playerRef.current.unMute(); setIsMuted(false); } 
                           else { playerRef.current.mute(); setIsMuted(true); } 
                         } else if(videoRef.current){ 
                           videoRef.current.muted = !videoRef.current.muted; 
                           setIsMuted(videoRef.current.muted); 
                         } 
                       }} 
                       className="text-white/70 hover:text-white transition-all hidden xs:flex items-center"
                     >
                        <span className="material-symbols-rounded text-xl sm:text-2xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
                     </button>
                     {isLive ? (() => {
                        const isAtLiveEdge = !duration || (duration - currentTime) <= 10;
                        const forceHrs = duration >= 3600 || currentTime >= 3600;
                        return (
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                             <button
                               onClick={handleJumpToLive}
                               onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleJumpToLive(); }}
                               className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95 ${
                                 isAtLiveEdge 
                                   ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30' 
                                   : 'bg-zinc-800 hover:bg-red-600 text-gray-200 hover:text-white border border-white/20 hover:border-red-500'
                               }`}
                               title={isAtLiveEdge ? "Currently watching LIVE" : "Behind live - Click to return to LIVE point"}
                             >
                                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isAtLiveEdge ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                                {isAtLiveEdge ? 'LIVE' : 'GO LIVE'}
                             </button>
                             <span className="text-white text-[10px] sm:text-xs font-bold font-mono whitespace-nowrap flex items-center gap-1">
                                <span>{formatTime(currentTime, forceHrs)}</span>
                                {!isAtLiveEdge && duration > currentTime && (
                                  <span className="text-red-400 text-[9px] sm:text-[10px] font-medium font-mono">
                                    (-{formatTime(Math.max(0, duration - currentTime), (duration - currentTime) >= 3600)})
                                  </span>
                                )}
                             </span>
                          </div>
                        );
                     })() : (
                        <div className="text-white/90 text-[10px] sm:text-xs font-medium font-mono whitespace-nowrap opacity-60">
                           {formatTime(currentTime, duration >= 3600)} <span className="opacity-40 mx-0.5">/</span> {formatTime(duration, duration >= 3600)}
                        </div>
                     )}
                  </div>
               </div>

               {/* Right Controls */}
               <div className="flex items-center gap-1.5 sm:gap-4 shrink-0 ml-2">
                  <div className="relative">
                     <button 
                       onClick={() => { setShowSettingsMenu(!showSettingsMenu); setSettingsView('main'); }} 
                       className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${showSettingsMenu ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                     >
                        <span className="material-symbols-rounded text-[20px] sm:text-[22px]">settings</span>
                     </button>
                     
                     {showSettingsMenu && (
                        <div className="absolute bottom-full right-0 mb-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden min-w-[200px] shadow-2xl animate-in fade-in slide-in-from-bottom-2 z-[100]">
                           {settingsView === 'main' ? (
                              <div className="flex flex-col py-2">
                                 {isYoutube ? (
                                   <div className="flex items-center justify-between px-4 py-3 text-sm text-white/40 cursor-default">
                                      <div className="flex items-center gap-3">
                                         <span className="material-symbols-rounded text-xl opacity-60">hd</span>
                                         <span>Quality</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-40 text-[10px] font-bold uppercase tracking-wider">
                                         Auto
                                      </div>
                                   </div>
                                 ) : (
                                   <button onClick={() => setSettingsView('quality')} className="flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-all">
                                      <div className="flex items-center gap-3">
                                         <span className="material-symbols-rounded text-xl opacity-60">hd</span>
                                         <span>Quality</span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-40 text-xs">
                                         Auto
                                         <span className="material-symbols-rounded text-sm">chevron_right</span>
                                      </div>
                                   </button>
                                 )}
                                 <button onClick={() => setSettingsView('speed')} className="flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-3">
                                       <span className="material-symbols-rounded text-xl opacity-60">speed</span>
                                       <span>Speed</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-40 text-xs">
                                       {playbackSpeed}x
                                       <span className="material-symbols-rounded text-sm">chevron_right</span>
                                    </div>
                                 </button>
                              </div>
                           ) : settingsView === 'quality' ? (
                              <div className="flex flex-col">
                                 <button onClick={() => setSettingsView('main')} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-all">
                                    <span className="material-symbols-rounded text-lg">arrow_back</span>
                                    Quality
                                 </button>
                                  <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                                     {isYoutube ? (
                                       ['auto', ...availableQualities].map(q => (
                                          <button key={q} onClick={() => handleQualityChange(q)} className={`w-full text-left px-5 py-3 text-sm transition-all flex items-center justify-between ${currentQuality === q ? 'text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                             {mapQuality(q)}
                                             {currentQuality === q && <span className="material-symbols-rounded text-sm">check</span>}
                                          </button>
                                       ))
                                     ) : (
                                       <div className="px-5 py-4 text-xs text-white/40 text-center italic">Quality auto-managed for MP4</div>
                                     )}
                                  </div>
                              </div>
                           ) : (
                              <div className="flex flex-col">
                                 <button onClick={() => setSettingsView('main')} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 text-xs font-bold text-white/40 uppercase tracking-widest hover:text-white transition-all">
                                    <span className="material-symbols-rounded text-lg">arrow_back</span>
                                    Playback Speed
                                 </button>
                                 <div className="py-1">
                                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                       <button key={speed} onClick={() => handleSpeedChange(speed)} className={`w-full text-left px-5 py-3 text-sm transition-all flex items-center justify-between ${playbackSpeed === speed ? 'text-white font-bold' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                          {speed === 1 ? 'Normal' : `${speed}x`}
                                          {playbackSpeed === speed && <span className="material-symbols-rounded text-sm">check</span>}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  <button 
                    onClick={toggleFullscreen}
                    title="Toggle Fullscreen"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  >
                     <span className="material-symbols-rounded text-[22px] sm:text-[24px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                  </button>
               </div>
            </div>
        </div>

        {/* Live Chat Overlay */}
        {isLive && showChat && (
           <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[350px] bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 z-[60] transition-all duration-500 ease-in-out shadow-2xl flex flex-col pointer-events-auto`}>
              <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]" />
                    <span className="text-xs font-black text-white tracking-[0.2em] uppercase">Live Chat</span>
                  </div>
                 <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"><span className="material-symbols-rounded text-xl">close</span></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-8 gap-4">
                        <span className="material-symbols-rounded text-4xl">chat</span>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Chat is active. Be the first to say hello!</p>
                    </div>
                ) : (
                    chatMessages.map((msg, i) => (
                        <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'admin' ? 'animate-in zoom-in-95' : 'animate-in fade-in'}`}>
                            <div className="flex items-center justify-between px-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${msg.role === 'admin' ? 'text-blue-500' : 'text-white/40'}`}>
                                    {msg.senderName || (msg.role === 'admin' ? 'Instructor' : 'Student')}
                                </span>
                            </div>
                            <div className={`p-3 rounded-2xl border ${msg.role === 'admin' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                                <p className="text-xs text-white/90 leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={liveChatInput}
                      onChange={(e) => setLiveChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && liveChatInput.trim() && onSendMessage) {
                          onSendMessage(liveChatInput.trim());
                          setLiveChatInput('');
                          e.preventDefault();
                        }
                      }}
                      placeholder="Ask your doubt..."
                      className="w-full bg-white/10 text-white text-[17px] pl-5 pr-14 py-3 rounded-full outline-none placeholder-white/40 border border-white/10 focus:border-white/30 transition-all"
                      style={{ touchAction: 'manipulation' }}
                    />
                    <button 
                      onClick={() => {
                        if (liveChatInput.trim() && onSendMessage) {
                          onSendMessage(liveChatInput.trim());
                          setLiveChatInput('');
                        }
                      }}
                      className="absolute right-1.5 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      <span className="material-symbols-rounded text-xl font-bold">send</span>
                    </button>
                  </div>
              </div>
           </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type=range]::-webkit-slider-thumb { width: 0; height: 0; -webkit-appearance: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        @media screen and (max-width: 768px) {
          input:focus, textarea:focus { font-size: 17px !important; }
        }
      `}} />
    </div>
  );

};

export default StudentVideoPlayer;
