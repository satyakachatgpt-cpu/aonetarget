import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import StudentVideoPlayer from '../components/student/StudentVideoPlayer';
import Playlist from '../components/Playlist';
import { getVideoUrl, toYouTubeEmbed, getEmbedUrl, normalizeId } from '../lib/utils';
import { getAuthHeaders, getAdminHeaders } from '../services/apiClient';

function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || lc.liveStatus || lc.eventStatus || 'upcoming').toLowerCase();
  
  const isExplicitlyEnded = ['ended', 'completed', 'inactive', 'recorded', 'disable', 'finished'].includes(raw);
  const isImplicitlyEnded = (lc.isLive === false && (lc.endedAt || lc.endTime)) || 
                           (lc.type === 'recorded' || lc.contentType === 'recorded' || lc.contentType === 'video');
  const hasEndedLabel = lc.statusLabel === 'EVENT ENDED' || lc.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) return 'ended';
  if (raw === 'live' || lc.isLive === true) return 'live';

  // Time-based auto-promotion: if scheduled time has passed and not ended, treat as live
  const scheduledTime = lc.scheduledTime || lc.startTime || lc.scheduledAt || lc.scheduleTime;
  if (scheduledTime) {
    const scheduled = new Date(scheduledTime);
    if (!isNaN(scheduled.getTime()) && Date.now() >= scheduled.getTime()) {
      return 'live';
    }
  }

  return 'upcoming';
}

