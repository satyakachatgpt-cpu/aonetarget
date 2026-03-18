import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { testsAPI, notificationsAPI } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

interface TestResult {
  id: string;
  testId: string;
  testName: string;
  courseId: string;
  courseName: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalMarks: number;
  obtainedMarks: number;
  negativeMarksTotal: number;
  percentage: number;
  timeTaken: number;
  submittedAt: string;
}

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { student, isAuthenticated, unreadNotificationsCount, setUnreadCount } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    courses: 0,
    testsTaken: 0,
    avgScore: 0,
    bestScore: 0
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (student) {
      fetchDashboardData(student.id || (student as any)._id);
    } else if (!isAuthenticated) {
      navigate('/student-login');
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, student, navigate]);

  const fetchDashboardData = async (studentId: string) => {
    try {
      const [coursesRes, testsData, resultsRes] = await Promise.all([
        fetch(`/api/students/${studentId}/courses`).then(r => r.json()).catch(() => []),
        testsAPI.getAll().catch(() => []),
        fetch(`/api/students/${studentId}/test-results`).then(r => r.json()).catch(() => [])
      ]);

      const coursesData = Array.isArray(coursesRes) ? coursesRes : [];
      const resultsData = Array.isArray(resultsRes) ? resultsRes : [];

      setEnrolledCourses(Array.isArray(coursesData) ? coursesData : []);

      const results = Array.isArray(resultsData) ? resultsData : [];
      setTestResults(results);

      const avgScore = results.length > 0
        ? Math.round(results.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / results.length)
        : 0;
      const bestScore = results.length > 0
        ? Math.max(...results.map((r: any) => r.percentage || 0))
        : 0;

      setStats({
        courses: Array.isArray(coursesData) ? coursesData.length : 0,
        testsTaken: results.length,
        avgScore,
        bestScore
      });

      const activeTests = Array.isArray(testsData)
        ? testsData.filter((t: any) => !t.status || t.status === 'active').slice(0, 5)
        : [];
      setUpcomingTests(activeTests);

      // Fetch unread count
      const notifsData = await notificationsAPI.getAll().catch(() => []);
      const unreadCount = Array.isArray(notifsData)
        ? notifsData.filter((n: any) =>
          (!n.targetStudentId || n.targetStudentId === studentId || n.targetStudentId === 'all') && !n.isRead
        ).length
        : 0;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const courseProgress = testResults.reduce((acc, r) => {
    const key = r.courseId || r.courseName || 'Other';
    if (!acc[key]) acc[key] = { total: 0, obtained: 0, count: 0, name: r.courseName || 'Other' };
    acc[key].total += Number(r.totalMarks) || 0;
    acc[key].obtained += Number(r.obtainedMarks) || 0;
    acc[key].count++;
    return acc;
  }, {} as Record<string, { total: number; obtained: number; count: number; name: string }>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="material-symbols-rounded animate-spin text-4xl text-brandBlue">progress_activity</span>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        student={student}
      />

      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-20 px-4 rounded-b-[2rem]">
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full hover:bg-white/20"
          >
            <span className="material-symbols-rounded">menu</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full hover:bg-white/20 relative"
            >
              <span className="material-symbols-rounded">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-brandBlue shadow-sm"></span>
              )}
            </button>
          </div>
        </div>

        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center shadow-xl">
            <span className="text-3xl font-black text-brandBlue">
              {student?.name?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <h1 className="text-lg font-bold uppercase">{student?.name || 'STUDENT'}</h1>
          <p className="text-blue-200 text-xs mt-1">{student?.email}</p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="bg-gray-800 px-4 py-1.5 rounded-full text-xs font-bold">
              {student?.class || '12th'}
            </span>
            <span className="bg-gray-800 px-4 py-1.5 rounded-full text-xs font-bold">
              {student?.target || 'NEET'}
            </span>
          </div>
        </div>
      </header>

      <div className="-mt-8 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <span className="text-xl font-black text-brandBlue">{stats.courses}</span>
            <p className="text-[9px] text-gray-500 font-bold uppercase">Courses</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <span className="text-xl font-black text-green-600">{stats.testsTaken}</span>
            <p className="text-[9px] text-gray-500 font-bold uppercase">Tests</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <span className="text-xl font-black text-orange-500">{stats.avgScore}%</span>
            <p className="text-[9px] text-gray-500 font-bold uppercase">Avg Score</p>
          </div>
          <div className="text-center border-l border-gray-100">
            <span className="text-xl font-black text-[#D32F2F]">{stats.bestScore}%</span>
            <p className="text-[9px] text-gray-500 font-bold uppercase">Best</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {[
            { key: 'dashboard', label: 'Overview', icon: 'dashboard' },
            { key: 'results', label: 'Results', icon: 'assessment' },
            { key: 'progress', label: 'Progress', icon: 'trending_up' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg font-bold text-[10px] flex flex-col items-center gap-1 transition-all ${activeTab === tab.key ? 'bg-white text-brandBlue shadow-sm' : 'text-gray-500'
                }`}
            >
              <span className="material-symbols-rounded text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {enrolledCourses.length > 0 && (
              <section className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-green-600">school</span>
                  My Courses
                </h3>
                <div className="space-y-2">
                  {enrolledCourses.slice(0, 4).map((c: any) => (
                    <button
                      key={c.id || c._id}
                      onClick={() => navigate(`/course/${c.id || c._id}`)}
                      className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-800 dark:border-gray-700 dark:border rounded-xl hover:shadow-sm transition-all active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-[#303F9F] to-[#1A237E] rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                        {(c.imageUrl || c.thumbnail) ? (
                          <img
                            src={c.imageUrl || c.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                e.currentTarget.style.display = 'none';
                                const span = document.createElement('span');
                                span.className = 'text-white font-bold';
                                span.innerText = (c.name || c.title || '?').charAt(0).toUpperCase();
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-white font-bold">{(c.name || c.title || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{c.name || c.title}</p>
                        <p className="text-[10px] text-gray-400">{c.type === 'live' ? 'Live' : 'Recorded'} Course</p>
                      </div>
                      <span className="material-symbols-rounded text-[#303F9F] text-lg">play_circle</span>
                    </button>
                  ))}
                </div>
                {enrolledCourses.length > 4 && (
                  <button
                    onClick={() => navigate('/my-courses')}
                    className="w-full mt-2 text-brandBlue text-xs font-bold py-2 hover:bg-blue-50 rounded-lg"
                  >
                    View All ({enrolledCourses.length})
                  </button>
                )}
              </section>
            )}

            {testResults.length > 0 && (
              <section className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-brandBlue">history</span>
                  Recent Test Results
                </h3>
                <div className="space-y-3">
                  {testResults.slice(0, 3).map((r) => {
                    const pctColor = r.percentage >= 70 ? 'text-green-600 dark:text-green-400' : r.percentage >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-[#D32F2F] dark:text-red-400';
                    const bgColor = r.percentage >= 70 ? 'bg-green-50 dark:bg-green-900/20' : r.percentage >= 40 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20';
                    return (
                      <div key={r.id || (r as any)._id} className={`${bgColor} rounded-xl p-3 flex items-center gap-3`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.percentage >= 70 ? 'bg-green-100 dark:bg-green-900/40' : r.percentage >= 40 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                          <span className={`text-lg font-black ${pctColor}`}>{r.percentage}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{r.testName || 'Test'}</p>
                          <p className="text-[10px] text-gray-500">{r.courseName || 'General'}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            {r.correctAnswers}/{r.totalQuestions} correct | {formatTime(r.timeTaken)}
                          </p>
                        </div>
                        <span className="text-[9px] text-gray-400 shrink-0">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {testResults.length > 3 && (
                  <button
                    onClick={() => setActiveTab('results')}
                    className="w-full mt-3 text-brandBlue text-xs font-bold py-2 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View All Results ({testResults.length})
                  </button>
                )}
              </section>
            )}

            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <span className="material-symbols-rounded text-[#D32F2F]">schedule</span>
                Available Tests
              </h3>
              {upcomingTests.length > 0 ? (
                upcomingTests.map((test, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="w-10 h-10 bg-[#D32F2F]/10 dark:bg-[#D32F2F]/20 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-rounded text-[#D32F2F] dark:text-red-400">assignment</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{test.title || test.name}</p>
                      <p className="text-[10px] text-gray-400">{test.courseName || test.course || 'General'} | {test.duration || 60} mins</p>
                    </div>
                    <button
                      onClick={() => navigate(`/test/${test.id || test._id}`)}
                      className="bg-brandBlue text-white px-3 py-1.5 rounded-lg text-[10px] font-bold"
                    >
                      Start
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No tests available</p>
              )}
            </section>

            {testResults.length === 0 && (
              <section className="bg-white rounded-xl p-6 shadow-sm text-center">
                <span className="material-symbols-rounded text-5xl text-gray-200 dark:text-gray-700">quiz</span>
                <p className="text-sm text-gray-500 mt-3">You haven't taken any tests yet</p>
                <button
                  onClick={() => navigate('/mock-tests')}
                  className="mt-3 bg-brandBlue text-white px-6 py-2 rounded-lg text-sm font-bold"
                >
                  Take a Mock Test
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-3">
            {testResults.length > 0 ? (
              testResults.map((r) => {
                const pctColor = r.percentage >= 70 ? 'text-green-600 dark:text-green-400' : r.percentage >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-[#D32F2F] dark:text-red-400';
                const borderColor = r.percentage >= 70 ? 'border-green-200 dark:border-green-800' : r.percentage >= 40 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800';
                return (
                  <div key={r.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${borderColor}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{r.testName || 'Test'}</p>
                        <p className="text-[10px] text-gray-500">{r.courseName || 'General'}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-xl font-black ${pctColor}`}>{r.percentage}%</p>
                        <p className="text-[9px] text-gray-400">{r.obtainedMarks}/{r.totalMarks} marks</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {r.correctAnswers} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {r.wrongAnswers} wrong
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                        {r.unanswered} skipped
                      </span>
                      <span className="ml-auto">{formatTime(r.timeTaken)}</span>
                    </div>
                    {r.negativeMarksTotal > 0 && (
                      <p className="text-[9px] text-[#D32F2F] mt-1">Negative marks: -{r.negativeMarksTotal}</p>
                    )}
                    <p className="text-[9px] text-gray-400 mt-1">
                      {r.submittedAt ? `${new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(r.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <span className="material-symbols-rounded text-5xl text-gray-200 dark:text-gray-700">assessment</span>
                <p className="text-sm text-gray-400 mt-3">No test results yet</p>
                <button
                  onClick={() => navigate('/mock-tests')}
                  className="mt-3 bg-brandBlue text-white px-6 py-2 rounded-lg text-sm font-bold"
                >
                  Take a Test
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4">
            <section className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-brandBlue">bar_chart</span>
                Overall Performance
              </h3>
              {testResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-brandBlue">{stats.avgScore}%</p>
                      <p className="text-[10px] text-gray-500 font-bold">Average Score</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-600 dark:text-green-400">{stats.bestScore}%</p>
                      <p className="text-[10px] text-gray-500 font-bold">Best Score</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-300">Average Score</span>
                      <span className="font-bold text-brandBlue">{stats.avgScore}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${stats.avgScore >= 70 ? 'bg-green-500' : stats.avgScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${stats.avgScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Take tests to see your performance</p>
              )}
            </section>

            {Object.keys(courseProgress).length > 0 && (
              <section className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-green-600">school</span>
                  Course-wise Progress
                </h3>
                <div className="space-y-4">
                  {Object.entries(courseProgress).map(([key, data]) => {
                    const progressData = data as { total: number; obtained: number; count: number; name: string };
                    const pct = progressData.total > 0 ? Math.round((progressData.obtained / progressData.total) * 100) : 0;
                    const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                    const textColor = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-[#D32F2F]';
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-gray-700 font-medium truncate max-w-[60%]">{progressData.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-400">{progressData.count} tests</span>
                            <span className={`font-bold ${textColor}`}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {testResults.length > 1 && (
              <section className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-orange-500">timeline</span>
                  Score Trend (Last 10)
                </h3>
                <div className="flex items-end gap-1 h-32">
                  {testResults.slice(0, 10).reverse().map((r, i) => {
                    const barColor = r.percentage >= 70 ? 'bg-green-500' : r.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[8px] font-bold text-gray-500">{r.percentage}%</span>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-md relative" style={{ height: '100px' }}>
                          <div
                            className={`absolute bottom-0 w-full ${barColor} rounded-t-md transition-all duration-500`}
                            style={{ height: `${r.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
