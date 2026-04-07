import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import LiveClassesCalendar from '../components/student/LiveClassesCalendar';
import { liveVideosAPI } from '../services/apiClient';
import { isLiveUrl } from '../lib/utils';

// ─── Helper: resolve stream URL ────────────────────────────────────────────────
function resolveStreamUrl(lc: any): string {
  return lc.streamId || lc.videoUrl || lc.url || lc.meetingLink || lc.link || '';
}

// ─── Helper: compute effective status client-side ──────────────────────────────
function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = lc.status as string;
  if (raw === 'ended' || raw === 'completed') return 'ended';
  const isoStr = lc.scheduledTime ? lc.scheduledTime.replace(' ', 'T') : (lc.startTime || '');
  if (!isoStr) return raw === 'live' ? 'live' : 'upcoming';
  const scheduled = new Date(isoStr);
  if (isNaN(scheduled.getTime())) return raw === 'live' ? 'live' : 'upcoming';
  if (scheduled <= new Date()) return 'live';
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
  if (secs === null || secs <= 0) return <span>Live Now</span>;
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

  // Tick every 30s to trigger re-render and auto-promote upcoming → live client-side
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const studentId = student?.id || student?._id || student?.studentId;

  // Smart join: live YouTube URL → new tab, normal video → custom player / fallback open
  const smartJoin = useCallback((lc: any) => {
    const url = resolveStreamUrl(lc);
    if (!url) return;
    if (isLiveUrl(url)) {
      window.open(url, '_blank');
    } else {
      // Navigate to watch page if possible, otherwise open URL
      const vid = lc.id || lc._id;
      if (vid) {
        window.open(url, '_blank');
      } else {
        window.open(url, '_blank');
      }
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
              const effectiveStatus = computeEffectiveStatus(lc);
              const isEnded = effectiveStatus === 'ended';
              const isLiveNow = effectiveStatus === 'live';
              const isUpcoming = effectiveStatus === 'upcoming';
              const streamUrl = resolveStreamUrl(lc);
              const scheduledISO = lc.scheduledTime ? lc.scheduledTime.replace(' ', 'T') : (lc.startTime || '');

              return (
                <div key={lc._id || lc.id || i} className="card-premium p-3 rounded-2xl border border-gray-100/50 flex gap-3 items-center hover:-translate-y-0.5 transition-all duration-200 group">
                  <div className={`w-12 h-12 bg-gradient-to-br ${isEnded ? 'from-gray-400 to-gray-500' : isLiveNow ? 'from-accent to-accent-600' : 'from-orange-400 to-red-500'} rounded-2xl flex items-center justify-center shrink-0 relative shadow-button`}>
                    <span className="material-symbols-rounded text-white text-2xl">sensors</span>
                    {isLiveNow && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
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
                        {isEnded ? 'Ended' : isLiveNow ? 'Live Now' : (
                          scheduledISO ? <CountdownText scheduledTime={scheduledISO} /> : 'Upcoming'
                        )}
                      </span>
                    </div>
                  </div>

                  {isEnded ? (
                    <div className="bg-gray-100 text-gray-400 text-[10px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider shrink-0">
                      Ended
                    </div>
                  ) : isLiveNow ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); smartJoin(lc); }}
                      className="btn-accent text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-[0.97] transition-all duration-200 shrink-0 shadow-button hover:shadow-lg"
                    >
                      <span className="material-symbols-rounded text-[14px]">
                        {streamUrl && isLiveUrl(streamUrl) ? 'open_in_new' : 'videocam'}
                      </span>
                      Join
                    </button>
                  ) : (
                    <button
                      disabled
                      className="bg-orange-50 text-orange-500/60 text-[10px] px-3 py-2.5 rounded-xl border border-orange-100 shrink-0 font-bold flex items-center gap-1.5 cursor-not-allowed whitespace-nowrap"
                    >
                      <span className="material-symbols-rounded text-[14px] animate-pulse">timer</span>
                      <CountdownText scheduledTime={scheduledISO} />
                    </button>
                  )}
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
      </div>
    </div>
  );
};

export default LiveClasses;
