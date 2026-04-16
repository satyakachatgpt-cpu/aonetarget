import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import StudentVideoPlayer from '../components/student/StudentVideoPlayer';
import Playlist from '../components/Playlist';
import { getVideoUrl, toYouTubeEmbed, getEmbedUrl } from '../lib/utils';
import { getAuthHeaders } from '../services/apiClient';

function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || 'upcoming').toLowerCase();
  if (['ended', 'completed', 'inactive'].includes(raw)) return 'ended';
  if (raw === 'live') return 'live';
  return 'upcoming';
}

const WatchPage: React.FC = () => {
  const { batchId, videoId } = useParams<{ batchId: string; videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = (location.state as any)?.fromAdmin || new URLSearchParams(location.search).get('admin') === 'true';
  const returnTo = (location.state as any)?.returnTo;

  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lectures' | 'about' | 'notes'>('lectures');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [newLiveMessage, setNewLiveMessage] = useState('');
  const pollRef = useRef<any>(null);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('studentData');
    if (data) setStudent(JSON.parse(data));
  }, []);

  const fetchLiveMessages = async (vId: string) => {
    try {
      const res = await fetch(`/api/live-chat/${vId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const normalized = (data || []).map((msg: any) => ({
          ...msg,
          content: msg.message || msg.content,
          role: msg.role || (msg.senderId?.includes('admin') || msg.isAdmin ? 'admin' : 'student')
        }));
        setLiveMessages(normalized);
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (currentVideo && currentVideo.contentType === 'live_stream') {
      const vid = currentVideo.id || currentVideo._id;
      fetchLiveMessages(vid);
      pollRef.current = setInterval(() => fetchLiveMessages(vid), 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setLiveMessages([]);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentVideo]);

  const handleSendLiveMessage = async (msg: string) => {
    if (!msg.trim() || !currentVideo || !student) return;
    try {
      const vid = currentVideo.id || currentVideo._id;
      const res = await fetch(`/api/live-chat/${vid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          senderId: student.id || student._id,
          senderName: student.name || 'Student',
          message: msg.trim(),
          role: 'student'
        })
      });
      if (res.ok) fetchLiveMessages(vid);
    } catch (e) { }
  };

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
          headers: getAuthHeaders()
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

  const isUpcomingStream = currentVideo.contentType === 'live_stream' && computeEffectiveStatus(currentVideo) !== 'live';

  if (isUpcomingStream) {
    return (
      <div className="h-[100dvh] bg-[#000000] flex flex-col items-center justify-center overflow-hidden font-outfit relative">
        <div
          onPointerDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const state = window.history.state;
            if (state && state.idx > 0) navigate(-1);
            else navigate('/live-classes', { replace: true });
          }}
          className="fixed top-0 left-0 w-24 h-24 z-[9999999] cursor-pointer group flex items-start justify-start p-6 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 bg-white/10 hover:bg-red-600/80 backdrop-blur-3xl border border-white/20 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-200">
            <span className="material-symbols-rounded text-2xl font-bold">close</span>
          </div>
        </div>
        <div className="relative w-24 h-24 mb-6 bg-white/5 rounded-full flex items-center justify-center">
          <span className="material-symbols-rounded text-5xl text-white/40">hourglass_empty</span>
        </div>
        <h2 className="text-white text-xl font-black uppercase tracking-widest mb-2 text-center max-w-sm">{currentVideo.title}</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] text-center max-w-xs">This live session has not started yet. Please wait for the instructor to begin.</p>
      </div>
    );
  }

  const isLive = currentVideo.contentType === 'live_stream' && computeEffectiveStatus(currentVideo) === 'live';

  return (
    <StudentVideoPlayer
      videoId={String(currentVideo.id || currentVideo._id || '')}
      src={toYouTubeEmbed(currentVideo.youtubeUrl || currentVideo.videoUrl || currentVideo.url || currentVideo.embedUrl || '')}
      title={currentVideo.title}
      isLive={isLive}
      chatMessages={liveMessages}
      onSendMessage={handleSendLiveMessage}
      onClose={() => {
        if (returnTo) {
          navigate(returnTo);
        } else if (isAdmin) {
          navigate('/admin/course-content');
        } else {
          const state = window.history.state;
          if (state && state.idx > 0) navigate(-1);
          else navigate('/live-classes', { replace: true });
        }
      }}
      courseId={batchId}
      isAdmin={isAdmin}
    />
  );
};

export default WatchPage;
