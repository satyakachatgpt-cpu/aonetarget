import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { getAuthHeaders } from '../services/apiClient';

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      
      // Robust ID resolution: use _id first, then id, then userId
      const studentId = studentData._id || studentData.id || studentData.userId;
      console.log(`[MyCourses] Resolving courses for student ID: ${studentId}`);
      
      if (studentId) {
        fetchCourses(studentId);
      } else {
        console.warn('[MyCourses] No valid student ID found in stored data');
        setLoading(false);
      }
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchCourses = async (studentId: string) => {
    try {
      console.log(`[MyCourses] Fetching courses from API...`);
      const response = await fetch(`/api/students/${studentId}/courses`, { headers: getAuthHeaders() });
      const data = await response.json();
      
      // Handle various response shapes defensively
      const courseList: any[] = Array.isArray(data) ? data : (data.courses || data.data || []);
      console.log(`[MyCourses] API returned ${courseList.length} courses`);

      // Map courses and calculate progress
      // We keep the detailed calculation for accuracy, but ensure it doesn't block if one fails
      const coursesWithProgress = await Promise.all(
        courseList.map(async (course) => {
          const courseId = course.id || course._id;
          if (!courseId) return { ...course, progress: course.progress || 0 };

          try {
            // Optimization: If backend already provided progress > 0, we can skip re-fetching unless needed
            // But for now we stick to the existing logic for maximum accuracy
            const [videosRes, progressRes] = await Promise.all([
              fetch(`/api/courses/${courseId}/videos`),
              fetch(`/api/students/${studentId}/courses/${courseId}/progress`, { headers: getAuthHeaders() }),
            ]);

            const videosData = videosRes.ok ? await videosRes.json() : [];
            const progressData = progressRes.ok ? await progressRes.json() : {};

            const allVideos: any[] = Array.isArray(videosData) ? videosData : [];
            const totalVideos = allVideos.filter(
              (v) => v.contentType !== 'youtube_zoom' && v.contentType !== 'live_stream'
            ).length;

            const completedVideos: string[] = progressData.completedVideos || [];
            const completedCount = completedVideos.length;

            const calculatedProgress =
              totalVideos > 0 ? Math.min(100, Math.round((completedCount / totalVideos) * 100)) : (course.progress || 0);

            return { 
              ...course, 
              progress: calculatedProgress, 
              lessons: totalVideos || course.lessons || 0 
            };
          } catch (err) {
            console.warn(`[MyCourses] Failed to fetch sub-progress for course ${courseId}:`, err);
            return { ...course, progress: course.progress || 0 };
          }
        })
      );

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
          courses.map((course, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/course/${course.id}`)}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-brandBlue to-[#1A237E] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{course.name || course.title}</h4>
                <p className="text-[10px] text-gray-400 mt-1">{course.subject || 'NEET Preparation'}</p>
                <p className="text-[10px] text-gray-400">{course.lessons || 0} Lessons | {course.duration || '0'} Hours</p>
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
          ))
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
