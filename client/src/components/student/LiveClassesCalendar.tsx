import React, { useState, useEffect } from 'react';

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
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'upcoming' | 'ended';
  publishOn?: string;
  batchId?: string;
}

interface Props {
  studentId: string;
  courseId?: string;
  batchId?: string;
  onJoinLive?: (cls: any) => void;
}

const API_BASE_URL = '/api';

const LiveClassesCalendar: React.FC<Props> = ({ studentId, courseId, batchId, onJoinLive }) => {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'upcoming'>('upcoming');

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
      const data = await response.json();
      
      // Client-side filtering as a fallback if API doesn't filter by batch
      let classes = Array.isArray(data) ? data : [];
      if (batchId) {
        classes = classes.filter(c => !c.batchId || c.batchId === batchId);
      }
      setLiveClasses(classes);
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
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getClassesForDate = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return liveClasses.filter(c => c.date === dateStr);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const getUpcomingClasses = () => {
    // Get today's date string in YYYY-MM-DD format based on local time
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return liveClasses
      .filter(c => {
        // Show if date is today or in the future
        const isFutureOrToday = c.date >= todayStr;
        // Don't show cancelled ones
        const isNotCancelled = c.status !== 'cancelled';
        // Show if it's live or upcoming/scheduled, or if it ended today
        const shouldShowStatus = ['live', 'upcoming', 'scheduled', 'ended', 'completed'].includes(c.status);
        
        return isFutureOrToday && isNotCancelled && shouldShowStatus;
      })
      .sort((a, b) => {
        // Sort by date first, then by time
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
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
            getUpcomingClasses().map(cls => (
              <div key={cls.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                      cls.status === 'live' ? 'bg-red-500 text-white' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <span className="text-lg font-bold leading-none">{new Date(cls.date).getDate()}</span>
                      <span className="text-[10px] font-medium">{monthNames[new Date(cls.date).getMonth()].slice(0, 3)}</span>
                    </div>
                    <div>
                      <h4 className="font-ex-bold text-[#1a1c1e] text-[16px] tracking-tight">{cls.title}</h4>
                      <p className="text-[13px] text-gray-500 font-bold mt-1.5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        {cls.instructor || 'Instructor Not Assigned'}
                        {(cls.status === 'upcoming' || cls.status === 'scheduled') && (
                           <span className="flex items-center gap-1.5 ml-2 text-blue-600">
                             <span className="material-symbols-outlined text-[18px]">schedule</span>
                             Starts at {formatTime(cls.startTime)}
                           </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {cls.status === 'live' && (
                      <span className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-[10px] text-[11px] font-[900] uppercase tracking-widest flex items-center gap-2 border border-red-100 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        LIVE NOW
                      </span>
                    )}
                    {cls.status === 'ended' && (
                      <span className="px-3.5 py-1.5 bg-gray-50 text-gray-500 rounded-[10px] text-[11px] font-[900] uppercase tracking-widest flex items-center gap-2 border border-gray-100">
                        SESSION ENDED
                      </span>
                    )}

                    {cls.status === 'live' ? (
                      <button
                        onClick={() => onJoinLive && onJoinLive(cls)}
                        className="h-11 px-6 bg-[#1a1c1e] text-white rounded-[12px] text-[13px] font-black uppercase tracking-wider flex items-center gap-2.5 shadow-lg shadow-black/10 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">sensors</span>
                        Join Live
                      </button>
                    ) : (cls.status === 'upcoming' || cls.status === 'scheduled') ? (
                      <button
                        disabled
                        className="h-11 px-6 bg-gray-100 text-gray-400 rounded-[12px] text-[13px] font-black uppercase tracking-wider flex items-center gap-2.5 cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                        Not Started Yet
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
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
                const hasLive = classes.some(c => c.status === 'live');
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
                            className={`text-[9px] p-1 rounded mt-0.5 truncate ${
                              cls.status === 'live' ? 'bg-red-100 text-red-700 animate-pulse' :
                              cls.status === 'completed' ? 'bg-gray-200 text-gray-500' :
                              'bg-blue-100 text-blue-700'
                            }`}
                            title={`${cls.title} - ${formatTime(cls.startTime)}`}
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
