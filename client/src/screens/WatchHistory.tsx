import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';

const WatchHistory: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/20">
              <span className="material-symbols-rounded">menu</span>
            </button>
            <h1 className="text-lg font-bold">Watch History</h1>
          </div>
          {history.length > 0 && (
            <button className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-all">
              Clear All
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-rounded animate-spin text-4xl text-pink-600">progress_activity</span>
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl shadow-sm overflow-hidden flex cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/study/${item.courseId}`)}
              >
                <div className="relative w-32 h-20 bg-gray-200 shrink-0">
                  <img 
                    src={item.thumbnail || 'https://picsum.photos/200/120'} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] px-1 rounded">
                    {item.duration || '0:00'}
                  </div>
                </div>
                <div className="flex-1 p-3">
                  <h4 className="font-bold text-xs line-clamp-2">{item.title}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">{item.subject || 'General'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500" style={{ width: `${item.watchProgress || 0}%` }}></div>
                    </div>
                    <span className="text-[8px] text-gray-400">{item.watchProgress || 0}%</span>
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1">{item.watchedAt || 'Recently'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-rounded text-6xl text-gray-300">history</span>
            <p className="text-sm text-gray-400 mt-4">No watch history</p>
            <p className="text-[10px] text-gray-300 mt-1">Videos you watch will appear here</p>
            <button 
              onClick={() => navigate('/my-courses')}
              className="mt-4 bg-pink-600 text-white px-6 py-2 rounded-lg text-sm font-bold"
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
