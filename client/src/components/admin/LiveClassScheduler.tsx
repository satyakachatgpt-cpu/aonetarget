import React, { useState, useEffect } from 'react';
import { coursesAPI } from '../../services/apiClient';

interface Course {
  id: string;
  name: string;
  title?: string;
}

interface LiveClass {
  id: string;
  courseId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  instructor: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  createdAt: string;
}

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const API_BASE_URL = '/api';

const LiveClassScheduler: React.FC<Props> = ({ showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    meetingLink: '',
    instructor: '',
    status: 'scheduled' as 'scheduled' | 'live' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadLiveClasses();
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveClasses = async () => {
    if (!selectedCourse) return;
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${selectedCourse.id}/live-classes`);
      const data = await response.json();
      setLiveClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading live classes:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.date || !formData.startTime || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const classData = {
        id: editingClass?.id || `live_${Date.now()}`,
        courseId: selectedCourse.id,
        ...formData,
        createdAt: editingClass?.createdAt || new Date().toISOString()
      };

      const method = editingClass ? 'PUT' : 'POST';
      const url = editingClass
        ? `${API_BASE_URL}/courses/${selectedCourse.id}/live-classes/${editingClass.id}`
        : `${API_BASE_URL}/courses/${selectedCourse.id}/live-classes`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      });

      if (response.ok) {
        showToast(editingClass ? 'Live class updated!' : 'Live class scheduled!');
        setShowModal(false);
        resetForm();
        loadLiveClasses();
      } else {
        showToast('Failed to save live class', 'error');
      }
    } catch (error) {
      showToast('Failed to save live class', 'error');
    }
  };

  const handleDelete = async (classId: string) => {
    if (!selectedCourse || !confirm('Delete this live class?')) return;
    try {
      await fetch(`${API_BASE_URL}/courses/${selectedCourse.id}/live-classes/${classId}`, { method: 'DELETE' });
      showToast('Live class deleted!');
      loadLiveClasses();
    } catch (error) {
      showToast('Failed to delete live class', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      meetingLink: '',
      instructor: '',
      status: 'scheduled'
    });
    setEditingClass(null);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-black text-navy uppercase tracking-widest">Live Class Scheduler</h3>
            <p className="text-xs text-gray-500 mt-1">Schedule live classes for your courses - students can view in calendar</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const course = courses.find(c => c.id === e.target.value);
                setSelectedCourse(course || null);
              }}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm min-w-[250px]"
            >
              <option value="">Select a course...</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name || course.title}</option>
              ))}
            </select>
            {selectedCourse && (
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="bg-navy text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <span className="material-icons-outlined">add</span>
                Schedule Class
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="material-icons-outlined">chevron_left</span>
              </button>
              <h3 className="font-black text-lg text-navy">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="material-icons-outlined">chevron_right</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}
              >
                <span className="material-icons-outlined text-base align-middle mr-1">calendar_month</span>
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <span className="material-icons-outlined text-base align-middle mr-1">list</span>
                List
              </button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <div className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-black text-gray-500 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((day, idx) => {
                  const classes = getClassesForDate(day || 0);
                  const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                  return (
                    <div
                      key={idx}
                      className={`min-h-[100px] border rounded-lg p-2 ${day ? 'bg-gray-50' : 'bg-gray-100/50'} ${isToday ? 'border-navy border-2' : 'border-gray-200'}`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-bold mb-1 ${isToday ? 'text-navy' : 'text-gray-600'}`}>{day}</div>
                          {classes.map(cls => (
                            <div
                              key={cls.id}
                              onClick={() => {
                                setEditingClass(cls);
                                setFormData({
                                  title: cls.title,
                                  description: cls.description || '',
                                  date: cls.date,
                                  startTime: cls.startTime,
                                  endTime: cls.endTime || '',
                                  meetingLink: cls.meetingLink || '',
                                  instructor: cls.instructor || '',
                                  status: cls.status
                                });
                                setShowModal(true);
                              }}
                              className={`text-[10px] p-1 rounded mb-1 cursor-pointer truncate ${
                                cls.status === 'live' ? 'bg-red-100 text-red-700' :
                                cls.status === 'completed' ? 'bg-green-100 text-green-700' :
                                cls.status === 'cancelled' ? 'bg-gray-200 text-gray-500' :
                                'bg-blue-100 text-blue-700'
                              }`}
                              title={`${cls.title} - ${formatTime(cls.startTime)}`}
                            >
                              <span className="font-bold">{formatTime(cls.startTime)}</span> {cls.title}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6">
              {liveClasses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="material-icons-outlined text-5xl block mb-2">event</span>
                  No live classes scheduled yet
                </div>
              ) : (
                <div className="space-y-3">
                  {liveClasses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(cls => (
                    <div key={cls.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                          cls.status === 'live' ? 'bg-red-100 text-red-600' :
                          cls.status === 'completed' ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <span className="text-xs font-bold">{new Date(cls.date).toLocaleDateString('en-IN', { day: 'numeric' })}</span>
                          <span className="text-[10px] font-bold">{new Date(cls.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{cls.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</span>
                            {cls.instructor && <span>| {cls.instructor}</span>}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cls.status === 'live' ? 'bg-red-100 text-red-700' :
                              cls.status === 'completed' ? 'bg-green-100 text-green-700' :
                              cls.status === 'cancelled' ? 'bg-gray-200 text-gray-500' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {cls.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingClass(cls);
                            setFormData({
                              title: cls.title,
                              description: cls.description || '',
                              date: cls.date,
                              startTime: cls.startTime,
                              endTime: cls.endTime || '',
                              meetingLink: cls.meetingLink || '',
                              instructor: cls.instructor || '',
                              status: cls.status
                            });
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-white rounded-lg text-gray-600"
                        >
                          <span className="material-icons-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleDelete(cls.id)} className="p-2 hover:bg-white rounded-lg text-red-500">
                          <span className="material-icons-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedCourse && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <span className="material-icons-outlined text-5xl text-gray-200 block mb-4">event</span>
          <p className="text-gray-400 font-bold">Select a course to manage live classes</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="font-black text-navy">{editingClass ? 'Edit Live Class' : 'Schedule Live Class'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Class Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="e.g., Physics - Wave Optics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={2}
                  placeholder="Brief description of the class"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Instructor Name</label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg"
                    placeholder="e.g., Dr. Sharma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  placeholder="https://zoom.us/j/... or YouTube Live link"
                />
                <p className="text-[10px] text-gray-400 mt-1">Zoom, Google Meet, or YouTube Live link</p>
              </div>
            </div>
            <div className="flex gap-4 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-navy text-white rounded-lg font-bold">
                {editingClass ? 'Update' : 'Schedule'} Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassScheduler;

