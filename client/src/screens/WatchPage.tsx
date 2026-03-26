import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Playlist from '../components/Playlist';
import { curriculumAPI } from '../services/apiClient';

const WatchPage: React.FC = () => {
  const { batchId, videoId } = useParams<{ batchId: string; videoId: string }>();
  const navigate = useNavigate();
  
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Orientation handling for mobile
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load Content
  useEffect(() => {
    const loadContent = async () => {
      if (!batchId) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/courses/${batchId}/videos`);
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
        } else {
          setPlaylist([]);
          setCurrentVideo(null);
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
        setCurrentVideo(null);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [batchId, videoId]);

  const handleVideoSelect = (vId: string) => {
    navigate(`/watch/${batchId}/${vId}`, { replace: true });
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Video Not Found</h2>
        <button onClick={handleBack} className="px-6 py-2 bg-blue-600 rounded-lg font-bold">Back to Course</button>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] bg-black flex flex-col overflow-hidden`}>
      {/* Portrait Top Bar */}
      {!isLandscape && (
        <div className="flex-shrink-0 z-40 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4 py-3">
          <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:scale-90 transition-all">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-white text-xs font-bold uppercase tracking-widest truncate max-w-[70%]">
            {currentVideo.title}
          </h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex ${isLandscape ? 'flex-row' : 'flex-col'} overflow-hidden min-h-0 relative`}>
        <div className={`bg-black flex-shrink-0 ${isLandscape ? 'flex-1 h-full' : 'w-full aspect-video'}`}>
          <VideoPlayer
            src={currentVideo.youtubeUrl || currentVideo.videoUrl || currentVideo.url || currentVideo.meetingLink || ''}
            title={currentVideo.title}
            className="w-full h-full"
          />
        </div>

        {/* Playlist & Info Portion (Portrait Only) */}
        {!isLandscape && (
          <div className="flex-1 flex flex-col bg-zinc-900 border-t border-white/5 overflow-hidden min-h-0">
            <div className="flex-shrink-0 p-4 bg-black/20">
              <h2 className="text-white text-sm font-bold tracking-tight leading-tight line-clamp-2">{currentVideo.title}</h2>
              <p className="text-white/40 text-[10px] mt-1 uppercase tracking-widest">{currentVideo.duration || '00:00'} min</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Playlist
                videos={playlist}
                activeVideoId={videoId || ''}
                onSelect={handleVideoSelect}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchPage;
