import React, { useState, useEffect } from 'react';
import { liveVideosAPI, coursesAPI } from '../../services/apiClient';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  courseId: string;
  courseName?: string;
  instructor: string;
  streamUrl: string;
  platform: 'youtube' | 'zoom' | 'meet' | 'other';
  thumbnailUrl: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewers?: number;
  notifyStudents: boolean;
  isRecurring: boolean;
  recurringDays?: string[];
  createdAt: string;
}

interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const LiveVideos: React.FC<Props> = ({ showToast }) => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    courseId: string;
    instructor: string;
    streamUrl: string;
    platform: 'youtube' | 'zoom' | 'meet' | 'other';
    thumbnailUrl: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: number;
    notifyStudents: boolean;
    isRecurring: boolean;
    recurringDays: string[];
  }>({
    title: '',
    description: '',
    courseId: '',
    instructor: '',
    streamUrl: '',
    platform: 'youtube',
    thumbnailUrl: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    notifyStudents: true,
    isRecurring: false,
    recurringDays: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, coursesData] = await Promise.all([
        liveVideosAPI.getAll(),
        coursesAPI.getAll()
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      instructor: '',
      streamUrl: '',
      platform: 'youtube',
      thumbnailUrl: '',
      scheduledDate: '',
      scheduledTime: '',
      duration: 60,
      notifyStudents: true,
      isRecurring: false,
      recurringDays: []
    });
    setEditingSession(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.courseId || !formData.scheduledDate || !formData.scheduledTime) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const course = courses.find(c => (c._id || c.id) === formData.courseId);
      const sessionData: LiveSession = {
        id: editingSession?.id || `live_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        courseId: formData.courseId,
        courseName: course?.name || course?.title || '',
        instructor: formData.instructor,
        streamUrl: formData.streamUrl,
        platform: formData.platform,
        thumbnailUrl: formData.thumbnailUrl,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        status: 'scheduled',
        viewers: 0,
        notifyStudents: formData.notifyStudents,
        isRecurring: formData.isRecurring,
        recurringDays: formData.recurringDays,
        createdAt: editingSession?.createdAt || new Date().toISOString()
      };

      if (editingSession) {
        await liveVideosAPI.update(editingSession.id, sessionData);
        showToast('Live session updated successfully!');
      } else {
        await liveVideosAPI.create(sessionData);
        showToast('Live session scheduled successfully!');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      showToast('Failed to save session', 'error');
    }
  };

  const handleEdit = (session: LiveSession) => {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description,
      courseId: session.courseId,
      instructor: session.instructor,
      streamUrl: session.streamUrl,
      platform: session.platform,
      thumbnailUrl: session.thumbnailUrl,
      scheduledDate: session.scheduledDate,
      scheduledTime: session.scheduledTime,
      duration: session.duration,
      notifyStudents: session.notifyStudents,
      isRecurring: session.isRecurring,
      recurringDays: session.recurringDays || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this live session?')) {
      try {
        await liveVideosAPI.delete(id);
        showToast('Session deleted successfully!');
        loadData();
      } catch (error) {
        showToast('Failed to delete session', 'error');
      }
    }
  };

  const updateStatus = async (session: LiveSession, newStatus: LiveSession['status']) => {
    try {
      await liveVideosAPI.update(session.id, { ...session, status: newStatus });
      showToast(`Session ${newStatus === 'live' ? 'is now LIVE!' : 'status updated'}`);
      loadData();
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white';
      case 'scheduled': return 'bg-amber-100 text-amber-700';
      case 'ended': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'smart_display';
      case 'zoom': return 'videocam';
      case 'meet': return 'duo';
      default: return 'live_tv';
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (filterCourse !== 'all' && s.courseId !== filterCourse) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = s.title.toLowerCase().includes(query);
      const matchesInstructor = s.instructor?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesInstructor) return false;
    }

    return true;
  });

  const upcomingSessions = filteredSessions.filter(s => s.status === 'scheduled').sort((a, b) =>
    new Date(`${a.scheduledDate}T${a.scheduledTime}`).getTime() - new Date(`${b.scheduledDate}T${b.scheduledTime}`).getTime()
  );

  const liveSessions = filteredSessions.filter(s => s.status === 'live');
  const pastSessions = filteredSessions.filter(s => s.status === 'ended' || s.status === 'cancelled');

  const getCalendarDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredSessions.filter(s => s.scheduledDate === dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-3xl p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="material-icons-outlined text-3xl">live_tv</span>
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-wider">Live Sessions</h3>
              <p className="text-white/80 text-sm mt-1">Schedule and manage live classes for courses</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-white text-red-600 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg tracking-wider flex items-center gap-2 hover:bg-red-50 transition-all"
          >
            <span className="material-icons-outlined text-lg">add_circle</span>
            Schedule New Session
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-red-500 text-xl">sensors</span>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{liveSessions.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Now</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-amber-500 text-xl">schedule</span>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{upcomingSessions.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-green-500 text-xl">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{pastSessions.filter(s => s.status === 'ended').length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-purple-500 text-xl">school</span>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-800">{courses.length}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-icons-outlined text-gray-400 text-sm">filter_list</span>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name || c.title}</option>
                ))}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="all">All Status</option>
              <option value="live">Live Now</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="relative">
              <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Search by title or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-bold outline-none w-48 focus:border-red-300"
              />
            </div>
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              <span className="material-icons-outlined text-sm">view_list</span>
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              <span className="material-icons-outlined text-sm">calendar_month</span>
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-icons-outlined text-red-500">calendar_today</span>
            Next 7 Days Schedule
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {getCalendarDays().map((date, idx) => {
              const daySessions = getSessionsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={idx} className={`rounded-xl p-3 min-h-[120px] ${isToday ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="text-center mb-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{date.toLocaleDateString('en', { weekday: 'short' })}</p>
                    <p className={`text-lg font-black ${isToday ? 'text-red-600' : 'text-gray-700'}`}>{date.getDate()}</p>
                  </div>
                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map(s => (
                      <div key={s.id} className={`text-[9px] font-bold px-2 py-1 rounded-md truncate ${getStatusColor(s.status)}`}>
                        {s.scheduledTime} - {s.title.substring(0, 10)}...
                      </div>
                    ))}
                    {daySessions.length > 3 && (
                      <p className="text-[9px] text-gray-400 text-center">+{daySessions.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Now Section */}
      {liveSessions.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100">
          <h4 className="text-sm font-black text-red-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            Live Now
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveSessions.map(session => (
              <div key={session.id} className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-red-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {session.thumbnailUrl ? (
                      <img src={session.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-icons-outlined text-red-400 text-3xl">live_tv</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                      <span className="text-[10px] font-bold text-red-500">{session.viewers || 0} watching</span>
                    </div>
                    <h5 className="font-black text-gray-800 text-sm truncate">{session.title}</h5>
                    <p className="text-[10px] text-gray-500 mt-1">{session.courseName} • {session.instructor}</p>
                    <div className="flex gap-2 mt-3">
                      <a
                        href={session.streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1"
                      >
                        <span className="material-icons-outlined text-sm">play_arrow</span>
                        Watch Stream
                      </a>
                      <button
                        onClick={() => updateStatus(session, 'ended')}
                        className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black"
                      >
                        End Stream
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Upcoming Sessions */}
          <div>
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-icons-outlined text-amber-500">upcoming</span>
              Upcoming Sessions ({upcomingSessions.length})
            </h4>
            {upcomingSessions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
                <span className="material-icons-outlined text-6xl text-gray-200 mb-3">event_busy</span>
                <p className="text-sm font-bold text-gray-400">No upcoming sessions scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                        {session.thumbnailUrl ? (
                          <img src={session.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-icons-outlined text-gray-300 text-2xl">{getPlatformIcon(session.platform)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getStatusColor(session.status)}`}>
                            {session.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <span className="material-icons-outlined text-xs">{getPlatformIcon(session.platform)}</span>
                            {session.platform.charAt(0).toUpperCase() + session.platform.slice(1)}
                          </span>
                        </div>
                        <h5 className="font-black text-gray-800 text-sm">{session.title}</h5>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{session.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="material-icons-outlined text-xs">school</span>
                            {session.courseName}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-icons-outlined text-xs">person</span>
                            {session.instructor}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-icons-outlined text-xs">timer</span>
                            {session.duration} min
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-gray-800">{new Date(session.scheduledDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-lg font-black text-red-600">{session.scheduledTime}</p>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => updateStatus(session, 'live')}
                            className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                            title="Go Live"
                          >
                            <span className="material-icons-outlined text-sm">play_circle</span>
                          </button>
                          <button
                            onClick={() => handleEdit(session)}
                            className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200"
                            title="Edit"
                          >
                            <span className="material-icons-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            className="bg-gray-100 text-red-500 p-2 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <span className="material-icons-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">history</span>
                Past Sessions ({pastSessions.length})
              </h4>
              <div className="space-y-2">
                {pastSessions.slice(0, 5).map(session => (
                  <div key={session.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getStatusColor(session.status)}`}>
                        {session.status.toUpperCase()}
                      </span>
                      <div>
                        <h6 className="font-bold text-gray-700 text-xs">{session.title}</h6>
                        <p className="text-[10px] text-gray-400">{session.courseName} • {new Date(session.scheduledDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <span className="material-icons-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-red-600 to-rose-500 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="material-icons-outlined text-white text-2xl">{editingSession ? 'edit' : 'add_circle'}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wider">
                      {editingSession ? 'Edit Session' : 'Schedule Live Session'}
                    </h3>
                    <p className="text-white/70 text-xs mt-1">Fill in the details for your live class</p>
                  </div>
                </div>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-white/70 hover:text-white">
                  <span className="material-icons-outlined text-2xl">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Course Selection */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  <span className="material-icons-outlined text-xs align-middle mr-1">school</span>
                  Select Course *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name || c.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  <span className="material-icons-outlined text-xs align-middle mr-1">title</span>
                  Session Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Physics - Laws of Motion - Chapter 3"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  <span className="material-icons-outlined text-xs align-middle mr-1">description</span>
                  Description
                </label>
                <textarea
                  placeholder="Brief description of what will be covered..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none resize-none focus:border-red-300"
                  rows={3}
                />
              </div>

              {/* Instructor & Platform */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    <span className="material-icons-outlined text-xs align-middle mr-1">person</span>
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. Sharma"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    <span className="material-icons-outlined text-xs align-middle mr-1">videocam</span>
                    Platform
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  >
                    <option value="youtube">YouTube Live</option>
                    <option value="zoom">Zoom</option>
                    <option value="meet">Google Meet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Stream URL */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  <span className="material-icons-outlined text-xs align-middle mr-1">link</span>
                  Stream/Meeting URL
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/live/... or https://zoom.us/j/..."
                  value={formData.streamUrl}
                  onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                />
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  <span className="material-icons-outlined text-xs align-middle mr-1">image</span>
                  Thumbnail URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  />
                  {formData.thumbnailUrl && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden border border-gray-200">
                      <img src={formData.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    <span className="material-icons-outlined text-xs align-middle mr-1">calendar_today</span>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    <span className="material-icons-outlined text-xs align-middle mr-1">schedule</span>
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    <span className="material-icons-outlined text-xs align-middle mr-1">timer</span>
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="300"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-red-300"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyStudents}
                    onChange={(e) => setFormData({ ...formData, notifyStudents: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-700">Notify Students</p>
                    <p className="text-[10px] text-gray-400">Send push notification to enrolled students</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-700">Recurring Session</p>
                    <p className="text-[10px] text-gray-400">Repeat this session weekly</p>
                  </div>
                </label>
                {formData.isRecurring && (
                  <div className="flex flex-wrap gap-2 mt-2 pl-8">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const days = formData.recurringDays.includes(day)
                            ? formData.recurringDays.filter(d => d !== day)
                            : [...formData.recurringDays, day];
                          setFormData({ ...formData, recurringDays: days });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${formData.recurringDays.includes(day) ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-4">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-500 text-white py-4 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined text-lg">{editingSession ? 'save' : 'schedule'}</span>
                {editingSession ? 'Update Session' : 'Schedule Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveVideos;

