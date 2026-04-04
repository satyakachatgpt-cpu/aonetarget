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
  scheduledDate?: string;
  scheduledTime?: string;
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
      if (response.ok) {
        const data = await response.json();
        
        // Client-side filtering as a fallback if API doesn't filter by batch
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
    // Handle full ISO strings or HH:MM format
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
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return liveClasses
      .map(c => {
        // Normalize properties
        const normalizedDate = c.scheduledDate || c.date || (c.publishOn ? c.publishOn.split('T')[0] : '');
        const normalizedTime = c.scheduledTime || c.startTime || (c.publishOn ? c.publishOn.split('T')[1]?.substring(0, 5) : '');
        return { ...c, date: normalizedDate, startTime: normalizedTime };
      })
      .filter(c => {
        // Show if date is today or in the future
        const isFutureOrToday = !c.date || c.date >= todayStr;
        // Don't show cancelled ones
        const isNotCancelled = c.status !== 'cancelled';
        // Show if it's live or upcoming/scheduled, or if it ended today
        const shouldShowStatus = ['live', 'upcoming', 'scheduled', 'ended', 'completed'].includes(c.status);
        
        return isFutureOrToday && isNotCancelled && shouldShowStatus;
      })
      .sort((a, b) => {
        // Sort by date first, then by time
        if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
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
            getUpcomingClasses().map((cls, i) => (
              <div key={cls.id || i} className="card-premium p-4 rounded-[24px] border border-gray-100 flex gap-4 items-center hover:-translate-y-1 transition-all duration-300 group shadow-sm bg-white hover:shadow-card">
                <div className={`w-14 h-14 bg-gradient-to-br ${(cls.status === 'ended' || cls.status === 'completed') ? 'from-gray-400 to-gray-500' : 'from-red-500 to-red-600'} rounded-2xl flex items-center justify-center shrink-0 relative shadow-lg ${(cls.status === 'ended' || cls.status === 'completed') ? 'shadow-gray-200' : 'shadow-red-200'}`}>
                  <span className="material-symbols-rounded text-white text-[28px]">sensors</span>
                  {cls.status === 'live' && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse shadow-sm"></span>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#1a1c1e] text-[16px] tracking-tight truncate group-hover:text-red-600 transition-colors">{cls.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[12px] text-gray-500 font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      {cls.instructor || 'Instructor'}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                    <span className="text-[12px] text-gray-500 font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      {cls.status === 'live' ? 'Live Now' : (cls.status === 'ended' || cls.status === 'completed') ? 'Ended' : formatTime(cls.startTime) || 'Upcoming'}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0">
                  {cls.status === 'live' ? (
                    <button
                      onClick={() => onJoinLive && onJoinLive(cls)}
                      className="bg-red-600 hover:bg-red-700 text-white text-[13px] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-100"
                    >
                      <span className="material-symbols-rounded text-[18px]">videocam</span>
                      Join
                    </button>
                  ) : (
                    <div className={`bg-gray-50 text-gray-400 text-[11px] px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest border border-gray-100`}>
                      {(cls.status === 'ended' || cls.status === 'completed') ? 'Ended' : 'Upcoming'}
                    </div>
                  )}
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
