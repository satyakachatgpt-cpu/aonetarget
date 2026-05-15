import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import StudentSidebar from '../components/StudentSidebar';
import { testsAPI, testSeriesAPI, coursesAPI, getAuthHeaders } from '../services/apiClient';

interface CourseGroup {
  courseId: string;
  courseName: string;
  tests: any[];
}

const MockTests: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'series' | 'tests'>('series');
  const [activeSeries, setActiveSeries] = useState<any | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('not_enrolled');
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledSeriesIds, setEnrolledSeriesIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchData();
    } else {
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
      navigate('/student-login', { state: { from: location.pathname + location.search } });
    }
  }, []);

  const fetchData = async () => {
    try {
      const storedStudent = localStorage.getItem('studentData');
      const studentData = storedStudent ? JSON.parse(storedStudent) : null;
      const sId = studentData?.id || studentData?._id;

      const [testsData, seriesData, coursesData] = await Promise.all([
        testsAPI.getAll(),
        testSeriesAPI.getAll({ studentId: sId }),
        coursesAPI.getAll()
      ]);

      const isRealTest = (item: any) => {
        if (!item) return false;
        const duration = Number(item.duration) || 0;
        const marks = Number(item.marks || item.totalMarks) || 0;
        const questions = Array.isArray(item.questions)
          ? item.questions.length
          : Number(item.questions) || Number(item.totalQuestions) || Number(item.numberOfQuestions) || 0;
        const hasValidData = duration > 0 && (marks > 0 || questions > 0);
        const hasChildren =
          (Array.isArray(item.tests) && item.tests.length > 0) ||
          (Array.isArray(item.children) && item.children.length > 0) ||
          (Array.isArray(item.subTests) && item.subTests.length > 0);
        return hasValidData && !hasChildren;
      };

      const extractFinalTests = (data: any[]) => {
        const uniqueMap = new Map<string, any>();
        const uniqueKeySet = new Set<string>();
        const traverse = (items: any[]) => {
          if (!Array.isArray(items)) return;
          items.forEach((item) => {
            if (Array.isArray(item.tests)) traverse(item.tests);
            if (Array.isArray(item.children)) traverse(item.children);
            if (Array.isArray(item.subTests)) traverse(item.subTests);
            if (isRealTest(item)) {
              const id = String(item.id || item._id || '');
              const title = (item.title || item.name || '').trim();
              const marks = item.marks || item.totalMarks || 0;
              const duration = item.duration || 0;
              const contentKey = `${title}-${marks}-${duration}`;
              if (id && !uniqueMap.has(id)) {
                if (!uniqueKeySet.has(contentKey)) {
                  uniqueMap.set(id, item);
                  uniqueKeySet.add(contentKey);
                }
              }
            }
          });
        };
        traverse(data);
        return Array.from(uniqueMap.values());
      };

      const sortFn = (a: any, b: any) => {
        const sortA = parseFloat(String(a.sortBy || "0")) || 0;
        const sortB = parseFloat(String(b.sortBy || "0")) || 0;
        if (sortB !== sortA) return sortB - sortA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() || 
               String(b._id || b.id).localeCompare(String(a._id || a.id));
      };

      setTests(extractFinalTests(testsData).sort(sortFn));
      setTestSeries((Array.isArray(seriesData) ? seriesData : []).sort(sortFn));
      setCourses(Array.isArray(coursesData) ? coursesData : []);

      // Pre-check which series student is already enrolled in (using server-provided status)
      if (Array.isArray(seriesData)) {
          const alreadyEnrolled = new Set(
              seriesData.filter((s: any) => s.isEnrolled).map((s: any) => String(s.id || s._id || ''))
          );
          setEnrolledSeriesIds(alreadyEnrolled);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && testSeries.length > 0) {
      const stateSeries = location.state?.series;
      const stateSeriesId = location.state?.seriesId;
      
      if (stateSeries || stateSeriesId) {
        const targetId = stateSeriesId || stateSeries?._id || stateSeries?.id;
        const found = testSeries.find(ts => (ts._id || ts.id) === targetId);
        if (found) {
          handleSeriesClick(found);
          // Clear state so it doesn't trigger again on refresh/back
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [loading, testSeries, location.state]);

  const checkEnrollment = async (series: any) => {
    if (!student) return;
    // --- Robust Free Series Detection ---
    const isFree = !series.price || 
                   Number(series.price) === 0 || 
                   series.isFree === true || 
                   series.free === true || 
                   String(series.price).toLowerCase() === 'free';

    if (isFree) {
      setIsEnrolled(true);
      setEnrollmentStatus(series.isExpired ? 'expired' : 'active');
      return;
    }
    try {
      const seriesId = series.id || series._id;
      const res = await fetch(`/api/students/${student.id || student._id}/enrolled/${seriesId}?t=${Date.now()}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setIsEnrolled(data.enrolled || false);
        setEnrollmentStatus(data.status || (data.isExpired ? 'expired' : (data.enrolled ? 'active' : 'not_enrolled')));
        // Keep enrolledSeriesIds in sync
        if (data.enrolled) {
          setEnrolledSeriesIds(prev => new Set([...prev, String(seriesId)]));
        }
      }
    } catch (e) {
      setIsEnrolled(false);
      setEnrollmentStatus('not_enrolled');
    }
  };

  const handleSeriesClick = async (series: any) => {
    const isActuallyExpired = getSeriesExpiryStatus(series);
    if (isActuallyExpired) {
      toast.error('This test series has expired.');
      return;
    }
    setActiveSeries(series);
    const seriesId = String(series.id || series._id);
    const preEnrolled = enrolledSeriesIds.has(seriesId);
    
    // --- Robust Free Series Detection ---
    const isFree = !series.price || 
                   Number(series.price) === 0 || 
                   series.isFree === true || 
                   series.free === true || 
                   String(series.price).toLowerCase() === 'free';

    if (isFree) {
      setIsEnrolled(true);
      setEnrollmentStatus(series.isExpired ? 'expired' : 'active');
    } else {
      setIsEnrolled(preEnrolled);
      setEnrollmentStatus(series.isExpired ? 'expired' : (preEnrolled ? 'active' : 'not_enrolled'));
    }
    setCurrentView('tests');
    
    // Refresh status from server to be sure
    await checkEnrollment(series);
  };

  const handleEnroll = async () => {
    if (!student || !activeSeries) return;
    setEnrolling(true);
    try {
      const seriesId = activeSeries.id || activeSeries._id;
      const res = await fetch(`/api/students/${student.id || student._id}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ courseId: seriesId })
      });

      if (res.ok) {
        setIsEnrolled(true);
        alert('Enrolled successfully!');
      }
    } catch (e) {
      alert('Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuyNow = () => {
    if (!activeSeries) return;
    navigate(`/checkout/${activeSeries.id || activeSeries._id}`);
  };

  const getTestStatus = (test: any) => {
    const now = new Date();
    const openDate = test.openDate ? new Date(test.openDate) : null;
    const closeDate = test.closeDate ? new Date(test.closeDate) : null;
    if (openDate && now < openDate) return 'upcoming';
    if (closeDate && now > closeDate) return 'expired';
    return 'live';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming': return { label: 'Upcoming', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'schedule' };
      case 'live': return { label: 'Live', bg: 'bg-green-100', text: 'text-green-700', icon: 'play_circle' };
      case 'expired': return { label: 'Expired', bg: 'bg-rose-100', text: 'text-rose-700', icon: 'lock_clock' };
      case 'completed': return { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-500', icon: 'check_circle' };
      default: return { label: 'Available', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'info' };
    }
  };

  const getSeriesExpiryStatus = (series: any) => {
    if (series.isExpired) return true;
    const mode = series.expiryMode;
    const val = series.validity;
    if (mode === 'End Date' && val) {
      const parts = val.split('-');
      let dateStr = val;
      if (parts.length === 3 && parts[2].length === 4) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const expiry = new Date(dateStr);
      expiry.setHours(23, 59, 59, 999);
      return new Date() > expiry;
    }
    return false;
  };

  const handleBack = () => {
    if (currentView === 'tests') {
      setCurrentView('series');
      setActiveSeries(null);
    } else {
      navigate(-1);
    }
  };

  const getSeriesTests = (series: any) => {
    if (!series) return [];
    const seriesId = String(series.id || series._id);
    return tests.filter(t =>
      String(t.testSeriesId) === seriesId ||
      String(t.courseId) === seriesId ||
      (Array.isArray(t.courseIds) && t.courseIds.map(String).includes(seriesId)) ||
      (Array.isArray(series.testIds) && series.testIds.includes(t.id || t._id)) ||
      (Array.isArray(series.tests) && series.tests.some((st: any) => (st.id || st._id) === (t.id || t._id)))
    );
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="relative bg-gradient-to-br from-primary-800 via-primary-600 to-primary-400 text-white pt-10 pb-8 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative flex items-center gap-4">
          <button onClick={handleBack} className="p-2.5 rounded-2xl glass-dark transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-[22px]">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">
              {currentView === 'series' ? 'Test Series' : (activeSeries?.title || activeSeries?.name || 'Tests')}
            </h1>
            <p className="text-xs text-white/60 mt-1 font-medium">
              {currentView === 'series' ? `${testSeries.length} series available` : `${getSeriesTests(activeSeries).length} tests in this series`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-rounded text-[22px]">{currentView === 'series' ? 'style' : 'quiz'}</span>
          </div>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-36 w-full" style={{ animationDelay: `${i * 0.15}s` }}></div>
            ))}
          </div>
        ) : currentView === 'series' ? (
          <div className="grid grid-cols-2 gap-4">
            {testSeries.map((series, idx) => (
              <div
                key={series.id || series._id || idx}
                onClick={() => handleSeriesClick(series)}
                className={`card-premium p-4 rounded-3xl border border-gray-100 cursor-pointer hover:-translate-y-1 transition-all duration-300 group ${getSeriesExpiryStatus(series) ? 'opacity-50 grayscale-[0.5]' : ''}`}
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
                  <span className="material-symbols-rounded text-primary text-2xl">style</span>
                </div>
                <h4 className="font-bold text-[14px] text-gray-800 leading-tight line-clamp-2 min-h-[36px]">{series.title || series.name}</h4>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <span className="material-symbols-rounded text-[12px]">description</span>
                    {getSeriesTests(series).length} Tests
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{series.category || 'General'}</span>
                  {getSeriesExpiryStatus(series) ? (
                    <span className="text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <span className="material-symbols-rounded text-[12px]">lock_clock</span>
                      Expired
                    </span>
                  ) : series.isDirect ? (
                    <span className="text-[11px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">✓ Open</span>
                  ) : series.isIncluded ? (
                    <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">✓ Included</span>
                  ) : series.price > 0 ? (
                    <span className="text-[11px] font-black text-primary bg-primary-50 px-2 py-0.5 rounded-lg">₹{series.price}</span>
                  ) : (
                    <span className="text-[11px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">FREE</span>
                  )}
                </div>
              </div>
            ))}
            {testSeries.length === 0 && (
              <div className="col-span-2 text-center py-20 text-gray-400">No test series available</div>
            )}
          </div>
        ) : (
          <>
            {/* Access/Buy Logic */}
            {enrollmentStatus === 'expired' ? (
              <div className="card-premium p-6 bg-[#2D0D0D] border-red-500/20 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-red-600/20 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/10 text-red-500">
                    <span className="material-symbols-rounded text-3xl">lock_clock</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Access Expired</h3>
                    <p className="text-sm text-red-200/60">Your validity period for this series has ended.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-red-600 text-white py-4 rounded-2xl text-sm font-bold shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                  >
                    Renew Access
                  </button>
                </div>
              </div>
            ) : Number(activeSeries?.price) > 0 && !isEnrolled ? (
              <div className="card-premium p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <span className="material-symbols-rounded text-white text-3xl">shopping_cart</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Unlock this Series</h3>
                    <p className="text-sm text-gray-500">Buy now to access all {getSeriesTests(activeSeries).length} tests</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Price</span>
                    <span className="text-2xl font-black text-indigo-600">₹{Number(activeSeries?.price) || 0}</span>
                  </div>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 btn-primary py-4 rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ) : null}

            {enrollmentStatus !== 'expired' && (!Number(activeSeries?.price) || isEnrolled) ? (
              <div className="space-y-4">
                {getSeriesTests(activeSeries).length > 0 ? (
                  getSeriesTests(activeSeries).map((test: any, tIdx: number) => {
                    const status = getTestStatus(test);
                    const badge = getStatusBadge(status);
                    return (
                      <div key={test.id || test._id || tIdx} className="card-premium p-4 animate-fade-in-up" style={{ animationDelay: `${tIdx * 0.05}s` }}>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                            <span className="material-symbols-rounded text-[12px]">{badge.icon}</span>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{test.subject || 'Test'}</span>
                        </div>
                        <h4 className="font-bold text-[15px] text-gray-900 leading-snug">{test.title || test.name}</h4>
                        <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-base text-gray-300">help</span>
                            {(Array.isArray(test.questions) ? test.questions.length : (Number(test.questions) || test.totalQuestions || test.numberOfQuestions || test.totalQuestionsCount || 0))} Qs
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-rounded text-base text-gray-300">timer</span>
                            {test.duration || 0} Min
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (status === 'expired') {
                              toast.error('This test has expired.');
                              return;
                            }
                            if (status !== 'upcoming') {
                              navigate(`/test/${test.id || test._id}`, { state: { seriesId: activeSeries?.id || activeSeries?._id } });
                            }
                          }}
                          disabled={status === 'upcoming'}
                          className={`w-full mt-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${status === 'upcoming' || status === 'expired' ? 'bg-gray-100 text-gray-300 shadow-none' : 'bg-primary text-white shadow-primary/20'
                            }`}
                        >
                          {status === 'expired' ? 'Expired' : status === 'upcoming' ? 'Locked' : 'Start Test'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <span className="material-symbols-rounded text-5xl text-gray-100 mb-4">folder_open</span>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No tests in this series</p>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default MockTests;
