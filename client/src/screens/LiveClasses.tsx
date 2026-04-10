import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import LiveClassesCalendar from '../components/student/LiveClassesCalendar';
import { liveVideosAPI } from '../services/apiClient';
import { isLiveUrl, isYouTubeUrl, getEmbedUrl } from '../lib/utils';

// ─── Helper: resolve stream URL ────────────────────────────────────────────────
function resolveStreamUrl(lc: any): string {
  return lc.streamId || lc.videoUrl || lc.url || lc.meetingLink || lc.link || '';
}

// ─── Helper: compute effective status client-side ──────────────────────────────
function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || 'upcoming').toLowerCase();
  if (['ended', 'completed', 'inactive'].includes(raw)) return 'ended';
  if (raw === 'live') return 'live';
  return 'upcoming';
}

function useLiveCountdown(scheduledTimeStr: string | undefined) {
  const getSecsLeft = () => {
    if (!scheduledTimeStr) return null;
    const t = new Date(scheduledTimeStr.replace(' ', 'T'));
    if (isNaN(t.getTime())) return null;
    return Math.floor((t.getTime() - Date.now()) / 1000);
  };
  const [secs, setSecs] = useState<number | null>(getSecsLeft);
  useEffect(() => {
    setSecs(getSecsLeft());
    const id = setInterval(() => setSecs(getSecsLeft()), 1000);
    return () => clearInterval(id);
  }, [scheduledTimeStr]);
  return secs;
}

const CountdownText = ({ scheduledTime }: { scheduledTime: string }) => {
  const secs = useLiveCountdown(scheduledTime);
  if (secs === null || secs <= 0) return <span>Scheduled</span>;
  const FIVE = 5 * 60;
  if (secs > FIVE) {
    const d = new Date(scheduledTime);
    return <span>{isNaN(d.getTime()) ? 'Soon' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
  }
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span className="text-orange-500 font-bold animate-pulse">{mm}:{ss}</span>;
};

const LiveClasses: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [tick, setTick] = useState(0);

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
    if (student) fetchAllLiveClasses();
  }, [student]);



  const studentId = student?.id || student?._id || student?.studentId;

  // Smart join: All YouTube videos (live + normal) → custom player, others → new tab
  const smartJoin = useCallback((lc: any) => {
    if (computeEffectiveStatus(lc) !== 'live') return;
    const url = resolveStreamUrl(lc);
    if (!url) { navigate('/live-classes'); return; }
    
    // Check if it's a YouTube URL
    const isYT = url.includes('youtube.com') || url.includes('youtu.be');
    
    if (isYT) {
      const videoId = lc.id || lc._id || 'live';
      navigate(`/watch/${videoId}`, {
        state: {
          video: {
            ...lc,
            title: lc.title || lc.name || 'Live Class',
            embedUrl: getEmbedUrl(url)
          }
        }
      });
    } else {
      // Fallback for Zoom, Google Meet, etc.
      window.open(url, '_blank');
    }
  }, [navigate]);

  // For the calendar component's onJoinLive prop
  const handleJoinLive = useCallback((cls: any) => smartJoin(cls), [smartJoin]);

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

      {liveClasses.length > 0 && (() => {
        const ongoing = liveClasses.filter(lc => computeEffectiveStatus(lc) === 'live');
        const upcoming = liveClasses.filter(lc => computeEffectiveStatus(lc) === 'upcoming');

        if (ongoing.length === 0 && upcoming.length === 0) return null;

        return (
          <div className="px-4 space-y-6">
            {ongoing.length > 0 && (
              <section className="animate-fade-in-up">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-2 h-7 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.3)]"></div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Live Now</h2>
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span>
                      Ongoing Sessions
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {ongoing.map((lc: any, i: number) => (
                    <div key={lc._id || lc.id || i} className="card-premium p-4 rounded-[2rem] border-2 border-red-50 bg-red-50/20 shadow-xl shadow-red-500/5 group relative overflow-hidden">
                      <div className="flex gap-4 items-center relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                          <span className="material-symbols-rounded text-white text-2xl">sensors</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate mb-1">{lc.title || lc.name}</h4>
                          <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-base text-red-400">person</span>
                            {lc.teacherName || lc.instructor}
                          </span>
                        </div>
                        <button
                          onClick={() => smartJoin(lc)}
                          className="bg-red-600 text-white text-xs px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-[0.97]"
                        >
                          <span className="material-symbols-rounded text-lg">videocam</span>
                          JOIN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Upcoming</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scheduled Sessions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {upcoming.map((lc: any, i: number) => {
                    const scheduledISO = lc.scheduledTime ? lc.scheduledTime.replace(' ', 'T') : (lc.startTime || '');
                    return (
                      <div key={lc._id || lc.id || i} className="card-premium p-4 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                          <span className="material-symbols-rounded text-gray-400 text-xl">calendar_today</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-800 truncate mb-1">{lc.title || lc.name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                              <span className="material-symbols-rounded text-sm">person</span>
                              {lc.teacherName || lc.instructor}
                            </span>
                            <span className="text-[11px] text-blue-600 font-black uppercase tracking-widest">
                               {scheduledISO ? <CountdownText scheduledTime={scheduledISO} /> : 'Soon'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-blue-50 text-blue-600 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-blue-100">
                          Scheduled
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        );
      })()}

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
      </div>
    </div>
  );
};

export default LiveClasses;
