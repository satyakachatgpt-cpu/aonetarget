import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLiveUrl } from '../../lib/utils';

interface LiveClass {
  id: string;
  courseId: string;
  courseName?: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  instructor: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'upcoming' | 'ended' | 'recorded';
  publishOn?: string;
  batchId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  streamId?: string;
  videoUrl?: string;
  url?: string;
  pdf1?: string;
  pdf2?: string;
  studyMaterial?: string;
}


interface Props {
  studentId: string;
  courseId?: string;
  batchId?: string;
  onJoinLive?: (cls: any) => void;
}

const API_BASE_URL = '/api';

// ─── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown(targetDateStr: string | undefined) {
  const getSecondsLeft = useCallback(() => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr.replace(' ', 'T'));
    if (isNaN(target.getTime())) return null;
    return Math.floor((target.getTime() - Date.now()) / 1000);
  }, [targetDateStr]);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(getSecondsLeft);

  useEffect(() => {
    setSecondsLeft(getSecondsLeft());
    const timer = setInterval(() => {
      const s = getSecondsLeft();
      setSecondsLeft(s);
    }, 1000);
    return () => clearInterval(timer);
  }, [getSecondsLeft]);

  return secondsLeft;
}

// ─── Countdown Button (Disabled state for upcoming) ──────────────────────────
const CountdownBadge: React.FC<{ scheduledTime: string }> = ({ scheduledTime }) => {
  const secs = useCountdown(scheduledTime);
  if (secs === null || secs <= 0) return null;

  const FIVE_MINUTES = 5 * 60;
  const isClose = secs <= FIVE_MINUTES;

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <button
      disabled
      className="bg-red-200 text-white/80 text-[13px] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed shadow-none border border-red-50/20"
    >
      <span className="material-symbols-rounded text-[18px]">
        {isClose ? 'timer' : 'videocam'}
      </span>
      {isClose ? `${mm}:${ss}` : 'UPCOMING'}
    </button>
  );
};

// ─── Smart join handler ───────────────────────────────────────────────────────
function resolveStreamUrl(cls: any): string {
  return cls.streamId || cls.videoUrl || cls.url || cls.meetingLink || cls.link || cls.streamUrl || '';
}


function handleSmartJoin(cls: any, onJoinLive?: (cls: any) => void, navigate?: any) {
  const currentStatus = computeStatus(cls);
  if (currentStatus !== 'live' && currentStatus !== 'recorded') return;
  const url = resolveStreamUrl(cls);
  if (!url) return;

  const isYT = url.includes('youtube.com') || url.includes('youtu.be');
  const isRecordedNow = currentStatus === 'recorded';

  if (isYT && navigate) {
    const videoId = cls.id || cls._id || 'live';
    navigate(`/watch/${videoId}`, {
      state: {
        streamUrl: url,
        title: cls.title,
        id: videoId,
        platform: 'youtube',
        isLive: !isRecordedNow
      }
    });
  } else if (onJoinLive) {
    // Normal video or other player → delegate to parent
    onJoinLive({ ...cls, url });
  } else {
    window.open(url, '_blank');
  }
}

// ─── Helper: get effective scheduled time ─────────────────────────────────────
function getScheduledISO(cls: any): string {
  if (cls.scheduledTime) return cls.scheduledTime.replace(' ', 'T');
  if (cls.startTime) return cls.startTime;
  if (cls.publishOn) return cls.publishOn;
  return '';
}

// ─── Helper: compute live status client-side ──────────────────────────────────
function computeStatus(cls: any): 'live' | 'upcoming' | 'ended' | 'scheduled' | 'recorded' {
  const raw = (cls.streamStatus || cls.status || cls.liveStatus || cls.eventStatus || 'upcoming').toLowerCase();
  
  const isExplicitlyEnded = ['ended', 'completed', 'inactive', 'disable', 'finished'].includes(raw);
  const isImplicitlyEnded = (cls.isLive === false && (cls.endedAt || cls.endTime) && raw !== 'recorded') || 
                           (cls.contentType === 'video');
  const hasEndedLabel = cls.statusLabel === 'EVENT ENDED' || cls.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) return 'ended';
  if (raw === 'recorded') return 'recorded';
  if (raw === 'live' || cls.isLive === true) return 'live';

  // --- Schedule-Aware logic ---
  const scheduledAt = cls.scheduledAt || cls.scheduledTime || cls.startTime || cls.publishOn || '';
  if (scheduledAt) {
    const scheduledTime = new Date(scheduledAt.replace(' ', 'T')).getTime();
    if (scheduledTime > Date.now()) {
      return 'upcoming';
    } else if (!isExplicitlyEnded) {
       return 'live'; // Promote to live if time passed and not explicitly ended
    }
  }

  return 'upcoming';
}



