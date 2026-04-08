import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Playlist from '../components/Playlist';
import { getVideoUrl, toYouTubeEmbed, getEmbedUrl } from '../lib/utils';
import { curriculumAPI } from '../services/apiClient';

const WatchPage: React.FC = () => {
  const { batchId, videoId } = useParams<{ batchId: string; videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lectures' | 'about' | 'notes'>('lectures');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // Orientation handling
  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load Content
  useEffect(() => {
    const loadContent = async () => {
      // Priority 1: Check if video is passed via state (e.g. from Live Classes)
      if (location.state?.video) {
        setCurrentVideo(location.state.video);
        setLoading(false);
        return;
      }

      if (!batchId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${batchId}/videos`, {
          headers: {
            'x-admin-id': localStorage.getItem('adminId') || '',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        const videos = await response.json();
        
        if (Array.isArray(videos) && videos.length > 0) {
          setPlaylist(videos);
          const targetId = String(videoId || '').toLowerCase();
          
          let current = videos.find((v: any) => {
            const ids = [v._id, v.id, v.videoId].filter(Boolean).map(String);
            return ids.some(id => id.toLowerCase() === targetId);
          });
          
          if (!current && videos.length > 0) current = videos[0];
          setCurrentVideo(current || null);
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [batchId, videoId]);

  const handleVideoSelect = (vId: string) => {
    navigate(`/watch/${batchId}/${vId}`, { replace: true });
  };

  const playNext = useCallback(() => {
    if (!autoPlayEnabled || !playlist.length || !currentVideo) return;
    const currentIndex = playlist.findIndex(v => (v._id || v.id) === (currentVideo._id || currentVideo.id));
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      const nextVideo = playlist[currentIndex + 1];
      handleVideoSelect(nextVideo._id || nextVideo.id);
    }
  }, [autoPlayEnabled, playlist, currentVideo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#000000]">
        <div className="relative w-16 h-16 mb-6">
           <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
           <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        </div>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse italic">Initializing Secure Stream</p>
      </div>
    );
  }

  if (!currentVideo) return null;

  return (
    <div className="h-[100dvh] bg-[#000000] flex flex-col overflow-hidden font-outfit relative">
      
      {/* ABSOLUTE GLOBAL EXIT (X) PROTOCOL - TAB-CLOSE & UNBLOCKABLE */}
      <div 
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Navigate back instead of closing the tab
          navigate(-1);
          
          // Hard-Fail-safe fallback if navigation takes too long or fails
          setTimeout(() => {
            if (window.location.hash.includes('/watch/')) {
              window.location.hash = '/#/my-courses';
            }
          }, 100);
        }}
        className="fixed top-0 left-0 w-24 h-24 z-[9999999] cursor-pointer group flex items-start justify-start p-6 active:scale-90 transition-all"
        style={{ touchAction: 'none' }}
      >
        <div className="w-10 h-10 bg-white/10 hover:bg-red-600/80 backdrop-blur-3xl border border-white/20 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-200">
          <span className="material-symbols-rounded text-2xl font-bold">close</span>
        </div>
      </div>
      
      {/* HEADER: PORTRAIT ONLY */}
      {!isLandscape && (
        <div className="flex-shrink-0 z-50 bg-[#000000] border-b border-white/5 flex items-center justify-between px-6 py-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-white active:scale-90 transition-all border border-white/10">
            <span className="material-symbols-rounded text-xl">arrow_back_ios_new</span>
          </button>
          <div className="flex flex-col items-center">
             <p className="text-[#dc2626] text-[8px] font-black uppercase tracking-[0.3em] mb-1 italic">Now Playing</p>
             <h1 className="text-white text-[11px] font-black uppercase tracking-widest truncate max-w-[180px]">
               {currentVideo.title}
             </h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-white/40 border border-white/10">
            <span className="material-symbols-rounded text-xl">more_vert</span>
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className={`flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} overflow-hidden relative`}>
        
        {/* VIDEO PLAYER AREA */}
        <div className={`bg-black flex-shrink-0 relative group ${isLandscape ? 'flex-1 h-full' : 'w-full aspect-video shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-40'}`}>
          <VideoPlayer
            src={getEmbedUrl(currentVideo.youtubeUrl || currentVideo.videoUrl || currentVideo.url || currentVideo.embedUrl || '')}
            title={currentVideo.title}
            onEnded={playNext}
            onClose={() => navigate(-1)}
            className="w-full h-full"
          />
        </div>

        {/* TABS & CONTENT: PORTRAIT ONLY */}
        {!isLandscape && (
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
            
            {/* PRO TAB BAR */}
            <div className="flex-shrink-0 flex items-center px-4 bg-black/40 border-b border-white/5">
               {(['lectures', 'about', 'notes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/30'}`}
                  >
                     {tab}
                     {activeTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-red-600 rounded-full shadow-[0_0_10px_red]" />
                     )}
                  </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto">
               {activeTab === 'lectures' && (
                 <Playlist
                   videos={playlist}
                   activeVideoId={videoId || String(currentVideo._id || currentVideo.id)}
                   onSelect={handleVideoSelect}
                 />
               )}

               {activeTab === 'about' && (
                  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <h3 className="text-white text-lg font-black tracking-tighter mb-4">{currentVideo.title}</h3>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                           <span className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Duration: {currentVideo.duration || '00:00'}</span>
                        </div>
                        <div className="px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-lg">
                           <span className="text-red-500 text-[9px] font-black uppercase tracking-widest leading-none">Premium Stream</span>
                        </div>
                     </div>
                     <p className="text-white/40 text-xs leading-relaxed font-medium">
                        {currentVideo.description || "In this lecture, we cover the core concepts of the curriculum with high-definition visuals and deep explanations. This course is designed to provide a comprehensive understanding of the subject matter."}
                     </p>
                  </div>
               )}

               {activeTab === 'notes' && (
                  <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                     <span className="material-symbols-rounded text-5xl mb-4">folder_zip</span>
                     <p className="text-[10px] font-black uppercase tracking-widest">No Attachments Available</p>
                  </div>
               )}
            </div>

            {/* FLOATING ACTION BOTTOM */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-3 flex items-center justify-between shadow-2xl z-[60]">
               <div className="flex items-center gap-3 ml-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Auto-Next Enabled</span>
               </div>
               <button 
                  onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                  className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${autoPlayEnabled ? 'bg-red-600 text-white' : 'bg-white/10 text-white/40'}`}
               >
                  {autoPlayEnabled ? 'Disable' : 'Enable'}
               </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default WatchPage;
