import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { testsAPI, testSeriesAPI, coursesAPI } from '../services/apiClient';

interface CourseGroup {
  courseId: string;
  courseName: string;
  tests: any[];
}

const MockTests: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [expandedSeries, setExpandedSeries] = useState<string[]>([]);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchData();
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams(window.location.hash.split('?')[1]);
      const subjectFilter = params.get('subject');
      const freeOnly = params.get('freeOnly') === 'true';

      const [testsData, seriesData, coursesData] = await Promise.all([
        testsAPI.getAll(),
        testSeriesAPI.getAll(),
        coursesAPI.getAll()
      ]);

      const isRealTest = (item: any) => {
        if (!item) return false;

        const duration = Number(item.duration) || 0;
        const marks = Number(item.marks || item.totalMarks) || 0;

        const questions =
          Array.isArray(item.questions)
            ? item.questions.length
            : Number(item.questions) || Number(item.totalQuestions) || Number(item.numberOfQuestions) || 0;

        const hasValidData =
          duration > 0 &&
          (marks > 0 || questions > 0);

        const hasChildren =
          (Array.isArray(item.tests) && item.tests.length >= 0) ||
          (Array.isArray(item.children) && item.children.length >= 0) ||
          (Array.isArray(item.subTests) && item.subTests.length >= 0);

        return hasValidData && !hasChildren;
      };

      const extractFinalTests = (data: any[]) => {
        let result: any[] = [];

        const traverse = (items: any[]) => {
          if (!Array.isArray(items)) return;

          items.forEach((item) => {
            // go inside if children exist
            if (Array.isArray(item.tests)) traverse(item.tests);
            if (Array.isArray(item.children)) traverse(item.children);
            if (Array.isArray(item.subTests)) traverse(item.subTests);

            // only push real test
            if (isRealTest(item)) {
              result.push(item);
            }
          });
        };

        traverse(data);
        return result;
      };

      const finalTestsData = extractFinalTests(testsData);
      
      let filteredTests = finalTestsData;

      if (subjectFilter) {
        filteredTests = filteredTests.filter((t: any) =>
          (t.subject || '').toLowerCase() === subjectFilter.toLowerCase()
        );
      }

      if (freeOnly) {
        filteredTests = filteredTests.filter((t: any) => t.isFree);
      }

      setTests(filteredTests);
      setTestSeries(Array.isArray(seriesData) ? seriesData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCourseName = (test: any) => {
    if (test.courseName) return test.courseName;
    if (test.courseId) {
      const course = courses.find(c => c.id === test.courseId);
      return course ? (course.name || course.title) : 'Unknown';
    }
    return test.course || 'General';
  };

  const getTestStatus = (test: any) => {
    const now = new Date();
    const openDate = test.openDate ? new Date(test.openDate) : null;
    const closeDate = test.closeDate ? new Date(test.closeDate) : null;
    if (openDate && now < openDate) return 'upcoming';
    if (closeDate && now > closeDate) return 'completed';
    return 'live';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return { label: 'Upcoming', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'schedule' };
      case 'live': return { label: 'Live', bg: 'bg-green-100', text: 'text-green-700', icon: 'play_circle' };
      case 'completed': return { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'check_circle' };
      default: return { label: 'Available', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'info' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries(prev =>
      prev.includes(seriesId) ? prev.filter(id => id !== seriesId) : [...prev, seriesId]
    );
  };

  const getSeriesTests = (series: any) => {
    const seriesId = series.id || series._id;
    return tests.filter(t => t.testSeriesId === seriesId || t.courseId === seriesId || (series.testIds && series.testIds.includes(t.id)));
  };

  const coursesWithTests = (() => {
    const courseMap = new Map<string, CourseGroup>();

    tests.forEach(test => {
      const courseId = test.courseId || 'unlinked';
      const courseName = getCourseName(test);
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, { courseId, courseName, tests: [] });
      }
      courseMap.get(courseId)!.tests.push(test);
    });

    return Array.from(courseMap.values()).sort((a, b) => b.tests.length - a.tests.length);
  })();

  const filteredCourseGroups = selectedCourse === 'all'
    ? coursesWithTests
    : coursesWithTests.filter(g => g.courseId === selectedCourse);

  const uniqueCourseIds = coursesWithTests.map(g => g.courseId);

  return (
    <div className="min-h-screen bg-surface-100 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="relative bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 text-white pt-10 pb-8 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl glass-dark transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-[22px]">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Mock Tests</h1>
            <p className="text-xs text-white/60 mt-1 font-medium">{tests.length} tests available for practice</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-rounded text-[22px]">quiz</span>
          </div>
        </div>
      </header>

      <div className="p-4">
        {/* Tabs and filters removed as per request */}


        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-36 w-full" style={{ animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {tests.length > 0 ? (
              <div className="space-y-4">
                {tests.map((test, tIdx) => {
                  const status = getTestStatus(test);
                  const badge = getStatusBadge(status);
                  const testIdentifier = test.id || test._id;
                  return (
                    <div key={testIdentifier} className="card-premium p-4 animate-fade-in-up shadow-sm border border-gray-100" style={{ animationDelay: `${tIdx * 0.05}s` }}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                          <span className="material-symbols-rounded text-[12px]">{badge.icon}</span>
                          {badge.label}
                        </span>
                        {test.featured && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 flex items-center gap-1">
                            <span className="material-symbols-rounded text-[12px]">star</span>
                            Featured
                          </span>
                        )}
                        {/* Show category as small tag if available */}
                        {test.subject && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 flex items-center gap-1">
                            <span className="material-symbols-rounded text-[12px]">topic</span>
                            {test.subject}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-[15px] text-gray-900 leading-snug">{test.title || test.name}</h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                          <span className="material-symbols-rounded text-[15px] text-primary-400">help</span>
                          {(Array.isArray(test.questions) ? test.questions.length : (Number(test.questions) || test.totalQuestions || test.numberOfQuestions || 0))} Questions
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                          <span className="material-symbols-rounded text-[15px] text-primary-400">timer</span>
                          {test.duration || 60} mins
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                          <span className="material-symbols-rounded text-[15px] text-primary-400">stars</span>
                          {parseInt(test.totalMarks) || parseInt(test.marks) || 0} Marks
                        </span>
                      </div>

                      <button
                        onClick={() => status !== 'upcoming' && navigate(`/test/${test.id || test._id}`)}
                        disabled={status === 'upcoming'}
                        className={`w-full mt-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${status === 'upcoming'
                            ? 'bg-surface-200 text-gray-400 cursor-not-allowed'
                            : status === 'completed'
                              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-button'
                              : 'btn-primary shadow-button'
                          }`}
                      >
                        <span className="material-symbols-rounded text-[18px]">
                          {status === 'completed' ? 'visibility' : status === 'upcoming' ? 'lock' : 'play_arrow'}
                        </span>
                        {status === 'completed' ? 'Review Test' : status === 'upcoming' ? 'Upcoming' : 'Start Test'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-20 h-20 rounded-full bg-surface-200 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-5xl text-gray-300 animate-float">quiz</span>
                </div>
                <p className="text-sm font-semibold text-gray-500 mt-2">No tests available</p>
                <p className="text-xs text-gray-400 mt-1">Tests will appear here when linked to courses</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MockTests;
