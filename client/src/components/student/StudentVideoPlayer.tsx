import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getImageUrl } from '../../lib/utils';

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
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const youtubeId = src ? (src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/))([^?&#\s]+)/)?.[1] || null) : null;
  const isYoutube = !!youtubeId;

  // INITIALIZE YT SDK
  useEffect(() => {
    if (!youtubeId) return;

    const init = () => {
      if (playerRef.current) return;
      new window.YT.Player(`student-player-${youtubeId}`, {
        height: '100%',
        width: '100%',
        videoId: youtubeId,
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
          }
        }
      });
    };

    if (!window.YT || !window.YT.Player) {
      if (!document.getElementById('yt-sdk-scr')) {
        const t = document.createElement('script'); t.id = 'yt-sdk-scr';
        t.src = "https://www.youtube.com/iframe_api";
        const f = document.getElementsByTagName('script')[0];
        f.parentNode?.insertBefore(t, f);
      }
      window.onYouTubeIframeAPIReady = () => init();
    } else { init(); }

    return () => {
      if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    };
  }, [youtubeId]);

  // PROGRESS TICK
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (isYoutube && playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        } else if (!isYoutube && videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }, 500);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, isYoutube]);

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => { if (isPlaying) setShowControls(false); }, 4000);
  }, [isPlaying]);

  const togglePlay = () => {
    if (isYoutube) {
      if (!playerRef.current) return;
      if (isPlaying) playerRef.current.pauseVideo();
      else playerRef.current.playVideo();
    } else {
      if (!videoRef.current) return;
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (s: number) => {
    if (isYoutube) {
      if (!playerRef.current) return;
      const t = Math.max(0, Math.min(duration, playerRef.current.getCurrentTime() + s));
      playerRef.current.seekTo(t, true);
      setCurrentTime(t);
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

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const mapQuality = (q: string) => {
    const map: any = { hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
    return map[q] || q;
  };

  const isLandscape = orientation === 'landscape';

  return (
    <div 
      className="fixed inset-0 z-[1000000] bg-black font-outfit select-none overflow-hidden flex items-center justify-center p-0"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <div 
        className={`relative bg-black transition-all duration-700 ease-in-out shadow-2xl ${
          isLandscape 
            ? 'w-[100vh] h-[100vw] rotate-90 scale-100 z-50' 
            : 'w-full h-full max-w-md aspect-[9/19] rounded-none sm:rounded-3xl border-0 overflow-hidden'
        }`}
        style={{
          transformOrigin: 'center center',
          width: isLandscape ? '100vh' : '100%',
          height: isLandscape ? '100vw' : '100%',
          maxHeight: isLandscape ? '100vw' : '100%',
          maxWidth: isLandscape ? '100vh' : (window.innerWidth < 640 ? '100%' : '450px'),
        }}
      >
        <div className="absolute inset-0 z-10 pointer-events-auto bg-black flex items-center justify-center">
           {isYoutube ? (
             <div id={`student-player-${youtubeId}`} className="w-full h-full" />
           ) : (
             <video 
               ref={videoRef}
               src={getImageUrl(src)}
               className="w-full h-full object-contain"
               onPlay={() => setIsPlaying(true)}
               onPause={() => setIsPlaying(false)}
               onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
               onClick={togglePlay}
             />
           )}
        </div>

        <button 
          onClick={onClose} 
          className="fixed top-6 left-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all z-[1000001] pointer-events-auto shadow-2xl"
        >
           <span className="material-symbols-rounded text-2xl font-bold">close</span>
        </button>

        <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black via-black/70 to-transparent z-40 p-6 flex items-start justify-end transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_red]" />
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] italic leading-none">SECURE STREAM ISOLATION</p>
               </div>
               
               <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10">
                  <button 
                    onClick={() => setOrientation('portrait')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${!isLandscape ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    <span className="material-symbols-rounded text-xl">stay_primary_portrait</span>
                  </button>
                  <button 
                    onClick={() => setOrientation('landscape')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isLandscape ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    <span className="material-symbols-rounded text-xl">stay_primary_landscape</span>
                  </button>
               </div>
            </div>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 p-8 pb-10 bg-gradient-to-t from-black via-black/90 to-transparent z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative w-full h-1 bg-white/10 rounded-full mb-8 cursor-pointer group pointer-events-auto">
               <div className="absolute h-full bg-white transition-all duration-150 shadow-[0_0_12px_white]" style={{ width: `${(currentTime/(duration||1))*100}%` }} />
               <input type="range" min="0" max={duration||0} step="0.5" value={currentTime} onChange={(e) => { const t = parseFloat(e.target.value); if(isYoutube){ playerRef.current?.seekTo(t, true); } else { if(videoRef.current) videoRef.current.currentTime = t; } setCurrentTime(t); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[60]" />
            </div>

            <div className="flex flex-col gap-8">
               <div className="flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-6">
                     <button onClick={() => skip(-10)} className="text-white/40 hover:text-white transition-all active:scale-90"><span className="material-symbols-rounded text-[32px]">replay_10</span></button>
                     <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-90 transition-all">
                        <span className="material-symbols-rounded text-[42px] fill-current">{isPlaying ? 'pause' : 'play_arrow'}</span>
                     </button>
                     <button onClick={() => skip(10)} className="text-white/40 hover:text-white transition-all active:scale-90"><span className="material-symbols-rounded text-[32px]">forward_10</span></button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="text-white font-black text-[11px] tracking-widest opacity-80 font-mono">
                        {formatTime(currentTime)} <span className="text-white/20 mx-1">/</span> {formatTime(duration)}
                     </div>
                     <button onClick={() => { if(isYoutube && playerRef.current){ if(isMuted){ playerRef.current.unMute(); setIsMuted(false); } else { playerRef.current.mute(); setIsMuted(true); } } else if(videoRef.current){ videoRef.current.muted = !videoRef.current.muted; setIsMuted(videoRef.current.muted); } }} className="text-white/40 hover:text-white transition-all">
                        <span className="material-symbols-rounded text-2xl">{isMuted ? 'volume_off' : 'volume_up'}</span>
                     </button>
                  </div>
               </div>

               <div className="flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-black text-[10px] tracking-widest uppercase hover:bg-white/10 transition-all">
                          <span className="material-symbols-rounded text-sm">settings</span>
                          {isYoutube ? mapQuality(currentQuality).replace('p', '') : 'MP4'}
                       </button>
                       {showQualityMenu && (
                          <div className="absolute bottom-full left-0 mb-4 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden min-w-[140px] shadow-2xl animate-in slide-in-from-bottom-2 z-[60]">
                             <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-[8px] font-black text-white/30 tracking-widest uppercase">Video Quality</div>
                             <div className="max-h-48 overflow-y-auto">
                                {isYoutube ? (
                                  [
                                    {q: 'hd1080', label: '1080p'}, {q: 'hd720', label: '720p'}, {q: 'large', label: '480p'}, {q: 'medium', label: '360p'}, {q: 'small', label: '240p'}
                                  ].map(item => (
                                     <button key={item.q} onClick={() => handleQualityChange(item.q)} className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-between ${currentQuality === item.q ? 'text-blue-500' : 'text-white/40'}`}>
                                        {item.label}
                                        {currentQuality === item.q && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
                                     </button>
                                  ))
                                ) : (
                                  <div className="px-5 py-3 text-[10px] font-black text-white/40 uppercase tracking-widest">Original Quality</div>
                                )}
                             </div>
                          </div>
                       )}
                    </div>

                    {isLive && (
                      <button 
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] tracking-widest uppercase ${showChat ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                      >
                         <span className="material-symbols-rounded text-sm">chat</span>
                         {showChat ? 'Close Chat' : 'Open Chat'}
                      </button>
                    )}
                  </div>

                  <div className="px-5 py-2.5 bg-black/40 border border-white/5 rounded-full flex items-center gap-3 backdrop-blur-sm">
                     <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                     <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] italic">LOCKED SHIELD</span>
                  </div>
               </div>
            </div>
        </div>

        {isLive && (
           <div className={`absolute top-0 bottom-0 right-0 w-full sm:w-[350px] bg-[#0A0A0A]/95 backdrop-blur-3xl border-l border-white/5 z-[60] transition-all duration-500 ease-in-out shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col ${showChat ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
              <div className="px-6 pt-8 pb-6 border-b border-white/5">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                       <span className="text-xs font-black text-white tracking-widest uppercase">Live Interaction</span>
                    </div>
                    <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all"><span className="material-symbols-rounded text-xl">close</span></button>
                 </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 mt-[-20px]">
                          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/40"><span className="material-symbols-rounded text-3xl">chat_bubble</span></div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Stream Chat</p>
                             <p className="text-[9px] font-bold text-white/30 uppercase mt-1 tracking-widest">Connect with other students</p>
                          </div>
                       </div>
                    ) : (
                       chatMessages.map((msg, i) => (
                          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'admin' ? 'animate-in zoom-in-95' : 'animate-in slide-in-from-bottom-2'}`}>
                             <div className="flex items-center gap-2 px-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'admin' ? 'text-blue-500' : 'text-white/50'}`}>
                                   {msg.role === 'admin' ? 'Instructor' : (msg.senderName || 'Student')}
                                </span>
                                <span className="text-[8px] text-white/20 font-bold ml-auto">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                             <div className={`p-3.5 rounded-2xl border transition-all ${msg.role === 'admin' ? 'bg-blue-500/10 border-blue-500/20 rounded-tl-none ring-1 ring-blue-500/10' : 'bg-white/5 border-white/5 rounded-tl-none'}`}>
                                <p className="text-xs text-white/90 font-medium leading-relaxed tracking-wide">{msg.content}</p>
                             </div>
                          </div>
                       ))
                    )}
                 </div>

                 <div className="p-6 bg-black/40 border-t border-white/5">
                    <form 
                       onSubmit={(e) => {
                          e.preventDefault();
                          const input = e.currentTarget.querySelector('input');
                          if (input && input.value.trim() && onSendMessage) {
                             onSendMessage(input.value.trim());
                             input.value = '';
                          }
                       }}
                       className="flex items-center gap-3"
                    >
                       <div className="relative flex-1">
                          <input type="text" placeholder="Type a message..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all shadow-inner" />
                       </div>
                       <button type="submit" className="w-11 h-11 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"><span className="material-symbols-rounded text-xl font-bold">send</span></button>
                    </form>
                 </div>
              </div>
           </div>
        )}

        {!isLandscape && !showChat && (
           <div className="absolute inset-0 z-[35] cursor-pointer" onClick={togglePlay} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type=range]::-webkit-slider-thumb { width: 0; height: 0; -webkit-appearance: none; }
        .orientation-landscape { rotate: 90deg; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default StudentVideoPlayer;
