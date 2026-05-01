import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { getAuthHeaders } from '../services/apiClient';

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = () => {
      const storedStudent = localStorage.getItem('studentData');
      if (storedStudent) {
        const studentData = JSON.parse(storedStudent);
        setStudent(studentData);
        const studentId = studentData._id || studentData.id || studentData.userId;
        if (studentId) fetchCourses(studentId);
        else setLoading(false);
      } else {
        navigate('/student-login');
      }
    };

    init();
    window.addEventListener('focus', init);
    return () => window.removeEventListener('focus', init);
  }, [location.pathname, student?.id]);

  const fetchCourses = async (studentId: string) => {
    try {
      if (import.meta.env.DEV) console.log(`[MyCourses] API URL: /api/students/${studentId}/courses`);
      const response = await fetch(`/api/students/${studentId}/courses`, { headers: getAuthHeaders() });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[MyCourses] API Error (${response.status}):`, errorText);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (import.meta.env.DEV) console.log(`[MyCourses] Raw API Response:`, data);
      
      // Handle various response shapes defensively (STRICT ZERO-BREAKING)
      const courseList: any[] = Array.isArray(data) ? data : (data.courses || data.enrolledCourses || data.data || []);
      if (import.meta.env.DEV) console.log(`[MyCourses] Parsed Course List Length: ${courseList.length}`);

      // Map courses using progress provided by backend (Final Sync)
      const coursesWithProgress = courseList.map((course: any) => ({
        ...course,
        progress: course.progressPercent ?? course.progress ?? 0,
        lessons: course.totalVideos ?? course.lessons ?? 0
      }));

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('[MyCourses] Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">My Courses</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl skeleton" />
            ))}
          </div>
        ) : courses.length > 0 ? (
          courses.map((course, idx) => {
            const courseId = course.id || course._id || course.courseId || course.sourceCourseId;
            if (!courseId) return null;

            return (
              <div
                key={courseId || idx}
                className="bg-white rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => navigate(`/course/${courseId}`)}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-brandBlue to-[#1A237E] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {course.thumbnail || course.image ? (
                    <img src={course.thumbnail || course.image} alt={course.name || course.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm line-clamp-1">{course.name || course.title || 'Untitled Course'}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">{course.subject || 'Enrolled Course'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${Number(course.progress) || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">
                      {(Number(course.progress) || 0).toFixed(0)}%
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
              onClick={() => navigate('/batches')}
              className="mt-4 bg-brandBlue text-white px-6 py-2 rounded-lg text-sm font-bold"
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