// ─── Main Component ───────────────────────────────────────────────────────────
const LiveClassesCalendar: React.FC<Props> = ({ studentId, courseId, batchId, onJoinLive }) => {
  const navigate = useNavigate();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'upcoming'>('upcoming');
  // For auto-refresh of statuses every 30s
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadLiveClasses();
  }, [studentId, courseId]);



  const loadLiveClasses = async () => {
    try {
      let url = '';
      if (courseId) {
        url = `${API_BASE_URL}/courses/${courseId}/live-classes${batchId ? `?batchId=${batchId}` : ''}`;
      } else {
        url = `${API_BASE_URL}/students/${studentId}/live-classes${batchId ? `?batchId=${batchId}` : ''}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let classes = Array.isArray(data) ? data : [];
        if (batchId) {
          classes = classes.filter(c => !c.batchId || c.batchId === batchId);
        }
        setLiveClasses(classes);
      }
    } catch (error) {
      console.error('Error loading live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getClassesForDate = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return liveClasses.filter(c => c.date === dateStr);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    let hStr = '';
    let mStr = '';
    if (time.includes('T')) {
      const date = new Date(time);
      if (isNaN(date.getTime())) return time;
      hStr = String(date.getHours());
      mStr = String(date.getMinutes()).padStart(2, '0');
    } else if (time.includes(':')) {
      const parts = time.split(':');
      hStr = parts[0];
      mStr = parts[1];
    } else {
      return time;
    }
    const h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${mStr} ${ampm}`;
  };

  const getUpcomingClasses = () => {
    return liveClasses
      .map(c => {
        const normalizedDate = c.scheduledDate || c.date || (c.publishOn ? c.publishOn.split('T')[0] : '');
        const normalizedTime = c.scheduledTime || c.startTime || (c.publishOn ? c.publishOn.split('T')[1]?.substring(0, 5) : '');
        return { ...c, date: normalizedDate, startTime: normalizedTime };
      })
      .filter(c => {
        const effectiveStatus = computeStatus(c);
        // Only show Live, Upcoming or Recorded
        return effectiveStatus === 'live' || effectiveStatus === 'upcoming' || effectiveStatus === 'recorded';
      })
      .sort((a, b) => {
        const timeA = new Date(getScheduledISO(a) || a.date || 0).getTime();
        const timeB = new Date(getScheduledISO(b) || b.date || 0).getTime();
        return timeA - timeB;
      });
  };


  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-800">Live Classes</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'upcoming' ? 'bg-white shadow-sm' : ''}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'upcoming' ? (
        <div className="space-y-3">
          {getUpcomingClasses().length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <span className="material-icons-outlined text-4xl block mb-2">event_available</span>
              <p className="font-medium">No upcoming classes scheduled</p>
            </div>
          ) : (
            getUpcomingClasses().map((cls, i) => {
              // Compute live status client-side (ticked every 30s)
              const effectiveStatus = computeStatus(cls);
              const isLiveNow = effectiveStatus === 'live';
              const isRecorded = effectiveStatus === 'recorded';
              const isEnded = effectiveStatus === 'ended';
              const scheduledISO = getScheduledISO(cls);
              const streamUrl = resolveStreamUrl(cls);

              return (
                <div key={cls.id || i} className="card-premium p-5 rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300 group shadow-sm bg-white hover:shadow-xl">
                  <div className="flex gap-4 items-center">
                    <div className={`w-14 h-14 bg-gradient-to-br ${isEnded ? 'from-gray-400 to-gray-500' : isRecorded ? 'from-blue-500 to-blue-600' : isLiveNow ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'} rounded-2xl flex items-center justify-center shrink-0 relative shadow-lg`}>
                      <span className="material-symbols-rounded text-white text-[28px]">{isLiveNow ? 'sensors' : isRecorded ? 'play_circle' : 'calendar_today'}</span>
                      {isLiveNow && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse shadow-sm"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-[#1a1c1e] text-[17px] tracking-tight truncate group-hover:text-primary-600 transition-colors uppercase">{cls.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-[12px] text-gray-500 font-bold flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-[18px] text-primary-400">person</span>
                          {cls.instructor || 'Instructor'}
                        </span>
                        <span className="text-[12px] text-gray-500 font-black flex items-center gap-1.5">
                          <span className="material-symbols-rounded text-[18px] text-primary-500">schedule</span>
                          {isLiveNow ? 'Live Now' : isRecorded ? 'Recorded' : isEnded ? 'Ended' : formatTime(cls.startTime) || 'Upcoming'}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0">
                      {isRecorded ? (
                        <button
                          onClick={() => handleSmartJoin(cls, onJoinLive, navigate)}
                          className="bg-blue-600 text-white text-[11px] px-5 py-2.5 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-[0.97]"
                        >
                          WATCH RECORDING
                        </button>
                      ) : isEnded ? (
                        <button
                          disabled
                          className="bg-gray-100 text-gray-400 text-[11px] px-6 py-2.5 rounded-xl font-black uppercase tracking-widest cursor-not-allowed border border-gray-200"
                        >
                          ENDED
                        </button>
                      ) : isLiveNow ? (
                        <button
                          onClick={() => handleSmartJoin(cls, onJoinLive, navigate)}
                          className="bg-red-600 text-white text-[13px] px-7 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-[0.97] uppercase tracking-widest"
                        >
                          <span className="material-symbols-rounded text-xl">videocam</span>
                          JOIN
                        </button>
                      ) : scheduledISO ? (
                        <CountdownBadge scheduledTime={scheduledISO} />
                      ) : (
                        <div className="bg-gray-50 text-gray-400 text-[11px] px-5 py-2.5 rounded-xl font-black uppercase tracking-widest border border-gray-100">
                          Upcoming
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments for Calendar List View */}
                  {(cls.pdf1 || cls.pdf2 || cls.studyMaterial) && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100/50">
                      {cls.pdf1 && (
                        <button
                          onClick={() => window.open(cls.pdf1, '_blank')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black hover:bg-red-100 transition-all uppercase tracking-widest border border-red-100/50"
                        >
                          <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                          PDF 1
                        </button>
                      )}
                      {cls.pdf2 && (
                        <button
                          onClick={() => window.open(cls.pdf2, '_blank')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black hover:bg-red-100 transition-all uppercase tracking-widest border border-red-100/50"
                        >
                          <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                          PDF 2
                        </button>
                      )}
                      {cls.studyMaterial && (
                        <button
                          onClick={() => window.open(cls.studyMaterial, '_blank')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-100 transition-all uppercase tracking-widest border border-blue-100/50"
                        >
                          <span className="material-symbols-rounded text-sm">auto_stories</span>
                          Material
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );

            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <h4 className="font-bold text-gray-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((day, idx) => {
                const classes = getClassesForDate(day || 0);
                const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                return (
                  <div
                    key={idx}
                    className={`min-h-[60px] border rounded-lg p-1 ${day ? 'bg-gray-50' : 'bg-gray-100/30'} ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}`}
                  >
                    {day && (
                      <>
                        <div className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>{day}</div>
                        {classes.map(cls => (
                          <div
                            key={cls.id}
                            className={`text-[9px] p-1 rounded mt-0.5 truncate cursor-pointer ${
                              computeStatus(cls) === 'live' ? 'bg-red-100 text-red-700 animate-pulse' :
                              computeStatus(cls) === 'ended' ? 'bg-gray-200 text-gray-500' :
                              'bg-blue-100 text-blue-700'
                            }`}
                            title={`${cls.title} - ${formatTime(cls.startTime)}`}
                            onClick={() => handleSmartJoin(cls, onJoinLive, navigate)}
                          >
                            {formatTime(cls.startTime)}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassesCalendar;
