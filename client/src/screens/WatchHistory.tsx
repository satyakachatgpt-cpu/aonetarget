import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { getImageUrl, getVideoUrl, getYouTubeThumbnail, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';
import { getAuthHeaders } from '../services/apiClient';
import { API_BASE_URL } from '../services/apiClient';

const WatchHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (student) {
      const id = student.id || (student as any).userId || (student as any)._id;
      if (id) fetchWatchHistory(id);
    } else {
      const storedStudent = localStorage.getItem('studentData');
      if (storedStudent) {
        const studentData = JSON.parse(storedStudent);
        setStudent(studentData);
        const id = studentData.id || studentData.userId || studentData._id;
        if (id) fetchWatchHistory(id);
      } else {
        navigate('/student-login');
      }
    }
  }, [student, navigate]);

  const fetchWatchHistory = async (studentId: string) => {
    setLoading(true);
    try {
      // Fetch from both sources for maximum coverage
      const [historyRes, progressRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${studentId}/watch-history`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/progress/${studentId}`, { headers: getAuthHeaders() })
      ]);

      const historyData = await historyRes.json().catch(() => []);
      const progressData = await progressRes.json().catch(() => []);

      // Merge data by videoId
      const merged: any[] = [];
      const seenIds = new Set();

      // 1. Process manual watchHistory entries
      if (Array.isArray(historyData)) {
        historyData.forEach(item => {
          const vId = item.videoId || item.id;
          if (vId) {
            merged.push({ ...item, videoId: vId });
            seenIds.add(vId);
          }
        });
      }

      // 2. Add or update from automated progressData
      if (Array.isArray(progressData)) {
        progressData.forEach(item => {
          const vId = item.videoId || item.id;
          if (!vId) return;

          const progressPct = item.duration > 0 ? Math.round((item.timestamp / item.duration) * 100) : 0;
          const existingIdx = merged.findIndex(m => m.videoId === vId);

          if (existingIdx !== -1) {
            // Update existing with latest progress if it's higher
            merged[existingIdx].watchProgress = Math.max(merged[existingIdx].watchProgress || 0, progressPct);
            if (!merged[existingIdx].courseId) merged[existingIdx].courseId = item.courseId;
            if (!merged[existingIdx].thumbnail) merged[existingIdx].thumbnail = item.thumbnail;
          } else {
            merged.push({
              ...item,
              videoId: vId,
              watchProgress: progressPct,
              watchedAt: item.lastUpdated || item.updatedAt
            });
            seenIds.add(vId);
          }
        });
      }

      // Sort by recency (watchedAt or lastUpdated)
      merged.sort((a, b) => {
        const dateA = new Date(a.watchedAt || a.lastUpdated || a.updatedAt || 0).getTime();
        const dateB = new Date(b.watchedAt || b.lastUpdated || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });

      setHistory(merged);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = async (item: any) => {
    const videoUrl = item.videoUrl || item.youtubeUrl || item.url || item.fileUrl || '';
    const vId = item.videoId || item.id;
    const videoObj = {
      _id: vId,
      id: vId,
      title: item.title || 'Video',
      thumbnail: getImageUrl(item.thumbnail) || '',
      thumbnailUrl: getImageUrl(item.thumbnail) || '',
      duration: item.duration || '',
      youtubeUrl: isYouTubeUrl(videoUrl) ? videoUrl : (item.youtubeUrl || null),
      videoUrl: toYouTubeEmbed(videoUrl),
      courseId: item.courseId || '',
      courseTitle: item.courseTitle || item.subject || '',
    };

    navigate(`/watch/${item.courseId || 'history'}/${vId}`, {
      state: {
        video: (videoObj.videoUrl || videoObj.youtubeUrl) ? videoObj : null,
        courseTitle: item.courseTitle || 'Watch History',
        courseId: item.courseId || '',
        returnTo: '/watch-history'
      },
    });
  };

  const handleClearAll = async () => {
    const studentId = student?.id || student?._id;
    if (!studentId) return;
    setClearing(true);
    try {
      await fetch(`${API_BASE_URL}/students/${studentId}/watch-history`, { method: 'DELETE', headers: getAuthHeaders() });
      setHistory([]);
    } catch (e) {
      console.error('Clear failed:', e);
    } finally {
      setClearing(false);
    }
  };

  const getThumbnail = (item: any): string | null => {
    if (item.thumbnail && item.thumbnail.trim() !== '') return getImageUrl(item.thumbnail);
    return getYouTubeThumbnail(item.youtubeUrl || item.videoUrl || item.url || '');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay === 1) return 'Yesterday';
      if (diffDay < 7) return `${diffDay} days ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-outfit pb-24">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      {/* Pixel Minimal Header */}
      <div className="bg-[#1A237E] text-white px-6 py-6 sticky top-0 z-50 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full flex items-center justify-center active:bg-white/10 transition-all"
        >
          <span className="material-symbols-rounded text-2xl">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">Watch History</h1>
      </div>

      {/* Statistics Section */}
      <div className="px-6 py-8 flex flex-col items-center">
         <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-around">
            <div className="text-center">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Watched</p>
               <h2 className="text-3xl font-black text-[#1A237E]">{history.length}</h2>
            </div>
            <div className="w-px h-12 bg-gray-100" />
            <div className="text-center">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Completion</p>
               <h2 className="text-3xl font-black text-brandBlue">
                  {history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.watchProgress || 0), 0) / history.length) : 0}%
               </h2>
            </div>
         </div>
      </div>

      {/* History List - Minimal Vertical Rows */}
      <div className="px-6 pb-24 max-w-2xl mx-auto">
        {loading && history.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item, idx) => {
              const progress = item.watchProgress || 0;
              const date = new Date(item.watchedAt || item.lastUpdated || item.updatedAt);
              const timeLabel = date.toLocaleDateString() === new Date().toLocaleDateString() 
                ? 'Today' 
                : date.toLocaleDateString() === new Date(Date.now() - 86400000).toLocaleDateString()
                ? 'Yesterday'
                : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

              return (
                <div 
                  key={idx} 
                  onClick={() => handleVideoClick(item)}
                  className="bg-white rounded-2xl p-2.5 flex gap-3.5 border border-gray-100 hover:border-brandBlue/30 transition-all cursor-pointer group shadow-sm active:scale-[0.98]"
                >
                  {/* Thumbnail Left */}
                  <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    <img 
                      src={getThumbnail(item) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80'} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                    {item.duration && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[8px] font-bold text-white tracking-tighter">
                        {item.duration}
                      </div>
                    )}
                  </div>

                  {/* Info Right */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.title || 'Video'}</h3>
                      <span className="text-[9px] font-medium text-gray-400 whitespace-nowrap">{timeLabel}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate uppercase tracking-wide">
                      {item.courseTitle || item.subject || 'Course Content'}
                    </p>

                    {/* Minimal Progress */}
                    <div className="mt-3 flex items-center gap-3">
                       <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brandBlue transition-all duration-700" 
                            style={{ width: `${progress}%` }} 
                          />
                       </div>
                       <span className="text-[10px] font-bold text-brandBlue">{progress}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Same style as the user's screenshot empty state */
          <div className="mt-12 bg-white rounded-[2rem] p-10 py-16 text-center shadow-[0_15px_40px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-8">
              <span className="material-symbols-rounded text-5xl text-gray-200">history</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No watch history yet</h3>
            <p className="text-xs text-gray-400 mb-8">Videos you watch will appear here</p>
            <button 
              onClick={() => navigate('/batches')}
              className="px-10 py-3.5 bg-[#1A237E] text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all"
            >
              Browse Courses
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchHistory;
