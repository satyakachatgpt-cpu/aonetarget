import React, { useState, useEffect } from 'react';
import { getAdminHeaders } from '../../services/apiClient';

interface TestResult {
  id: string;
  testId: string;
  testName: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
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

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const AllReports: React.FC<Props> = ({ showToast }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const res = await fetch('/api/admin/test-results', { headers: getAdminHeaders() });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load test results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const courses = [...new Set(results.map(r => r.courseName || 'Other').filter(Boolean))];

  const filteredResults = results.filter(r => {
    const matchSearch = !searchQuery ||
      (r.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.testName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCourse = !filterCourse || (r.courseName || 'Other') === filterCourse;
    return matchSearch && matchCourse;
  });

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStudents = [...new Set(results.map(r => r.studentId))].length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length)
    : 0;
  const passCount = results.filter(r => r.percentage >= 40).length;
  const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

  const formatTime = (seconds: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-blue-600">assignment</span>
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{results.length}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Total Tests Taken</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-green-600">people</span>
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{totalStudents}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Students Tested</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-amber-600">trending_up</span>
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{avgScore}%</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Average Score</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-emerald-600">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-black text-navy">{passRate}%</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Pass Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by student name, test name, or ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
          </div>
          <div className="relative group">
            <select
              value={filterCourse}
              onChange={(e) => { setFilterCourse(e.target.value); setCurrentPage(1); }}
              className="appearance-none border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-navy/10 bg-white cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
          </div>
          <button
            onClick={loadResults}
            className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#303F9F] transition-colors"
          >
            <span className="material-icons-outlined text-lg">refresh</span>
            Refresh
          </button>
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-icons-outlined text-6xl text-gray-200">assessment</span>
            <p className="text-sm text-gray-400 mt-4">
              {results.length === 0 ? 'No test results yet. Results will appear when students take tests.' : 'No matching results found.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Test</th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Course</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Score</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Correct</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Wrong</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-center px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedResults.map((r) => {
                    const pctColor = r.percentage >= 70 ? 'text-green-600 bg-green-50' : r.percentage >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-black text-navy">{(r.studentName || 'S').charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">{r.studentName || 'Student'}</p>
                              <p className="text-[9px] text-gray-400">{r.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-700 max-w-[150px] truncate">{r.testName || 'Test'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-500 max-w-[120px] truncate">{r.courseName || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black ${pctColor}`}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-green-600">{r.correctAnswers}/{r.totalQuestions}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold text-red-500">{r.wrongAnswers}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] text-gray-500">{formatTime(r.timeTaken)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] text-gray-400">
                            {new Date(r.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedResult(selectedResult?.id === r.id ? null : r)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <span className="material-icons-outlined text-sm text-gray-400">
                              {selectedResult?.id === r.id ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination Footer */}
            {!loading && filteredResults.length > 0 && (
              <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-[2rem] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center group">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                      expand_more
                    </span>
                  </div>
                  <span className="text-[13px] font-medium text-gray-400 italic">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredResults.length)} of{" "}
                    {filteredResults.length} entries
                  </span>
                </div>

                <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                  <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                    {currentPage}
                  </button>
                  <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-navy uppercase">Test Result Details</h3>
              <button onClick={() => setSelectedResult(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-icons-outlined text-sm">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className={`text-5xl font-black ${selectedResult.percentage >= 70 ? 'text-green-600' : selectedResult.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {selectedResult.percentage}%
                </div>
                <p className="text-sm text-gray-500 mt-1">{selectedResult.obtainedMarks} / {selectedResult.totalMarks} marks</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student</span>
                  <span className="font-bold">{selectedResult.studentName || selectedResult.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Test</span>
                  <span className="font-bold">{selectedResult.testName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Course</span>
                  <span className="font-bold">{selectedResult.courseName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Questions</span>
                  <span className="font-bold">{selectedResult.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Correct</span>
                  <span className="font-bold text-green-600">{selectedResult.correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Wrong</span>
                  <span className="font-bold text-red-600">{selectedResult.wrongAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unanswered</span>
                  <span className="font-bold text-gray-500">{selectedResult.unanswered}</span>
                </div>
                {selectedResult.negativeMarksTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Negative Marks</span>
                    <span className="font-bold text-red-600">-{selectedResult.negativeMarksTotal}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Time Taken</span>
                  <span className="font-bold">{formatTime(selectedResult.timeTaken)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-bold">{new Date(selectedResult.submittedAt).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllReports;
