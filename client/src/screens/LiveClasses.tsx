import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { liveVideosAPI } from '../services/apiClient';
import { isLiveUrl, isYouTubeUrl, getEmbedUrl } from '../lib/utils';

// ─── Helper: resolve stream URL ────────────────────────────────────────────────
function resolveStreamUrl(lc: any): string {
  return lc.streamId || lc.videoUrl || lc.url || lc.meetingLink || lc.link || '';
}

// ─── Helper: compute effective status client-side ──────────────────────────────
function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || lc.liveStatus || lc.eventStatus || 'upcoming').toLowerCase();
  
  const isExplicitlyEnded = ['ended', 'completed', 'inactive', 'disable', 'finished'].includes(raw);
  const isImplicitlyEnded = (lc.isLive === false && (lc.endedAt || lc.endTime)) || 
                           (lc.type === 'recorded' || lc.contentType === 'recorded' || lc.contentType === 'video');
  const hasEndedLabel = lc.statusLabel === 'EVENT ENDED' || lc.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) return 'ended';
  if (raw === 'live' || lc.isLive === true) return 'live';
  return 'upcoming';
}

// ─── Countdown hook: returns seconds left (null = invalid/no date) ─────────────
function useSecsLeft(scheduledStr: string | undefined): number | null {
  const calc = () => {
    if (!scheduledStr) return null;
    const t = new Date(scheduledStr.replace(' ', 'T'));
    if (isNaN(t.getTime())) return null;
    return Math.floor((t.getTime() - Date.now()) / 1000);
  };
  const [secs, setSecs] = useState<number | null>(calc);
  useEffect(() => {
    setSecs(calc());
    const id = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(id);
  }, [scheduledStr]);
  return secs;
}

// ─── Badge + countdown block rendered on the RIGHT of each upcoming card ────────
const UpcomingCountdown = ({ scheduledStr }: { scheduledStr: string }) => {
  const secs = useSecsLeft(scheduledStr);

  // No valid date → just show static badge
  if (secs === null) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="bg-blue-50 text-blue-600 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-blue-100">
          Scheduled
        </div>
      </div>
    );
  }

  // Countdown expired → Live Now state
  if (secs <= 0) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-red-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Live Now
        </div>
      </div>
    );
  }

  // Format countdown text
  let countdownLabel: string;
  if (secs < 60) {
    countdownLabel = 'Starting soon';
  } else if (secs < 3600) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    countdownLabel = `Starts in ${m}m ${String(s).padStart(2, '0')}s`;
  } else {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    countdownLabel = `Starts in ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <div className="bg-blue-50 text-blue-600 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest border border-blue-100">
        Scheduled
      </div>
      <span className={`text-xs font-medium ${secs < 60 ? 'text-orange-500 animate-pulse' : 'text-blue-600'}`}>
        {countdownLabel}
      </span>
    </div>
  );
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
                <div className="grid grid-cols-1 gap-4">
                  {ongoing.map((lc: any, i: number) => (
                    <div key={lc._id || lc.id || i} className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-red-100/50 to-transparent shadow-xl transition-all duration-500 hover:shadow-red-500/10 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl"></div>
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-700"></div>
                      
                      <div className="relative z-10 p-3 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-gradient-to-tr from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/25 relative overflow-hidden group-hover:scale-110 transition-transform">
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          <span className="material-symbols-rounded text-white text-2xl relative z-10">sensors</span>
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-gray-800 truncate tracking-tight">{lc.title || lc.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 bg-rose-500/10 backdrop-blur-md text-rose-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-rose-200/50 shadow-sm">
                               <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                               LIVE
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => smartJoin(lc)}
                          className="relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 text-white text-[13px] px-5 py-2.5 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20 active:scale-95 group/btn"
                        >
                          <div className="absolute inset-0 bg-black opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                          <span className="material-symbols-rounded text-lg">videocam</span>
                          JOIN
                        </button>
                      </div>

                      {(lc.pdf1 || lc.pdf2 || lc.studyMaterial) && (
                        <div className="flex flex-wrap gap-2 pt-4 mt-1 border-t border-red-100/50 relative z-10">
                          {lc.pdf1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(lc.pdf1)}&title=${encodeURIComponent('PDF 1')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-red-600 text-[10px] font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                            >
                              <span className="material-symbols-rounded text-base">picture_as_pdf</span>
                              PDF 1
                            </button>
                          )}
                          {lc.pdf2 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(lc.pdf2)}&title=${encodeURIComponent('PDF 2')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-red-600 text-[10px] font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                            >
                              <span className="material-symbols-rounded text-base">picture_as_pdf</span>
                              PDF 2
                            </button>
                          )}
                          {lc.studyMaterial && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(lc.studyMaterial)}&title=${encodeURIComponent('Study Material')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-600 text-[10px] font-black border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase tracking-widest"
                            >
                              <span className="material-symbols-rounded text-base">auto_stories</span>
                              Material
                            </button>
                          )}
                        </div>
                      )}
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
                <div className="grid grid-cols-1 gap-4">
                  {upcoming.map((lc: any, i: number) => {
                    const rawScheduled = lc.scheduledAt || lc.scheduledTime || lc.startTime || lc.date || '';
                    const scheduledISO = rawScheduled ? rawScheduled.replace(' ', 'T') : '';

                    const displayTime = (() => {
                      if (!scheduledISO) return '';
                      const d = new Date(scheduledISO);
                      if (isNaN(d.getTime())) return '';
                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })();

                    return (
                      <div key={lc._id || lc.id || i} className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-indigo-100/50 to-transparent shadow-sm transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl rounded-2xl"></div>
                        
                        <div className="relative z-10 p-3 flex gap-3 items-center">
                          <div className="w-12 h-12 bg-indigo-50/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                            <span className="material-symbols-rounded text-indigo-500 text-2xl">calendar_today</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base text-gray-800 truncate tracking-tight group-hover:text-indigo-600 transition-colors">{lc.title || lc.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1.5 bg-indigo-500/10 backdrop-blur-md text-indigo-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-200/50">
                                <span className="material-symbols-rounded text-[14px]">schedule</span>
                                {scheduledISO ? <UpcomingCountdown scheduledStr={scheduledISO} /> : 'Scheduled'}
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Upcoming</span>
                          </div>
                        </div>

                        {(lc.pdf1 || lc.pdf2 || lc.studyMaterial) && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                            {lc.pdf1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(lc.pdf1)}&title=${encodeURIComponent('PDF 1')}`, '_blank'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black border border-red-100 hover:bg-red-100 transition-all uppercase tracking-widest"
                              >
                                <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                                PDF 1
                              </button>
                            )}
                            {lc.studyMaterial && (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(lc.studyMaterial)}&title=${encodeURIComponent('Study Material')}`, '_blank'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black border border-indigo-100 hover:bg-indigo-100 transition-all uppercase tracking-widest"
                              >
                                <span className="material-symbols-rounded text-sm">auto_stories</span>
                                Material
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default LiveClasses;
