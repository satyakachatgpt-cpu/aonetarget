import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { getImageUrl, getVideoUrl, getYouTubeThumbnail, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';

const WatchHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchWatchHistory(studentData.id);
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchWatchHistory = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}/watch-history`);
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching watch history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Direct navigation — build video obj from cached watch history data, no extra fetch needed
  const handleVideoClick = (item: any) => {
    const videoObj = {
      _id: item.videoId,
      id: item.videoId,
      title: item.title || 'Video',
      thumbnail: getImageUrl(item.thumbnail) || '',
      thumbnailUrl: getImageUrl(item.thumbnail) || '',
      duration: item.duration || '',
      youtubeUrl: item.youtubeUrl || null,
      videoUrl: toYouTubeEmbed(item.youtubeUrl || item.videoUrl || item.url || item.fileUrl || ''),
      courseId: item.courseId,
    };
    navigate('/video-player', {
      state: {
        video: videoObj,
        courseTitle: item.courseTitle || '',
        courseId: item.courseId,
      },
    });
  };

  const handleClearAll = async () => {
    if (!student?.id) return;
    setClearing(true);
    try {
      await fetch(`/api/students/${student.id}/watch-history`, { method: 'DELETE' });
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold">Watch History</h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-all disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-brandBlue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item, idx) => {
              const thumb = getThumbnail(item);
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow-sm overflow-hidden flex cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                  onClick={() => handleVideoClick(item)}
                >
                  {/* Thumbnail */}
                  <div className="relative w-32 h-20 bg-gray-100 shrink-0">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <span className="material-symbols-rounded text-gray-400 text-3xl">smart_display</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                    </div>
                    {item.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] px-1 rounded">
                        {item.duration}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <h4 className="font-bold text-xs line-clamp-2 text-gray-900">
                      {item.title || 'Untitled Video'}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {item.courseTitle || item.subject || 'General'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full"
                          style={{ width: `${item.watchProgress || 0}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-gray-400 shrink-0">{item.watchProgress || 0}%</span>
                    </div>
                    <p className="text-[9px] text-gray-300 mt-1">{formatDate(item.watchedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm mt-4">
            <span className="material-symbols-rounded text-6xl text-gray-200">history</span>
            <p className="text-sm font-bold text-gray-400 mt-4">No watch history yet</p>
            <p className="text-[10px] text-gray-300 mt-1">Videos you watch will appear here</p>
            <button
              onClick={() => navigate('/my-courses')}
              className="mt-5 bg-brandBlue text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all"
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
