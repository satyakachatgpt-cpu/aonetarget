import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { notificationsAPI } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { setUnreadCount } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchNotifications(studentData);
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchNotifications = async (currentStudent?: any) => {
    const studentToUse = currentStudent || student;
    if (!studentToUse) return;
    
    try {
      const data = await notificationsAPI.getAll();
      const studentNotifications = Array.isArray(data)
        ? data.filter(notif => {
            const targetsStudent = !notif.targetStudentId || notif.targetStudentId === studentToUse.id || notif.targetStudentId === 'all';
            let targetsCourse = true;
            if (notif.targetCourseId && notif.targetCourseId !== 'all') {
              targetsCourse = !!studentToUse.enrolledCourses?.includes(notif.targetCourseId);
            }
            return targetsStudent && targetsCourse;
          })
        : [];
      setNotifications(studentNotifications);
      
      // Update local storage to permanently hide the red dot for current notifications
      localStorage.setItem('lastSeenNotifications', Date.now().toString());
      setUnreadCount(0);

      // We still mark them as read in the DB for backend status tracking
      const unreadCount = studentNotifications.filter((n: any) => !n.isRead).length;
      if (unreadCount > 0) {
        // Mark as read immediately on fetch
        const unreadIds = studentNotifications.filter((n: any) => !n.isRead);
        notificationsAPI.updateAll(
          unreadIds.map((notif: any) => ({ ...notif, isRead: true }))
        ).then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }).catch(err => console.error('Failed to mark all as read:', err));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.isRead);
      if (unreadNotifications.length > 0) {
        await notificationsAPI.updateAll(
          unreadNotifications.map(notif => ({ ...notif, isRead: true }))
        );
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.update(notificationId, { isRead: true });
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setNotifications(prev => {
        const unreadCount = prev.filter(n => !n.isRead).length;
        setUnreadCount(unreadCount);
        return prev;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'test': return 'assignment';
      case 'course': return 'school';
      case 'live': return 'videocam';
      case 'result': return 'emoji_events';
      case 'payment': return 'payment';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'test': return 'bg-purple-100 text-purple-600';
      case 'course': return 'bg-blue-100 text-blue-600';
      case 'live': return 'bg-red-100 text-red-600';
      case 'result': return 'bg-yellow-100 text-yellow-600';
      case 'payment': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white pt-8 pb-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-all">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold">Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-rounded animate-spin text-4xl text-[#1A237E]">progress_activity</span>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif, idx) => (
              <div
                key={notif._id || idx}
                onClick={() => !notif.isRead && markAsRead(notif._id)}
                className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer transition-all hover:shadow-md ${!notif.isRead ? 'border-l-4 border-[#1A237E]' : ''}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getNotificationColor(notif.type)}`}>
                  <span className="material-symbols-rounded">{getNotificationIcon(notif.type)}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{notif.title}</h4>
                  <p className="text-[11px] text-gray-500 mt-1">{notif.message}</p>
                  <p className="text-[10px] text-gray-300 mt-2">
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Just now'}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-[#1A237E] rounded-full shrink-0 mt-2"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-rounded text-6xl text-gray-300">notifications_off</span>
            <p className="text-sm text-gray-400 mt-4">No notifications</p>
            <p className="text-[10px] text-gray-300 mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
