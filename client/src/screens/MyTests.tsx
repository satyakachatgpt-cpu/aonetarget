import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { useAuthStore } from '../store/authStore';

const MyTests: React.FC = () => {
  const navigate = useNavigate();
  const { student, isAuthenticated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/student-login');
      return;
    }
    if (student) {
      fetchTestResults(student.id);
    }
  }, [isAuthenticated, student, navigate]);

  const fetchTestResults = async (studentId: string) => {
    try {
      console.log('Fetching test results for studentId:', studentId);
      const response = await fetch(`/api/students/${studentId}/test-results`);
      const data = await response.json();
      console.log('Fetched test results:', data);
      
      const results = Array.isArray(data) ? data : [];
      setTestResults(results);
      console.log('Filtered/Set test results:', results);
    } catch (error) {
      console.error('Error fetching test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="relative bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 text-white pt-10 pb-10 px-4 overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
        
        <div className="relative flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-11 h-11 rounded-2xl glass-dark flex items-center justify-center transition-all duration-200 active:scale-[0.85] cursor-pointer"
          >
            <span className="material-symbols-rounded text-[24px]">arrow_back</span>
          </button>
          
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight uppercase">My Tests</h1>
            <p className="text-[10px] text-white/50 mt-0.5 font-bold uppercase tracking-widest">Performance History</p>
          </div>
        </div>
      </header>

      <div className="p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="skeleton h-32 w-full rounded-2xl opacity-50"></div>
            ))}
          </div>
        ) : testResults.length > 0 ? (
          <div className="space-y-3">
            {testResults.map((result, idx) => {
              const score = Number(result.score) || Number(result.obtainedMarks) || 0;
              const total = Number(result.totalMarks) || 0;
              const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
              
              const baseName = result.testName && result.testName !== 'Test' && result.testName !== 'Mock Test'
                ? result.testName 
                : (result.testTitle || result.title || result.name || 'Mock Test');
              const coursePrefix = result.courseName ? `${result.courseName.split(':')[0]}: ` : '';
              const testDisplayName = baseName.includes(':') ? baseName : `${coursePrefix}${baseName}`;

              return (
                <div 
                  key={result._id || idx} 
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 animate-fade-in-up" 
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[11px] fill-1">verified</span>
                        OK
                      </span>
                      {result.courseName && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-blue-50 text-brandBlue border border-blue-100 truncate max-w-[120px]">
                          {result.courseName}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-500 leading-none">{formatDate(result.submittedAt).split(',')[0]}</p>
                      <p className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter mt-0.5">
                        {new Date(result.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[13px] font-black text-gray-900 leading-tight tracking-tight uppercase truncate">
                      {testDisplayName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-brandBlue">
                        <span className="material-symbols-rounded text-base">stars</span>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">SCORE</p>
                        <div className="flex items-baseline gap-0.5 leading-none">
                          <span className="text-base font-black text-brandBlue">{score}</span>
                          <span className="text-[9px] text-gray-400 font-bold">/{total}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accuracy >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        <span className="material-symbols-rounded text-base">track_changes</span>
                      </div>
                      <div>
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">ACCURACY</p>
                        <span className={`text-base font-black leading-none ${accuracy >= 70 ? 'text-emerald-600' : accuracy >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {accuracy}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => navigate(`/test/${result.testId || result.id}`)}
                      className="flex-1 bg-brandBlue text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98] shadow-sm"
                    >
                      <span className="material-symbols-rounded text-[16px]">visibility</span>
                      Review
                    </button>
                    <button
                      onClick={() => navigate(`/test/${result.testId || result.id}`)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.98]"
                    >
                      <span className="material-symbols-rounded text-[16px]">replay</span>
                      Try Again
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-premium p-10 text-center animate-fade-in-up mt-10">
            <div className="w-20 h-20 rounded-full bg-surface-200 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-5xl text-gray-300 animate-float">quiz</span>
            </div>
            <h3 className="text-base font-bold text-gray-800">No tests attempted yet</h3>
            <p className="text-xs text-gray-400 mt-2">Finish a test first to see your results here!</p>
            <button 
              onClick={() => navigate('/mock-tests')}
              className="mt-6 px-6 py-3 btn-primary text-xs active:scale-[0.97]"
            >
              Explore Mock Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTests;
