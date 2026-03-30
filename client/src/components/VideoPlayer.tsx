import React, { useRef, useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onEnded?: () => void;
  onClose?: () => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  onEnded,
  onClose,
  className = ''
}) => {
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isReady, setIsReady] = useState(false);
  
  // QUALITY CONTROL STATE
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [manualQualityIntent, setManualQualityIntent] = useState<string | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // SINGLE SOURCE OF TRUTH: The displayed quality is ALWAYS the user intent if set.
  const displayQuality = manualQualityIntent || currentQuality;

  const videoId = src ? (src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/))([^?&#\s]+)/)?.[1] || null) : null;

  // INITIALIZE SDK
  useEffect(() => {
    if (!videoId) return;

    let player: any = null;

    const init = () => {
      if (playerRef.current) return;
      player = new window.YT.Player(`lockdown-p-${videoId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          disablekb: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e: any) => {
            setIsReady(true);
            setDuration(e.target.getDuration());
            setAvailableQualities(e.target.getAvailableQualityLevels() || []);
            // LET GOOGLE AUTO-OPTIMIZE STARTUP FOR ZERO BUFFERING
            e.target.setPlaybackQuality('auto');
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            const s = e.data;
            if (s === 1) { 
              setIsPlaying(true); 
              setIsReady(true);
              // RE-FETCH QUALITIES ONCE PLAYING
              const levels = e.target.getAvailableQualityLevels() || [];
              if (levels.length > 0) setAvailableQualities(levels);
              
              // RE-APPLY MANUAL LOCK IF IT WAS LOST DURING HANDSHAKE
              if (manualQualityIntent && manualQualityIntent !== 'auto' && e.target.getPlaybackQuality() !== manualQualityIntent) {
                e.target.setPlaybackQualityRange(manualQualityIntent, manualQualityIntent);
              }
            } 
            else if (s === 2) { setIsPlaying(false); }
            else if (s === 0) { setIsPlaying(false); onEnded?.(); }
          },
          onPlaybackQualityChange: (e: any) => {
             const newQ = e.data;
             // DEFEND MANUAL CHOICE: If YouTube tries to shift back, we re-verify our intent
             if (manualQualityIntent && manualQualityIntent !== 'auto' && newQ !== manualQualityIntent) {
                playerRef.current?.setPlaybackQualityRange(manualQualityIntent, manualQualityIntent);
             }
             setCurrentQuality(newQ);
          }
        }
      });
      playerRef.current = player;
    };

    if (!window.YT || !window.YT.Player) {
      if (!document.getElementById('yt-sdk-scr')) {
        const t = document.createElement('script');
        t.id = 'yt-sdk-scr';
        t.src = "https://www.youtube.com/iframe_api";
        const f = document.getElementsByTagName('script')[0];
        f.parentNode?.insertBefore(t, f);
      }
      const originalReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalReady) originalReady();
        init();
      };
    } else {
      init();
    }

    return () => {
      // Cleanup only on unmount
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // Initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onEnded]); 

  // Switching logic without destroy
  useEffect(() => {
    if (playerRef.current && videoId && isReady) {
      console.log('Switching video to:', videoId);
      playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
      setIsPlaying(true);
      setCurrentTime(0);
    }
  }, [videoId, isReady]);

  // RAZOR-SHARP TICK SYNC
  useEffect(() => {
    if (isPlaying && playerRef.current?.getCurrentTime) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current) {
          const t = playerRef.current.getCurrentTime();
          setCurrentTime(t);
        }
      }, 400);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      setShowQualityMenu(false);
    }
  };

  const skip = (s: number) => {
    if (!playerRef.current) return;
    const t = Math.max(0, Math.min(duration, playerRef.current.getCurrentTime() + s));
    playerRef.current.seekTo(t, true);
    setCurrentTime(t);
  };

  const handleQualityChange = (level: string) => {
    if (!playerRef.current || !videoId) return;
    
    // INSTANT QUALITY LOCK (The UI will update to this immediately)
    setManualQualityIntent(level);
    setCurrentQuality(level); 

    const currentTime = playerRef.current.getCurrentTime();
    
    // TRUE FORCE: Use loadVideoById + forced range lock.
    playerRef.current.loadVideoById({
      videoId: videoId,
      startSeconds: currentTime,
      suggestedQuality: level
    });
    
    if (level !== 'auto') {
      playerRef.current.setPlaybackQualityRange(level, level);
    }

    setShowQualityMenu(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r < 10 ? '0' : ''}${r}`;
  };

  const mapQualityLabel = (q: string) => {
    switch (q) {
      case 'highres': return '4K / Original';
      case 'hd1080': return '1080p HD';
      case 'hd720': return '720p HD';
      case 'large': return '480p';
      case 'medium': return '360p';
      case 'small': return '240p';
      case 'tiny': return '144p';
      default: return q;
    }
  };

  return (
    <div 
      className={`relative bg-black !bg-[#000000] w-full h-full overflow-hidden select-none group focus:outline-none ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && !showQualityMenu && setShowControls(false)}
    >
      {/* THE IFRAME: Perfect Scaling */}
      <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
         <div id={`lockdown-p-${videoId}`} className="w-full h-full" />
      </div>

      {/* INDUSTRIAL HARD MASK: TOP */}
      <div className="absolute top-0 left-0 right-0 h-[10%] bg-black z-30 pointer-events-none border-b border-white/5 flex items-center px-10">
         <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]" />
            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.5em] italic">SECURE STREAM ISOLATION</p>
         </div>
      </div>

      {/* INDUSTRIAL HARD MASK: BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-black z-30 pointer-events-none border-t border-white/5" />

      {/* MASTER INTERACTION SHIELD: Optimized to not block controls */}
      <div 
        className="absolute inset-0 z-40 cursor-pointer" 
        onClick={(e) => { 
          // Only trigger if we're not clicking an overlay button
          if ((e.target as HTMLElement).classList.contains('cursor-pointer')) {
            togglePlay(); 
            setShowQualityMenu(false); 
          }
        }} 
      />

      {/* INTERNAL CONTROLS ONLY - NO INTERNAL EXIT BUTTON TO AVOID OVERLAP */}

      {/* INDUSTRIAL CONTROLS */}
      <div className={`absolute bottom-0 left-0 right-0 pt-32 pb-8 px-12 bg-gradient-to-t from-black via-black/40 to-transparent z-[50] transition-all duration-200 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
         
         {/* SCRUBBER */}
         <div className="relative w-full h-1 group/scrub mb-10 cursor-pointer bg-white/10 rounded-full hover:h-1.5 transition-all">
            <div 
              className="absolute h-full bg-white transition-all duration-200 shadow-[0_0_15px_white]" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
            />
            <input 
              type="range" min="0" max={duration || 0} step="0.1" 
              value={currentTime} 
              onChange={(e) => {
                const t = parseFloat(e.target.value);
                playerRef.current?.seekTo(t, true);
                setCurrentTime(t);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[60]"
            />
         </div>

         <div className="flex items-center justify-between">
            <div className="flex items-center gap-8 lg:gap-14">
               {/* SKIP BUTTONS */}
               <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/40 hover:text-white transition-all active:scale-90 p-1">
                  <span className="material-symbols-rounded text-[32px]">replay_10</span>
               </button>

               <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-90 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
               >
                  <span className="material-symbols-rounded text-[42px] font-black">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
               </button>

               <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/40 hover:text-white transition-all active:scale-90 p-1">
                  <span className="material-symbols-rounded text-[32px]">forward_10</span>
               </button>

               {/* TIMER */}
               <div className="flex items-center gap-4 text-white font-black text-sm tracking-tighter font-mono ml-4">
                  <span className="min-w-[45px] text-right">{formatTime(currentTime)}</span>
                  <span className="opacity-20 text-lg">/</span>
                  <span className="opacity-40">{formatTime(duration)}</span>
               </div>
            </div>

            <div className="flex items-center gap-8 lg:gap-12">
               {/* QUALITY SELECTOR button */}
               <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showQualityMenu ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:border-white/40'}`}
                  >
                     <span className="material-symbols-rounded text-[20px]">settings</span>
                     <span className="text-[10px] font-black uppercase tracking-widest">{mapQualityLabel(displayQuality).replace(' HD', '').replace('p', '')}</span>
                  </button>
                  
                  {/* Quality Popover */}
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-6 w-48 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[70] animate-in slide-in-from-bottom-2 duration-300">
                       <div className="px-4 py-3 bg-white/5 border-b border-white/5">
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Video Quality</p>
                       </div>
                       <div className="max-h-64 overflow-y-auto">
                          {availableQualities.filter(q => q !== 'auto').reverse().map((q) => (
                             <button
                                key={q}
                                onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                                className={`w-full text-left px-5 py-3 text-[11px] font-bold transition-all hover:bg-white/10 flex items-center justify-between ${displayQuality === q ? 'text-white' : 'text-white/40'}`}
                             >
                                <span>{mapQualityLabel(q)}</span>
                                {displayQuality === q && <span className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_red]" />}
                             </button>
                          ))}
                          <button
                             onClick={(e) => { e.stopPropagation(); handleQualityChange('auto'); }}
                             className={`w-full text-left px-5 py-3 text-[11px] font-bold transition-all hover:bg-white/10 flex items-center justify-between ${displayQuality === 'auto' || !displayQuality ? 'text-white' : 'text-white/40'}`}
                          >
                             <span>Auto</span>
                             {(displayQuality === 'auto' || !displayQuality) && <span className="w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_8px_red]" />}
                          </button>
                       </div>
                    </div>
                  )}
               </div>

               <button 
                  onClick={(e) => { e.stopPropagation(); if (playerRef.current) { if (isMuted) playerRef.current.unMute(); else playerRef.current.mute(); setIsMuted(!isMuted); } }}
                  className="text-white/40 hover:text-white transition-all active:scale-95"
               >
                  <span className="material-symbols-rounded text-[28px]">
                    {isMuted ? 'volume_off' : 'volume_up'}
                  </span>
               </button>

               {/* STATUS */}
               <div className="hidden xl:flex items-center gap-3 px-6 py-2.5 bg-black/60 border border-white/10 rounded-full backdrop-blur-3xl shadow-2xl">
                  <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_12px_#dc2626] animate-pulse" />
                  <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] font-outfit italic">LOCKED STREAM SHIELD</p>
               </div>
            </div>
         </div>
      </div>

      {/* ZERO-DELAY RENDERING - NO LOADING MASKS */}
    </div>
  );
};

export default VideoPlayer;