const WatchPage: React.FC = () => {
  const { batchId, videoId } = useParams<{ batchId: string; videoId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const isAdminPreview = searchParams.get('adminPreview') === '1';
  const source = searchParams.get('source');
  const queryReturnTo = searchParams.get('returnTo');

  // Role detection for internal features (e.g. disabling auto-rotation)
  const isUserAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';

  let returnTo = queryReturnTo || (location.state as any)?.returnTo;
  
  // SANITIZE returnTo: Allow only internal routes starting with "/", reject HashRouter artifacts or full URLs
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/') || returnTo.includes('#') || returnTo.includes('://')) {
    // Fallback logic
    if (isAdminPreview) {
      returnTo = (source === 'free-content' || source === 'free') ? '/admin/free-content' : '/admin/course-content';
    } else {
      returnTo = null;
    }
  }

  const handleBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      const state = window.history.state;
      if (state && state.idx > 0) {
        navigate(-1);
      } else if (isAdminPreview) {
        navigate((source === 'free-content' || source === 'free') ? '/admin/free-content' : '/admin/course-content');
      } else {
        navigate('/live-classes', { replace: true });
      }
    }
  }, [navigate, returnTo, isAdminPreview, source]);

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
  const [isChatVisible, setIsChatVisible] = useState(false);

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
      // Fetch once immediately when video loads or chat opens
      fetchLiveMessages(vid);
      
      // Clear any existing interval
      if (pollRef.current) clearInterval(pollRef.current);
      
      // Start polling only if chat is visible
      if (isChatVisible) {
        pollRef.current = setInterval(() => fetchLiveMessages(vid), 3000);
      }
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setLiveMessages([]);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentVideo, isChatVisible]);

  const handleSendLiveMessage = async (msg: string) => {
    if (!msg.trim() || !currentVideo) return;
    try {
      const vid = currentVideo.id || currentVideo._id;
      
      const adminToken = localStorage.getItem('adminToken');
      const studentToken = localStorage.getItem('studentToken') || localStorage.getItem('token');
      
      const usingAdmin = isAdminPreview && !!adminToken;
      const token = usingAdmin ? adminToken : studentToken;
      
      const adminNameFromStore = localStorage.getItem('adminName') || localStorage.getItem('adminUser');
      const studentNameFromStore = student?.name || student?.phone || 'Student';

      const senderName = usingAdmin
        ? (adminNameFromStore || 'Instructor')
        : studentNameFromStore;

      const senderId = usingAdmin ? 'admin' : (student?.id || student?._id || 'student');
      const role = usingAdmin ? 'admin' : 'student';

      const res = await fetch(`/api/live-chat/${vid}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          senderId,
          senderName,
          message: msg.trim(),
          role
        })
      });
      if (res.ok) fetchLiveMessages(vid);
    } catch (e) {}
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
      if (location.state?.video && (location.state.video.videoUrl || location.state.video.youtubeUrl || location.state.video.url || location.state.video.recordedLink || location.state.video.link)) {
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
        const headers = (isAdminPreview || isUserAdmin) ? { ...getAdminHeaders() } : { ...getAuthHeaders() };
        const response = await fetch(`/api/courses/${batchId}/videos`, {
          headers
        });
        const videos = await response.json();

        if (Array.isArray(videos) && videos.length > 0) {
          setPlaylist(videos);
          const targetId = normalizeId(videoId);

          let current = videos.find((v: any) => {
            const ids = [v._id, v.id, v.videoId].filter(Boolean).map(normalizeId);
            return ids.includes(targetId);
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

  const markVideoComplete = async (vId: string) => {
    const sId = student?.id || student?._id;
    if (!vId || !sId || !batchId || isAdminPreview || isUserAdmin) return;

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[WatchPage] Auto-completing video ${vId} for course ${batchId}`);
      }
      
      await fetch(`/api/students/${sId}/courses/${batchId}/progress`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ videoId: String(vId), action: 'complete' })
      });
    } catch (error) {
      console.error('[WatchPage] Progress update failed:', error);
    }
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

  if (!currentVideo) {
    return (
      <div className="h-[100dvh] bg-[#000000] flex flex-col items-center justify-center overflow-hidden font-outfit relative">
        <div onClick={handleBack} className="fixed top-0 left-0 w-24 h-24 z-[9999999] cursor-pointer group flex items-start justify-start p-6 active:scale-90 transition-all">
          <div className="w-10 h-10 bg-white/10 hover:bg-red-600/80 backdrop-blur-3xl border border-white/20 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-200">
            <span className="material-symbols-rounded text-2xl font-bold">arrow_back</span>
          </div>
        </div>
        <div className="relative w-24 h-24 mb-6 bg-white/5 rounded-full flex items-center justify-center text-white/20">
          <span className="material-symbols-rounded text-5xl">video_off</span>
        </div>
        <h2 className="text-white text-xl font-black uppercase tracking-widest mb-2 text-center">Video Not Found</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] text-center max-w-xs">The requested video could not be loaded or has been removed.</p>
      </div>
    );
  }

  const streamStatus = (currentVideo?.effectiveStatus === 'live' || currentVideo?.streamStatus === 'live' || currentVideo?.status === 'live') 
    ? 'live' 
    : computeEffectiveStatus(currentVideo);
  const isUpcomingStream = currentVideo.contentType === 'live_stream' && streamStatus === 'upcoming';
  const isEndedStream = currentVideo.contentType === 'live_stream' && streamStatus === 'ended';

  const replaySource = currentVideo.recordedLink || 
                      currentVideo.recordingUrl || 
                      currentVideo.replayUrl || 
                      currentVideo.playbackUrl || 
                      currentVideo.videoUrl || 
                      currentVideo.url || 
                      currentVideo.youtubeUrl || 
                      currentVideo.liveUrl || 
                      currentVideo.streamUrl;

  const isEndedWithoutRecording = isEndedStream && !replaySource;

  if (isUpcomingStream) {
    return (
      <div className="h-[100dvh] bg-[#000000] flex flex-col items-center justify-center overflow-hidden font-outfit relative">
        <div
          onPointerDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            handleBack();
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

  if (isEndedWithoutRecording) {
    return (
      <div className="h-[100dvh] bg-[#000000] flex flex-col items-center justify-center overflow-hidden font-outfit relative">
        <div
          onPointerDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            handleBack();
          }}
          className="fixed top-0 left-0 w-24 h-24 z-[9999999] cursor-pointer group flex items-start justify-start p-6 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 bg-white/10 hover:bg-red-600/80 backdrop-blur-3xl border border-white/20 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-200">
            <span className="material-symbols-rounded text-2xl font-bold">close</span>
          </div>
        </div>
        <div className="relative w-24 h-24 mb-6 bg-white/5 rounded-full flex items-center justify-center">
          <span className="material-symbols-rounded text-5xl text-white/40">pantry</span>
        </div>
        <h2 className="text-white text-xl font-black uppercase tracking-widest mb-2 text-center max-w-sm">Recording not available yet</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] text-center max-w-xs">This live session has ended. Replay will appear here when uploaded.</p>
      </div>
    );
  }

  const isLive = currentVideo.contentType === 'live_stream' && streamStatus === 'live';
  
  // STABLE VIDEO ID FOR PROGRESS SYNC
  const stableVideoId = String(currentVideo.id || currentVideo._id || currentVideo.sourceVideoId || `v-${currentVideo.title}`);

  return (
    <StudentVideoPlayer
      videoId={stableVideoId}
      src={toYouTubeEmbed(replaySource || '')}
      title={currentVideo.title}
      isLive={isLive}
      chatMessages={liveMessages}
      onSendMessage={handleSendLiveMessage}
      onChatVisibilityChange={setIsChatVisible}
      onClose={handleBack}
      onMarkComplete={() => markVideoComplete(stableVideoId)}
      courseId={batchId || (location.state as any)?.courseId}
      courseTitle={currentVideo.courseTitle || (location.state as any)?.courseTitle}
      isAdmin={isUserAdmin}
      pdf1={currentVideo.pdf1 || currentVideo.pdf1Url || currentVideo.pdfUrl}
      pdf2={currentVideo.pdf2 || currentVideo.pdf2Url}
      studyMaterial={currentVideo.studyMaterial || currentVideo.studyMaterialUrl || currentVideo.documentUrl || currentVideo.material}
    />
  );
};

export default WatchPage;
