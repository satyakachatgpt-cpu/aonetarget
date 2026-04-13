import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { getImageUrl, extractYouTubeId, isYouTubeUrl, toYouTubeEmbed } from '../../lib/utils';

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
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
  const [isDragging, setIsDragging] = useState(false);
  const [viewport, setViewport] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 0, 
    height: typeof window !== 'undefined' ? window.innerHeight : 0 
  });
  
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<any>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // HANDLE ORIENTATION & VIEWPORT (Debounced for stability)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const updateViewport = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscapeView = w > h;
      
      setViewport({ width: w, height: h });
      
      if (!isAdmin) {
        setOrientation(isLandscapeView ? 'landscape' : 'portrait');
      }
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, 150);
    };

    // Initial sync
    updateViewport();
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [isAdmin]);

  const isPhysicalLandscape = viewport.width > viewport.height;
  const isMobile = viewport.width < 1024;
  const isLandscape = orientation === 'landscape';
  const needsRotation = !isAdmin && isLandscape && !isPhysicalLandscape;

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
              setDuration(e.target.getDuration());
              setAvailableQualities(e.target.getAvailableQualityLevels() || []);
              e.target.playVideo();
            },
            onStateChange: (e: any) => {
              const s = e.data;
              if (s === 1) { 
                 setIsPlaying(true); 
                 setAvailableQualities(e.target.getAvailableQualityLevels() || []);
                 setDuration(e.target.getDuration());
              }
              else if (s === 2) setIsPlaying(false);
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
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSrc, isHls, isDirect, isYoutube]);

  // PROGRESS TICK
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (isYoutube && playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        } else if ((isHls || isDirect) && videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }, 500);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isYoutube]);

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
    if (isYoutube) {
      if (!playerRef.current) return;
      const currentTime = playerRef.current.getCurrentTime() || 0;
      const totalDuration = playerRef.current.getDuration() || duration;
      const t = Math.max(0, Math.min(totalDuration, currentTime + s));
      playerRef.current.seekTo(t, true);
      setCurrentTime(t); // Instant progress bar update
    } else {
      if (!videoRef.current) return;
      const t = Math.max(0, Math.min(duration, videoRef.current.currentTime + s));
      videoRef.current.currentTime = t;
      setCurrentTime(t);
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
    if (isYoutube && playerRef.current) {
      playerRef.current.setPlaybackRate(speed);
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const mapQuality = (q: string) => {
    const map: any = { hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
    return map[q] || q;
  };

  return (
    <div 
      className="fixed inset-0 z-[1000000] bg-black font-outfit select-none overflow-hidden p-0"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <div 
        className={`absolute bg-black transition-all duration-700 ease-in-out shadow-2xl ${
          isAdmin 
            ? 'inset-0 w-full h-full border-0'
            : needsRotation 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 scale-100 z-50' 
              : `border-0 overflow-hidden ${
                  isPhysicalLandscape 
                    ? 'inset-0 w-full h-full rounded-none' 
                    : isMobile
                      ? 'inset-0 w-full h-full rounded-none'
                      : 'top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] rounded-none sm:rounded-3xl'
                }`
        }`}
        style={{
          transformOrigin: 'center center',
          width: isAdmin ? '100%' : (needsRotation ? `${viewport.height}px` : '100%'),
          height: isAdmin ? '100%' : (needsRotation ? `${viewport.width}px` : '100%'),
          maxHeight: isAdmin ? '100%' : (needsRotation ? `${viewport.width}px` : '100%'),
          maxWidth: isAdmin ? '100%' : (needsRotation ? `${viewport.height}px` : (isPhysicalLandscape ? '100%' : (isMobile ? '100%' : (isLandscape ? '100%' : '450px')))),
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
                  <div 
                    id={`student-player-${youtubeId}`} 
                    className="w-full h-full" 
                  />
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

        {/* Top Control Bar - Strengthened Contrast */}
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/95 via-black/40 to-transparent z-40 p-6 flex items-start justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto shadow-xl"
            >
               <span className="material-symbols-rounded text-2xl">arrow_back</span>
            </button>
            
            <div className="flex items-center gap-3">
               {isLive && (
                 <button 
                   onClick={() => setShowChat(!showChat)}
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
                ) : (
                  <button 
                    onClick={() => setOrientation(isLandscape ? 'portrait' : 'landscape')}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all pointer-events-auto"
                  >
                    <span className="material-symbols-rounded text-xl">{isLandscape ? 'stay_primary_portrait' : 'stay_primary_landscape'}</span>
                  </button>
                )}
            </div>
        </div>

        {/* Bottom Controls - Increased Contrast and Area */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 pt-24 pb-8 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress Bar */}
            <div className="relative w-full h-1 bg-white/20 rounded-full mb-6 cursor-pointer group pointer-events-auto">
               <div className="absolute h-full bg-white transition-all duration-150" style={{ width: `${(currentTime/(duration||1))*100}%` }} />
               <input 
                 type="range" min="0" max={duration||0} step="0.5" value={currentTime} 
                 onMouseDown={() => setIsDragging(true)}
                 onMouseUp={() => setIsDragging(false)}
                 onTouchStart={() => setIsDragging(true)}
                 onTouchEnd={() => setIsDragging(false)}
                 onChange={(e) => { 
                   const t = parseFloat(e.target.value); 
                   if(isYoutube){ playerRef.current?.seekTo(t, true); } 
                   else { if(videoRef.current) videoRef.current.currentTime = t; } 
                   setCurrentTime(t); 
                 }} 
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[60]" 
               />
            </div>

            <div className="flex items-center justify-between pointer-events-auto">
               {/* Left Controls */}
               <div className="flex items-center gap-4 sm:gap-6">
                  <button onClick={togglePlay} className="text-white hover:scale-110 active:scale-90 transition-all flex items-center justify-center">
                     <span className="material-symbols-rounded text-[32px] fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                  </button>
                  
                  <div className="flex items-center gap-3">
                     <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-all active:scale-90 flex items-center">
                        <span className="material-symbols-rounded text-[26px]">replay_10</span>
                     </button>
                     <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-all active:scale-90 flex items-center">
                        <span className="material-symbols-rounded text-[26px]">forward_10</span>
                     </button>
                  </div>

                  <div className="flex items-center gap-3 sm:ml-2">
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
                       className="text-white/70 hover:text-white transition-all"
                     >
                        <span className="material-symbols-rounded text-2xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
                     </button>
                     <div className="text-white/90 text-xs font-medium font-mono whitespace-nowrap hidden sm:block opacity-60">
                        {formatTime(currentTime)} <span className="opacity-40 mx-0.5">/</span> {formatTime(duration)}
                     </div>
                  </div>
               </div>

               {/* Right Controls */}
               <div className="flex items-center gap-4">
                  <div className="relative">
                     <button 
                       onClick={() => { setShowSettingsMenu(!showSettingsMenu); setSettingsView('main'); }} 
                       className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showSettingsMenu ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                     >
                        <span className="material-symbols-rounded text-[22px]">settings</span>
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
                    onClick={() => {
                        const el = document.querySelector('.fixed.inset-0');
                        if (!document.fullscreenElement) {
                           el?.requestFullscreen();
                        } else {
                           document.exitFullscreen();
                        }
                    }}
                    title="Toggle Fullscreen"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all flex"
                  >
                     <span className="material-symbols-rounded text-[24px]">fullscreen</span>
                  </button>
               </div>
            </div>
        </div>

        {/* Live Chat Overlay */}
        {isLive && showChat && (
           <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[350px] bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 z-[60] transition-all duration-500 ease-in-out shadow-2xl flex flex-col pointer-events-auto`}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
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
                                    {msg.role === 'admin' ? 'Instructor' : (msg.senderName || 'Student')}
                                </span>
                            </div>
                            <div className={`p-3 rounded-2xl border ${msg.role === 'admin' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
                                <p className="text-xs text-white/90 leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
              </div>

              <div className="p-4 bg-black/40 border-t border-white/10">
                 <form 
                    onSubmit={(e) => {
                       e.preventDefault();
                       const input = e.currentTarget.querySelector('input');
                       if (input && input.value.trim() && onSendMessage) {
                          onSendMessage(input.value.trim());
                           input.value = '';
                       }
                    }}
                    className="flex gap-2"
                 >
                    <input 
                      type="text" placeholder="Send a message..." 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all font-medium" 
                    />
                    <button type="submit" className="w-11 h-11 bg-white text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"><span className="material-symbols-rounded text-xl font-bold">send</span></button>
                 </form>
              </div>
           </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type=range]::-webkit-slider-thumb { width: 0; height: 0; -webkit-appearance: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );

};

export default StudentVideoPlayer;
