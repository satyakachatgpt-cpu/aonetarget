import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { fetchStudentCoursesWithAuth, getCachedStudentCourses } from '../services/studentService';
import { getImageUrl } from '../lib/utils';

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize student from localStorage
  const [student, setStudent] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('studentData');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const studentId = student?._id || student?.id || student?.userId;

  // Instant render from cache (0ms delay) to prevent empty screen flicker
  const [courses, setCourses] = useState<any[]>(() => {
    return studentId ? getCachedStudentCourses(studentId) : [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    return studentId ? getCachedStudentCourses(studentId).length === 0 : true;
  });
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (sId: string) => {
    if (!sId) return;
    setError(null);
    try {
      const list = await fetchStudentCoursesWithAuth(sId);
      if (Array.isArray(list)) {
        setCourses(list);
      }
    } catch (err: any) {
      console.error('[MyCourses] Failed to load courses:', err);
      if (courses.length === 0) {
        setError('Failed to load courses. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [courses.length]);

  const init = useCallback(() => {
    try {
      const stored = localStorage.getItem('studentData');
      if (stored) {
        const studentData = JSON.parse(stored);
        setStudent(studentData);
        const sId = studentData._id || studentData.id || studentData.userId;
        if (sId) {
          const cached = getCachedStudentCourses(sId);
          if (cached && cached.length > 0) {
            setCourses(cached);
            setLoading(false);
          }
          loadCourses(sId);
        } else {
          setLoading(false);
        }
      } else {
        navigate('/student-login');
      }
    } catch (e) {
      console.error('[MyCourses] Init error:', e);
      setLoading(false);
    }
  }, [navigate, loadCourses]);

  useEffect(() => {
    init();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        init();
      }
    };

    window.addEventListener('focus', init);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', init);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [location.pathname, init]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">My Courses</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading && courses.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl skeleton" />
            ))}
          </div>
        ) : error && courses.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-rounded text-6xl text-red-400">cloud_off</span>
            <p className="text-sm font-semibold text-gray-700 mt-4">{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                init();
              }}
              className="mt-4 bg-brandBlue text-white px-6 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform"
            >
              Try Again
            </button>
          </div>
        ) : courses.length > 0 ? (
          courses.map((course, idx) => {
            const courseId = course.id || course._id || course.courseId || course.sourceCourseId;
            if (!courseId) return null;

            return (
              <div
                key={courseId || idx}
                className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 transition-all relative ${
                  course.expired ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-[0.98]'
                }`}
                onClick={() => !course.expired && navigate(`/course/${courseId}`)}
              >
                {course.expired && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-tr-xl rounded-bl-xl shadow-sm z-10">
                    EXPIRED
                  </div>
                )}
                <div className="w-20 h-20 bg-gradient-to-br from-brandBlue to-[#1A237E] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {course.thumbnail || course.image ? (
                    <img 
                      src={getImageUrl(course.thumbnail || course.image)} 
                      alt={course.name || course.title} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {course.expired && (
                    <span className="text-red-600 text-[10px] font-bold uppercase block mb-1">Expired</span>
                  )}
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{course.name || course.title || 'Untitled Course'}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">{course.subject || 'Enrolled Course'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, Number(course.progress ?? course.progressPercent) || 0))}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">
                      {Math.round(Number(course.progress ?? course.progressPercent) || 0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-rounded text-6xl text-gray-300">school</span>
            <p className="text-sm text-gray-400 mt-4">No enrolled courses yet</p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-4 bg-brandBlue text-white px-6 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform"
            >
              Browse Courses
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
