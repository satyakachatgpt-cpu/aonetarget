import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { liveVideosAPI } from '../services/apiClient';

const LiveClasses: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live');

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchLiveClasses();
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchLiveClasses = async () => {
    try {
      const data = await liveVideosAPI.getAll();
      if (Array.isArray(data)) {
        setLiveClasses(data.filter((c: any) => c.isLive));
        setUpcomingClasses(data.filter((c: any) => !c.isLive));
      }
    } catch (error) {
      console.error('Error fetching live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="relative bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 text-white pt-10 pb-8 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-[22px]">menu</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Live Classes</h1>
            <p className="text-xs text-white/60 mt-1 font-medium">Join interactive sessions</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-rounded text-[22px]">cast_for_education</span>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="glass rounded-2xl p-1.5 mb-6 shadow-card">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${activeTab === 'live'
                ? 'bg-white text-accent-500 shadow-elevated'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Now
              {liveClasses.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-500 text-[10px] font-bold">{liveClasses.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${activeTab === 'upcoming'
                ? 'bg-white text-primary-800 shadow-elevated'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="material-symbols-rounded text-[16px]">event</span>
              Upcoming
              {upcomingClasses.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 text-[10px] font-bold">{upcomingClasses.length}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'live' ? (
          liveClasses.length > 0 ? (
            <div className="space-y-3">
              {liveClasses.map((cls, idx) => (
                <div key={idx} className="card-premium overflow-hidden animate-fade-in-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <div className="flex">
                    <div className="w-1.5 bg-gradient-to-b from-accent-500 to-accent-600 rounded-l-3xl shrink-0"></div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-accent-500 uppercase tracking-wider">Live Now</span>
                          </div>
                          <h4 className="font-bold text-[15px] text-gray-900 leading-snug">{cls.title}</h4>
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-rounded text-[14px] text-primary-400">person</span>
                              {cls.instructor}
                            </span>
                            {cls.subject && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-rounded text-[14px] text-primary-400">book</span>
                                  {cls.subject}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <button className="btn-accent px-5 py-2.5 text-xs flex items-center gap-1.5 shrink-0 active:scale-[0.97]">
                          <span className="material-symbols-rounded text-[16px]">videocam</span>
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-premium p-10 text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-full bg-surface-200 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-5xl text-gray-300 animate-float">videocam_off</span>
              </div>
              <p className="text-sm font-semibold text-gray-500">No live classes right now</p>
              <p className="text-xs text-gray-400 mt-1.5">Check upcoming classes for schedule</p>
              <button
                onClick={() => setActiveTab('upcoming')}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 transition-all duration-200 active:scale-[0.97]"
              >
                View Upcoming
              </button>
            </div>
          )
        ) : (
          upcomingClasses.length > 0 ? (
            <div className="space-y-3">
              {upcomingClasses.map((cls, idx) => (
                <div key={idx} className="card-premium p-4 animate-fade-in-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[15px] text-gray-900 leading-snug">{cls.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-rounded text-[14px] text-primary-400">person</span>
                          {cls.instructor}
                        </span>
                        {cls.subject && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-rounded text-[14px] text-primary-400">book</span>
                              {cls.subject}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl bg-primary-50 w-fit">
                        <span className="material-symbols-rounded text-[16px] text-primary-600">schedule</span>
                        <span className="text-[11px] font-semibold text-primary-700">{cls.scheduledAt || 'Coming Soon'}</span>
                      </div>
                    </div>
                    <button className="px-4 py-2.5 rounded-xl text-xs font-bold bg-surface-200 text-gray-600 flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97] hover:bg-surface-300">
                      <span className="material-symbols-rounded text-[16px]">notifications</span>
                      Remind
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-premium p-10 text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-full bg-surface-200 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-rounded text-5xl text-gray-300 animate-float">event</span>
              </div>
              <p className="text-sm font-semibold text-gray-500">No upcoming classes scheduled</p>
              <p className="text-xs text-gray-400 mt-1.5">New classes will appear here soon</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default LiveClasses;
