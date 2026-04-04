import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import LiveClassesCalendar from '../components/student/LiveClassesCalendar';
import { liveVideosAPI } from '../services/apiClient';

const LiveClasses: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [isClassesLoading, setIsClassesLoading] = useState(true);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
    } else {
      navigate('/student-login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchAllLiveClasses = async () => {
      const studentId = student?.id || student?._id || student?.studentId;
      if (!studentId) return;

      try {
        setIsClassesLoading(true);
        const data = await liveVideosAPI.getByStudentId(studentId);
        setLiveClasses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch live classes:', error);
      } finally {
        setIsClassesLoading(false);
      }
    };

    if (student) {
      fetchAllLiveClasses();
    }
  }, [student]);

  const studentId = student?.id || student?._id || student?.studentId;

  const handleJoinLive = (cls: any) => {
    const link = cls.meetingLink || cls.url || cls.videoUrl || cls.link;
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleJoinLiveClass = (lc: any) => {
    const link = lc.meetingLink || lc.url || lc.videoUrl || lc.link;
    if (link) {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white pt-10 pb-8 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-[22px]">arrow_back</span>
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


       {liveClasses.length > 0 && (
          <section className="px-4 mt-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-7 bg-gradient-to-b from-accent to-accent-600 rounded-full shadow-sm"></div>
                <div>
                  <h2 className="section-title">Live Classes</h2>
                  <p className="section-subtitle">Join upcoming sessions</p>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {liveClasses.slice(0, 4).map((lc: any, i: number) => {
                const isEnded = lc.status === 'ended' || lc.streamStatus === 'ended' || lc.isLive === false;
                return (
                  <div key={lc._id || lc.id || i} className="card-premium p-3 rounded-2xl border border-gray-100/50 flex gap-3 items-center hover:-translate-y-0.5 transition-all duration-200 group">
                    <div className={`w-12 h-12 bg-gradient-to-br ${isEnded ? 'from-gray-400 to-gray-500' : 'from-accent to-accent-600'} rounded-2xl flex items-center justify-center shrink-0 relative shadow-button`}>
                      <span className="material-symbols-rounded text-white text-2xl">sensors</span>
                      {!isEnded && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-800 truncate">{lc.title || lc.name || 'Live Class'}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span className="material-symbols-rounded text-[12px]">person</span>
                          {lc.teacherName || lc.instructor || 'Instructor'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span className="material-symbols-rounded text-[12px]">schedule</span>
                          {(() => {
                            if (lc.scheduledTime && lc.scheduledDate) {
                              try {
                                const dtStr = `${lc.scheduledDate}T${lc.scheduledTime}:00`;
                                const dt = new Date(dtStr);
                                if (!isNaN(dt.getTime())) {
                                  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                              } catch (e) { }
                            }
                            return lc.scheduledTime || lc.time || 'Upcoming';
                          })()}
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={isEnded}
                      onClick={(e) => { e.stopPropagation(); if (!isEnded) handleJoinLiveClass(lc); }}
                      className={`${isEnded ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'btn-accent'} text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-[0.97] transition-all duration-200 shrink-0 shadow-button hover:shadow-lg`}
                    >
                      <span className="material-symbols-rounded text-[14px]">{isEnded ? 'event_busy' : 'videocam'}</span>
                      {isEnded ? 'Ended' : 'Join'}
                    </button>
                  </div>
                );
              })}

            </div>
          </section>
        )}

      <div className="p-4">
        <div className="bg-white rounded-[2rem] p-6 shadow-card border border-gray-100 min-h-[300px]">
          {studentId ? (
             <LiveClassesCalendar studentId={studentId} onJoinLive={handleJoinLive} />
          ) : (
            <div className="flex items-center justify-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>

        {/* Premium Live Classes List Section (Red Box Area) */}
       
      </div>
    </div>
  );
};

export default LiveClasses;
