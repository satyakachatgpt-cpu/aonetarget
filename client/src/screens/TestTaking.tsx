import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getImageUrl } from '@/lib/utils';
import { getAuthHeaders, getAdminHeaders, reportedQuestionsAPI } from '../services/apiClient';
import { renderQuestionText } from '../components/admin/tests/shared/TestUtils';
import 'katex/dist/katex.min.css';

type QuestionStatus = 'unanswered' | 'answered' | 'flagged' | 'flagged-answered';

const TestTaking: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Capture location.state once in a ref — prevents reset when popstate fires during back-button trap
  const locationStateRef = useRef(location.state);
  const launchedSeriesId = locationStateRef.current?.seriesId;

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [reportModal, setReportModal] = useState<{ isOpen: boolean, question: any } | null>(null);
  const [reportIssue, setReportIssue] = useState('');
  const [reportComment, setReportComment] = useState('');
  const [reportingStatus, setReportingStatus] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [fetchingLeaderboard, setFetchingLeaderboard] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'solutions'>('summary');

  useEffect(() => {
    // Reset session state when changing tests
    setQuestions([]);
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setSubmitted(false);
    setResult(null);
    setLoading(true);
    setError('');
    setReportModal(null);
    setHasAcceptedTerms(false);
    setActiveSectionId(null);

    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent && storedStudent !== 'undefined') {
      try {
        setStudent(JSON.parse(storedStudent));
      } catch (e) {
        console.error('Failed to parse student data', e);
      }
    }

    const initialState = locationStateRef.current;
    if (initialState?.review && initialState?.resultId) {
      fetchReviewData(initialState.resultId);
    } else {
      fetchTestData();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // Only re-run when testId changes — NOT on location.state changes (which happen on popstate)
  }, [testId]);

  const fetchReviewData = async (resultId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/test-results/${resultId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`${errData.error || 'Result not found'} (ID: ${resultId})`);
      }
      const resultData = await res.json();

      // Fetch the test data as well to get questions
      const testRes = await fetch(`/api/tests/${testId}`, {
        headers: { ...getAuthHeaders(), ...getAdminHeaders() }
      });
      if (!testRes.ok) throw new Error('Test not found');
      const testData = await testRes.json();

      setTest(testData);

      // Build a map of correctAnswer from saved questionResults in DB
      // (Server strips correctAnswer from live question API for students to prevent cheating,
      //  but it IS saved in the result's questionResults for review purposes)
      const correctAnswerMap: Record<string, string> = {};
      if (Array.isArray(resultData.questionResults)) {
        resultData.questionResults.forEach((qr: any) => {
          if (qr.questionId && qr.correctAnswer) {
            correctAnswerMap[String(qr.questionId)] = qr.correctAnswer;
          }
        });
      }

      const q = (Array.isArray(testData.questions) ? testData.questions : []).map((qn: any, index: number) => {
        const qOriginalId = String(qn.id || qn._id || 'q');
        // Try to get correctAnswer from saved result first, then fallback to question fields
        const savedCorrect = correctAnswerMap[qOriginalId] || '';
        const fieldCorrect = (qn.correctAnswer || qn.correct_answer || qn.answer || qn['Correct Answer'] || qn.correctOption || '').toString().toUpperCase();
        return {
          ...qn,
          id: `${qOriginalId}_idx_${index}`,
          correctAnswer: savedCorrect || fieldCorrect
        };
      });
      setQuestions(q);

      setAnswers(resultData.answers || {});
      setResult(resultData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportIssue || !reportModal) return;
    setReportingStatus(true);
    try {
      await reportedQuestionsAPI.report({
        studentId: student?.id,
        studentName: student?.name,
        testId: testId,
        testTitle: test?.title || 'Unknown Test',
        questionId: reportModal.question.id,
        questionNumber: questions.findIndex(q => q.id === reportModal.question.id) + 1,
        questionEn: reportModal.question.questionEn || reportModal.question.question || reportModal.question.text,
        questionHi: reportModal.question.questionHi || '',
        issue: reportIssue,
        comment: reportComment
      });
      alert('Report submitted successfully!');
      setReportModal(null);
      setReportIssue('');
      setReportComment('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportingStatus(false);
    }
  };

  const fetchTestData = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}?t=${Date.now()}`, {
        headers: { ...getAuthHeaders(), ...getAdminHeaders() }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.code === 'EXPIRED') {
          throw new Error('Your access to this test series has expired. Please renew your subscription to continue.');
        }
        if (res.status === 403 && errData.code === 'ENROLLMENT_REQUIRED') {
          throw new Error('You need to enroll in this course to access this test.');
        }
        throw new Error(errData.error || 'Test not found');
      }
      const testData = await res.json();
      if (!testData || typeof testData !== 'object') throw new Error('Invalid test data');
      setTest(testData);
      const q = (Array.isArray(testData.questions) ? testData.questions : []).map((qn: any, index: number) => ({
        ...qn,
        id: `${qn.id || qn._id || 'q'}_idx_${index}`,
        correctAnswer: (qn.correctAnswer || qn.correct_answer || qn.answer || qn['Correct Answer'] || qn.correctOption || '').toString().toUpperCase()
      }));
      setQuestions(q);

      // --- CRITICAL: Hard Expiry vs Personal Duration Calculation ---
      const durationSecs = (testData.duration || 60) * 60;
      let finalTimeLeft = durationSecs;

      // Check if test has a scheduled end time (Hard Expiry)
      const hardExpiryStr = testData.closeDate || testData.endDate || testData.validity;
      if (hardExpiryStr) {
        const hardExpiryDate = new Date(hardExpiryStr);
        if (!isNaN(hardExpiryDate.getTime())) {
          const secsToHardExpiry = Math.floor((hardExpiryDate.getTime() - Date.now()) / 1000);
          
          // Use the smaller of the two: Personal Duration OR Time until Hard Expiry
          if (secsToHardExpiry > 0) {
            finalTimeLeft = Math.min(durationSecs, secsToHardExpiry);
            console.log(`[Timer] Hard expiry in ${secsToHardExpiry}s, Duration in ${durationSecs}s. Final: ${finalTimeLeft}s`);
          } else {
            // Already past hard expiry
            finalTimeLeft = 0;
          }
        }
      }

      setTimeLeft(finalTimeLeft);
      startTimeRef.current = Date.now();

      if (testData?.enableSectionSelector && Array.isArray(testData?.sections) && testData.sections.length > 0) {
        setActiveSectionId(testData.sections[0].id.toString());
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitted || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          studentId: student?.id || 'anonymous',
          answers,
          timeTaken,
          courseId: launchedSeriesId
        })
      });

      if (!res.ok) throw new Error('Failed to submit');
      const resultData = await res.json();
      setResult(resultData);

      // Restore correct answers from the submission result into the questions state
      // so they display immediately in the Answer Review panel
      if (Array.isArray(resultData.questionResults)) {
        const correctAnswerMap: Record<string, string> = {};
        resultData.questionResults.forEach((qr: any) => {
          if (qr.questionId && qr.correctAnswer) {
            correctAnswerMap[String(qr.questionId)] = qr.correctAnswer;
          }
        });

        setQuestions(prevQuestions => prevQuestions.map(qn => {
          const qOriginalId = String(qn.id).split('_idx_')[0];
          const savedCorrect = correctAnswerMap[qOriginalId];
          if (savedCorrect) {
            return { ...qn, correctAnswer: savedCorrect };
          }
          return qn;
        }));
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      const totalQuestions = questions.length;
      const answeredCount = Object.keys(answers).length;
      let correctCount = 0;
      let wrongCount = 0;
      let totalMarks = 0;
      let obtainedMarks = 0;
      let negativeMarksTotal = 0;
      questions.forEach(q => {
        const tMarks = (test?.marksPerQuestion !== undefined && test?.marksPerQuestion !== null && test?.marksPerQuestion !== '') ? Number(test.marksPerQuestion) :
          (test?.marks !== undefined && test?.marks !== null && test?.marks !== '') ? Number(test.marks) : null;

        const qMarks = (q.marks !== undefined && q.marks !== null && q.marks !== '') ? Number(q.marks) :
          (q.positiveMarks !== undefined && q.positiveMarks !== null && q.positiveMarks !== '') ? Number(q.positiveMarks) : null;

        const marks = tMarks !== null ? tMarks : (qMarks !== null ? qMarks : 0);

        const tNeg = (test?.negativeMarking !== undefined && test?.negativeMarking !== null && test?.negativeMarking !== '') ? test.negativeMarking :
          (test?.negative !== undefined && test?.negative !== null && test?.negative !== '') ? test.negative : null;

        const qNeg = (q.negativeMarks !== undefined && q.negativeMarks !== null && q.negativeMarks !== '') ? q.negativeMarks :
          (q.negative !== undefined && q.negative !== null && q.negative !== '') ? q.negative : null;

        const negMarks = Math.abs(Number(tNeg !== null ? tNeg : (qNeg !== null ? qNeg : 0)));

        totalMarks += marks;
        const studentAns = answers[q.id];
        if (studentAns) {
          const isCorrect = studentAns.toString().toUpperCase().trim() === (q.correctAnswer || '').toString().toUpperCase().trim();
          if (isCorrect) {
            correctCount++;
            obtainedMarks += marks;
          } else {
            wrongCount++;
            negativeMarksTotal += negMarks;
            obtainedMarks -= negMarks;
          }
        }
      });
      setResult({
        totalQuestions,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        unanswered: totalQuestions - answeredCount,
        totalMarks,
        obtainedMarks: Math.max(0, obtainedMarks),
        negativeMarksTotal,
        percentage: totalMarks > 0 ? Math.round((Math.max(0, obtainedMarks) / totalMarks) * 100) : 0,
        timeTaken
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }, [submitted, submitting, testId, student, answers, questions, test, launchedSeriesId]);

  useEffect(() => {
    const needsTerms = test?.termsAndConditions && test?.termsAndConditions.trim() !== '' && test?.termsAndConditions !== '<p><br></p>';
    if (questions.length > 0 && !submitted && timeLeft > 0 && (!needsTerms || hasAcceptedTerms)) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          // Hard Expiry Real-time Protection
          const hardExpiryStr = test?.closeDate || test?.endDate || test?.validity;
          if (hardExpiryStr) {
            const hardExpiryDate = new Date(hardExpiryStr);
            if (!isNaN(hardExpiryDate.getTime()) && new Date() > hardExpiryDate) {
              console.log('[Timer] Hard expiry reached! Auto-submitting...');
              if (timerRef.current) clearInterval(timerRef.current);
              handleSubmit(true);
              return 0;
            }
          }

          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questions.length, submitted, hasAcceptedTerms, timeLeft > 0, test?.termsAndConditions, test?.closeDate, test?.endDate, handleSubmit]);

  useEffect(() => {
    const needsTerms = test?.termsAndConditions && test?.termsAndConditions.trim() !== '' && test?.termsAndConditions !== '<p><br></p>';
    
    // Only trap back button if the test is actively running (terms accepted or not needed)
    if (submitted || loading || questions.length === 0 || (needsTerms && !hasAcceptedTerms)) return;
    
    // Capture the existing React Router state so we don't break location.state
    const currentState = window.history.state;
    
    // Push TWO entries so the first swipe back stays on test page and fires popstate
    window.history.pushState(currentState, '', window.location.href);
    window.history.pushState(currentState, '', window.location.href);
    
    const handlePopState = () => {
      setShowBackModal(true);
      // Re-push to keep user on test page
      window.history.pushState(currentState, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [submitted, loading, questions.length, hasAcceptedTerms, test?.termsAndConditions]);

  // Handle browser back button on Result Page
  useEffect(() => {
    if (!submitted) return;

    // Push a state so popstate fires
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      if (launchedSeriesId) {
        navigate(`/mock-tests/${launchedSeriesId}`, { replace: true });
      } else {
        navigate('/mock-tests', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [submitted, launchedSeriesId, navigate]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const totalDuration = (test?.duration || 60) * 60;
    const pct = timeLeft / totalDuration;
    if (pct <= 0.1) return 'text-[#D32F2F] bg-red-50';
    if (pct <= 0.25) return 'text-amber-600 bg-amber-50';
    return 'text-[#1A237E] bg-blue-50';
  };

  const selectAnswer = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });
  };

  const clearAnswer = (questionId: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  };

  const getQuestionStatus = (questionId: string): QuestionStatus => {
    const isAnswered = answers[questionId] !== undefined;
    const isFlagged = flagged.has(questionId);
    if (isAnswered && isFlagged) return 'flagged-answered';
    if (isAnswered) return 'answered';
    if (isFlagged) return 'flagged';
    return 'unanswered';
  };


  useEffect(() => {
    if (submitted && testId) {
      fetchLeaderboard();
    }
  }, [submitted, testId]);

  const fetchLeaderboard = async () => {
    try {
      setFetchingLeaderboard(true);
      const res = await fetch(`/api/tests/${testId}/leaderboard?limit=10`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setFetchingLeaderboard(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-rounded animate-spin text-5xl text-[#303F9F]">progress_activity</span>
          <p className="text-sm text-gray-500 mt-3">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl p-8 shadow-sm max-w-sm w-full">
          <span className="material-symbols-rounded text-5xl text-[#D32F2F]">error</span>
          <p className="text-sm text-gray-600 mt-3">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 bg-[#1A237E] text-white px-6 py-2 rounded-lg text-sm font-bold">
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const pctColor = result.percentage >= 70 ? 'text-green-600' : result.percentage >= 40 ? 'text-amber-600' : 'text-[#D32F2F]';
    return (
      <div className="bg-gray-50 pb-8">
        <header className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-4 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-white/20"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold">Test Results</h1>
          </div>
        </header>

        <div className="p-4 max-w-5xl mx-auto space-y-4">
          {/* A) OVERALL ANALYSIS CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 flex flex-col items-center">
            <h3 className="text-gray-800 text-[11px] font-black w-full text-left mb-2">Overall Analysis</h3>
            <div className="relative w-[130px] h-[130px] mb-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="65" cy="65" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                <circle cx="65" cy="65" r="58" stroke="currentColor" strokeWidth="10" fill="transparent"
                  strokeDasharray={364.42}
                  strokeDashoffset={364.42 - (364.42 * (result.percentage || 0)) / 100}
                  strokeLinecap="round"
                  className="text-[#1A237E] transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Overall</span>
                <span className="text-xl font-black text-[#1A237E]">{result.percentage}%</span>
              </div>
            </div>
            <div className="text-center mb-2">
              <div className="text-xl font-black text-gray-800 leading-none">
                {result.obtainedMarks} <span className="text-gray-300 text-[10px] font-medium">/ {result.totalMarks}</span>
              </div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Marks Obtained</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 w-full border-t border-gray-50 pt-2.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                <span className="text-[9px] font-bold">{result.correctAnswers} Correct</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                <span className="text-[9px] font-bold">{result.wrongAnswers} Wrong</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span className="text-[9px] font-bold">{result.unanswered} Skipped</span>
              </div>
            </div>
          </div>

          {/* Solution Button - Placed between Overall Analysis and Rank */}
          <button
            onClick={() => setViewMode('solutions')}
            className="w-full bg-white text-[#1A237E] py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-sm border border-blue-100 hover:bg-blue-50 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-rounded text-[22px]">visibility</span>
            VIEW DETAILED SOLUTIONS & REVIEW
          </button>

          {viewMode === 'summary' && (
            <>

              {/* B) RANK + SCORE CARD */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 flex flex-col items-center">
                <div className="w-full text-center py-1">
                  <h2 className="text-2xl font-black text-[#1A237E] tracking-tight">Rank #{result.rank || '--'}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    {result.totalStudents ? `Of ${result.totalStudents} Students` : 'Of -- Students'}
                  </p>
                </div>
                <div className="w-full space-y-2 mt-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Your Score</p>
                      <p className="text-base font-black text-gray-800">{result.obtainedMarks} / {result.totalMarks}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Percentage</p>
                      <p className="text-base font-black text-[#1A237E]">{result.percentage}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] rounded-full transition-all duration-1000" style={{ width: `${result.percentage}%` }}></div>
                  </div>
                </div>
              </div>

              {/* C) TIME ANALYSIS CARD */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 flex flex-col items-center">
                <h3 className="text-gray-800 text-[11px] font-black w-full text-left mb-0.5">Time Analysis</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest w-full text-left mb-3">
                  Total Test Time: {formatTime((test?.duration || 60) * 60)}
                </p>
                <div className="relative w-[130px] h-[130px] mb-2">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="65" cy="65" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                    <circle cx="65" cy="65" r="58" stroke="currentColor" strokeWidth="10" fill="transparent"
                      strokeDasharray={364.42}
                      strokeDashoffset={364.42 - (364.42 * Math.min(100, (result.timeTaken / (Math.max(1, (test?.duration || 60)) * 60)) * 100)) / 100}
                      strokeLinecap="round"
                      className="text-purple-600 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Time</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Distribution</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-gray-800 leading-none">{formatTime(result.timeTaken)}</div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Time Taken</p>
                </div>
              </div>

              {/* D) PERFORMANCE DETAILS STRIP */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { label: 'Correct', value: result.correctAnswers, color: 'text-green-600', bg: 'bg-green-50', icon: 'check_circle' },
                  { label: 'Wrong', value: result.wrongAnswers, color: 'text-red-600', bg: 'bg-red-50', icon: 'cancel' },
                  { label: 'Skipped', value: result.unanswered, color: 'text-gray-500', bg: 'bg-gray-50', icon: 'remove_circle' },
                  { label: 'Accuracy', value: `${result.percentage}%`, color: 'text-[#1A237E]', bg: 'bg-blue-50', icon: 'ads_click' },
                  { label: 'Total Questions', value: result.totalQuestions, color: 'text-gray-700', bg: 'bg-gray-100', icon: 'quiz' },
                  { label: 'Negative Marks', value: `-${result.negativeMarksTotal || 0}`, color: 'text-amber-700', bg: 'bg-amber-50', icon: 'trending_down' }
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-2 flex flex-col border border-transparent`}>
                    <span className="material-symbols-rounded text-base mb-0.5 opacity-70">{stat.icon}</span>
                    <div className={`text-base font-black ${stat.color} leading-none`}>{stat.value}</div>
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Leaderboard Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 border-b border-gray-50 flex flex-col">
                  <h2 className="text-base font-black text-gray-800 tracking-tight">Leaderboard</h2>
                  <p className="text-[8px] text-gray-400 font-medium">Top 10 Students</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                        <th className="px-3 py-1.5">Rank</th>
                        <th className="px-3 py-1.5">Student</th>
                        <th className="px-3 py-1.5">Marks</th>
                        <th className="px-3 py-1.5">Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      {fetchingLeaderboard ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center">
                            <span className="material-symbols-rounded animate-spin text-xl text-gray-300">progress_activity</span>
                          </td>
                        </tr>
                      ) : leaderboard.length > 0 ? (
                        leaderboard.map((row, idx) => {
                          const isMe = String(row.studentId) === String(student?.id);
                          return (
                            <tr key={idx} className={`border-b border-gray-50 transition-colors ${isMe ? 'bg-blue-50/50' : 'hover:bg-gray-50/30'}`}>
                              <td className="px-3 py-1.5">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px]
                                                ${row.rank === 1 ? 'bg-amber-100 text-amber-600' :
                                    row.rank === 2 ? 'bg-slate-100 text-slate-500' :
                                      row.rank === 3 ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}>
                                  {row.rank}
                                </div>
                              </td>
                              <td className="px-3 py-1.5">
                                <span className={`font-bold ${isMe ? 'text-[#1A237E]' : 'text-gray-700'}`}>
                                  {row.studentName || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 font-black text-gray-800">{row.obtainedMarks}</td>
                              <td className="px-3 py-1.5 text-gray-500 font-medium">{formatTime(row.timeTaken)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-400 font-medium">Leaderboard not available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Current Rank if not in Top 10 */}
              {result.rank > 10 && (
                <div className="bg-[#1A237E] rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-blue-900/20">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-sm">info</span>
                    <span className="text-xs font-bold">Your Position: <span className="text-amber-400">#{result.rank}</span></span>
                  </div>
                </div>
              )}
            </>
          )}

          {viewMode === 'solutions' && (
            <div className="space-y-4 pb-4">
              <button
                onClick={() => setViewMode('summary')}
                className="flex items-center gap-2 text-[#1A237E] font-bold text-sm bg-white px-4 py-2.5 rounded-xl shadow-sm border border-blue-50 hover:bg-blue-100 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-rounded">arrow_back</span>
                Back to Result Summary
              </button>

              {questions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                  <h3 className="font-bold text-sm mb-3 text-gray-700">Answer Review</h3>
                  <div className="space-y-3">
                    {questions.map((q, idx) => {
                      const studentAns = answers[q.id] || answers[String(q.id).split('_idx_')[0]] || null;
                      const correctAns = q.correctAnswer;
                      const isCorrect = studentAns ? studentAns.toString().toUpperCase() === correctAns.toString().toUpperCase() : false;
                      return (
                        <div key={q.id} className={`p-3 rounded-lg border ${studentAns ? (isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200 bg-gray-50'}`}>
                          <div className="text-xs font-semibold text-gray-700">
                            Q{idx + 1}. {renderQuestionText(q.questionEn || q.question || q.text)}
                            {q.questionHi && (
                              <div className="mt-1 text-gray-500 font-medium">
                                {renderQuestionText(q.questionHi)}
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-[10px]">
                            {studentAns ? (
                              <span className={isCorrect ? 'text-green-600' : 'text-[#D32F2F]'}>
                                Your answer: {studentAns} {isCorrect ? '✓' : `✗ (Correct: ${correctAns})`}
                              </span>
                            ) : (
                              <span className="text-gray-400">Not answered (Correct: {correctAns})</span>
                            )}
                          </div>
                          {q.explanation && (
                            <p className="text-[10px] text-gray-500 mt-1 italic">{q.explanation}</p>
                          )}
                          <button
                            onClick={() => setReportModal({ isOpen: true, question: q })}
                            className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-bold hover:bg-amber-50 p-1 rounded transition-colors"
                          >
                            <span className="material-symbols-rounded text-[14px]">report</span>
                            Report Issue
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'summary' && (
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-[#1A237E] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-[18px]">arrow_back</span>
              Back to Mock Tests
            </button>
          )}

          {/* Report Question Modal (inside results view) */}
          {reportModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                  <h3 className="text-sm font-bold text-gray-800">Report Issue</h3>
                  <button
                    onClick={() => setReportModal(null)}
                    className="text-gray-400 hover:text-black transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">close</span>
                  </button>
                </div>

                <div className="p-6">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Question Content</p>
                    <p className="text-[12px] text-amber-900 line-clamp-3 leading-relaxed">
                      {reportModal.question?.question || reportModal.question?.questionEn || reportModal.question?.text}
                    </p>
                  </div>

                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Select Issue Type</p>
                  <div className="space-y-2 mb-4">
                    {['Formatting Issue', 'Wrong Answer', 'Wrong Question', 'Image Hidden/Broken', 'Other'].map(issue => (
                      <button
                        key={issue}
                        onClick={() => setReportIssue(issue)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-[13px] transition-all ${reportIssue === issue
                          ? 'border-[#1A237E] bg-blue-50 text-[#1A237E] font-bold shadow-sm'
                          : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        {issue}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comment (Optional)</p>
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    placeholder="Explain the issue in detail..."
                    className="w-full h-24 p-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] mb-5 focus:outline-none focus:border-[#1A237E] focus:bg-white transition-all resize-none"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setReportModal(null)}
                      className="flex-1 py-3 rounded-xl border border-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReportSubmit}
                      disabled={!reportIssue || reportingStatus}
                      className="flex-1 py-3 rounded-xl bg-[#1A237E] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all"
                    >
                      {reportingStatus ? (
                        <span className="material-symbols-rounded animate-spin text-[18px]">progress_activity</span>
                      ) : (
                        <>
                          <span className="material-symbols-rounded text-[18px]">send</span>
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isSectionEnabled = (test?.enableSectionSelector === true || test?.enableSectionSelector === 'true') && Array.isArray(test?.sections) && test.sections.length > 0;

  const displayQuestions = isSectionEnabled && activeSectionId
    ? questions.filter((q: any) => String(q.sectionId) === String(activeSectionId))
    : questions;

  const currentQuestion = displayQuestions[currentIndex];
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length;
  const flaggedCount = questions.filter(q => flagged.has(q.id)).length;
  const remainingCount = questions.length - answeredCount;
  const isSectionMode = Array.isArray(test?.sections) && test.sections.length > 0 && !!activeSectionId;
  const currentSectionIndex = isSectionMode 
    ? test.sections.findIndex((s: any) => String(s.id) === String(activeSectionId)) 
    : -1;
  const isLastQuestionInSection = currentIndex === displayQuestions.length - 1;
  const isLastSection = !isSectionMode || currentSectionIndex === -1 || currentSectionIndex === test.sections.length - 1;
  const isFinalQuestionOfTest = isLastQuestionInSection && isLastSection;

  const handleNextSection = () => {
    if (!test?.sections || currentSectionIndex === -1) return;
    const nextSection = test.sections[currentSectionIndex + 1];
    if (nextSection) {
      setActiveSectionId(nextSection.id.toString());
      setCurrentIndex(0);
      setShowPalette(false);
    }
  };

  const needsTerms = test?.termsAndConditions && test?.termsAndConditions.trim() !== '' && test?.termsAndConditions !== '<p><br></p>';

  if (!loading && !error && !submitted && needsTerms && !hasAcceptedTerms) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-[#1A237E] text-white py-3 px-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              title="Back to Tests"
            >
              <span className="material-symbols-rounded text-[20px]">arrow_back</span>
            </button>
            <h1 className="text-sm font-bold flex-1 truncate">{test?.title || test?.name || 'Test Instructions'}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="p-4 md:p-6 border-b border-gray-100 bg-blue-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A237E]/10 flex items-center justify-center text-[#1A237E]">
                  <span className="material-symbols-rounded text-xl">gavel</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800 tracking-tight">Terms &amp; Conditions</h2>
                  <p className="text-xs text-gray-500 font-medium">Please read carefully before starting the test</p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 flex-1 overflow-y-auto prose max-w-none text-[14.5px] leading-relaxed text-gray-700 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol>li]:mb-2 [&>p]:mb-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(test.termsAndConditions || '') }} />

            <div className="p-5 md:p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
              <div className="text-xs text-center text-gray-500 mb-1">
                By clicking start, you agree to all the terms listed above. The timer will start immediately.
              </div>
              <button
                onClick={() => {
                  setHasAcceptedTerms(true);
                  startTimeRef.current = Date.now();
                }}
                className="w-full py-4 bg-[#1A237E] text-white rounded-xl text-[14px] font-bold uppercase tracking-wider hover:bg-[#283593] transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              >
                I Accept &amp; Start Test
                <span className="material-symbols-rounded text-[20px]">arrow_forward</span>
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 bg-white text-gray-600 rounded-xl text-[13px] font-bold border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1A237E] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => {
              setShowBackModal(true);
            }}
            className="p-1.5 rounded-full hover:bg-white/20"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
          <h1 className="text-sm font-bold truncate">{test?.title || test?.name || 'Test'}</h1>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getTimerColor()} font-mono font-bold text-sm`}>
          <span className="material-symbols-rounded text-[16px]">timer</span>
          {formatTime(timeLeft)}
        </div>
      </header>

      {isSectionEnabled && (
        <div className="bg-white border-b border-gray-100 overflow-x-auto hide-scrollbar flex items-center px-4 py-2 shadow-sm sticky top-[60px] z-20">
          {test.sections.map((sec: any) => {
            const secQCount = questions.filter(
              (q: any) => String(q.sectionId) === String(sec.id)
            ).length;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionId(sec.id.toString());
                  setCurrentIndex(0);
                  setShowPalette(false);
                }}
                className={`whitespace-nowrap px-4 py-2 text-[13px] font-bold rounded-lg transition-all mx-1 ${activeSectionId === sec.id.toString()
                  ? 'bg-[#1A237E]/10 text-[#1A237E]'
                  : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {sec.partTitle || sec.section || 'Section'}
                {secQCount > 0 && (
                  <span className="ml-1.5 text-[11px] opacity-70">
                    ({secQCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {answeredCount} Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            {remainingCount} Remaining
          </span>
          {flaggedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {flaggedCount} Flagged
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="flex items-center gap-1 text-[#303F9F] text-xs font-bold"
        >
          <span className="material-symbols-rounded text-[16px]">grid_view</span>
          {displayQuestions.length > 0 ? currentIndex + 1 : 0}/{displayQuestions.length}
        </button>
      </div>

      {showPalette && (
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-700">Question Palette</h3>
            <button onClick={() => setShowPalette(false)}>
              <span className="material-symbols-rounded text-gray-400 text-[18px]">close</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayQuestions.map((q, idx) => {
              const status = getQuestionStatus(q.id);
              let bg = 'bg-gray-100 text-gray-600';
              if (status === 'answered') bg = 'bg-green-500 text-white';
              else if (status === 'flagged') bg = 'bg-amber-500 text-white';
              else if (status === 'flagged-answered') bg = 'bg-purple-500 text-white';
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => { setCurrentIndex(idx); setShowPalette(false); }}
                  className={`w-9 h-9 rounded-lg text-xs font-bold ${bg} ${isCurrent ? 'ring-2 ring-[#1A237E] ring-offset-1' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-[9px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500"></span> Flagged</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border"></span> Not Visited</span>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto">
        {currentQuestion ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[#303F9F] bg-blue-50 px-2 py-1 rounded">
                Question {currentIndex + 1} of {displayQuestions.length}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-green-600">
                    +{(function () {
                      const tMarks = (test?.marksPerQuestion !== undefined && test?.marksPerQuestion !== null && test?.marksPerQuestion !== '') ? Number(test.marksPerQuestion) :
                        (test?.marks !== undefined && test?.marks !== null && test?.marks !== '') ? Number(test.marks) : null;
                      const qMarks = (currentQuestion?.marks !== undefined && currentQuestion?.marks !== null && currentQuestion?.marks !== '') ? Number(currentQuestion?.marks) :
                        (currentQuestion?.positiveMarks !== undefined && currentQuestion?.positiveMarks !== null && currentQuestion?.positiveMarks !== '') ? Number(currentQuestion?.positiveMarks) : null;
                      return tMarks !== null ? tMarks : (qMarks !== null ? qMarks : 0);
                    })()}
                  </span>
                  <span className="text-[10px] font-black text-red-500">
                    -{(function () {
                      const tNeg = (test?.negativeMarking !== undefined && test?.negativeMarking !== null && test?.negativeMarking !== '') ? test.negativeMarking :
                        (test?.negative !== undefined && test?.negative !== null && test?.negative !== '') ? test.negative : null;
                      const qNeg = (currentQuestion?.negativeMarks !== undefined && currentQuestion?.negativeMarks !== null && currentQuestion?.negativeMarks !== '') ? currentQuestion?.negativeMarks :
                        (currentQuestion?.negative !== undefined && currentQuestion?.negative !== null && currentQuestion?.negative !== '') ? currentQuestion?.negative : null;
                      return Math.abs(Number(tNeg !== null ? tNeg : (qNeg !== null ? qNeg : 0)));
                    })()}
                  </span>
                </div>
                <button
                  onClick={() => currentQuestion && setReportModal({ isOpen: true, question: currentQuestion })}
                  className="p-1.5 rounded-full bg-gray-100 text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Report Issue"
                >
                  <span className="material-symbols-rounded text-[18px]">report</span>
                </button>
                <button
                  onClick={() => currentQuestion && toggleFlag(currentQuestion.id)}
                  className={`p-1.5 rounded-full ${flagged.has(currentQuestion?.id) ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}
                >
                  <span className="material-symbols-rounded text-[18px]">
                    {flagged.has(currentQuestion?.id) ? 'flag' : 'outlined_flag'}
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-800 leading-relaxed">
                  {renderQuestionText(currentQuestion.questionEn || currentQuestion.question || currentQuestion.text)}
                </div>
                {(currentQuestion.questionHi) && (
                  <div className="text-[13px] text-gray-600 leading-relaxed border-t border-gray-50 pt-2">
                    {renderQuestionText(currentQuestion.questionHi)}
                  </div>
                )}
              </div>
              {currentQuestion.questionImage && (
                <img src={getImageUrl(currentQuestion.questionImage)} alt="Question" className="mt-3 max-w-full rounded-lg border max-h-60 object-contain" />
              )}
            </div>

            <div className="space-y-3">
              {[
                { key: 'A', value: currentQuestion.optionA || currentQuestion.displayOptions?.[0]?.text, image: currentQuestion.optionAImage || currentQuestion.displayOptions?.[0]?.image },
                { key: 'B', value: currentQuestion.optionB || currentQuestion.displayOptions?.[1]?.text, image: currentQuestion.optionBImage || currentQuestion.displayOptions?.[1]?.image },
                { key: 'C', value: currentQuestion.optionC || currentQuestion.displayOptions?.[2]?.text, image: currentQuestion.optionCImage || currentQuestion.displayOptions?.[2]?.image },
                { key: 'D', value: currentQuestion.optionD || currentQuestion.displayOptions?.[3]?.text, image: currentQuestion.optionDImage || currentQuestion.displayOptions?.[3]?.image },
              ].map(opt => {
                if (!opt.value && !opt.image) return null;
                const isSelected = answers[currentQuestion.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => currentQuestion && selectAnswer(currentQuestion.id, opt.key)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${currentQuestion && answers[currentQuestion.id] === opt.key
                      ? 'border-[#1A237E] bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${isSelected ? 'bg-[#1A237E] text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {opt.key}
                    </span>
                    <div className="flex-1 min-w-0">
                      {opt.value && (
                        <div className={`text-sm ${isSelected ? 'text-[#1A237E] font-semibold' : 'text-gray-700'}`}>
                          {renderQuestionText(opt.value)}
                        </div>
                      )}
                      {opt.image && (
                        <img src={getImageUrl(opt.image)} alt={`Option ${opt.key}`} className="mt-1 max-h-32 rounded border object-contain" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {answers[currentQuestion.id] && (
              <button
                onClick={() => clearAnswer(currentQuestion.id)}
                className="mt-3 text-[#D32F2F] text-xs font-bold flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-[14px]">clear</span>
                Clear Response
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-rounded text-5xl text-gray-300">quiz</span>
            <p className="text-sm text-gray-400 mt-3">No questions available for this test</p>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between sticky bottom-0">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-bold ${currentIndex === 0 ? 'text-gray-300 bg-gray-50' : 'text-[#303F9F] bg-blue-50'
            }`}
        >
          <span className="material-symbols-rounded text-[16px]">chevron_left</span>
          Previous
        </button>

        {isFinalQuestionOfTest ? (
          <button
            onClick={() => setConfirmSubmit(true)}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-xs font-bold bg-[#D32F2F] text-white"
          >
            <span className="material-symbols-rounded text-[16px]">send</span>
            Submit
          </button>
        ) : isLastQuestionInSection && !isLastSection ? (
          <button
            onClick={handleNextSection}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#1A237E] text-white"
          >
            Next Section
            <span className="material-symbols-rounded text-[16px]">chevron_right</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => Math.min(displayQuestions.length - 1, prev + 1))}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#1A237E] text-white"
          >
            Next
            <span className="material-symbols-rounded text-[16px]">chevron_right</span>
          </button>
        )}
      </div>

      {showBackModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-rounded text-[#1A237E] text-3xl">quiz</span>
              </div>
              {/* <h3 className="font-bold text-lg text-gray-800">Test chhod rahe ho?</h3> */}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowBackModal(false)}
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-bold"
              >
                Resume Test
              </button>
              <button
                onClick={async () => {
                  setShowBackModal(false);
                  await handleSubmit(false);
                }}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="material-symbols-rounded animate-spin text-[16px]">progress_activity</span>
                ) : 'Submit & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-rounded text-amber-600 text-3xl">warning</span>
              </div>
              <h3 className="font-bold text-lg text-gray-800">Submit Test?</h3>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to submit?</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Answered</span>
                <span className="font-bold text-green-600">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Unanswered</span>
                <span className="font-bold text-[#D32F2F]">{remainingCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Flagged</span>
                <span className="font-bold text-amber-600">{flaggedCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Time Remaining</span>
                <span className="font-bold text-gray-700">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-[#D32F2F] text-white text-sm font-bold flex items-center justify-center gap-1"
              >
                {submitting ? (
                  <span className="material-symbols-rounded animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-[16px]">send</span>
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Question Modal (during active test) */}
      {reportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <h3 className="text-sm font-bold text-gray-800">Report Issue</h3>
              <button
                onClick={() => setReportModal(null)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <span className="material-symbols-rounded text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">Question Content</p>
                <p className="text-[12px] text-amber-900 line-clamp-3 leading-relaxed">
                  {reportModal.question?.question || reportModal.question?.questionEn || reportModal.question?.text}
                </p>
              </div>

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Select Issue Type</p>
              <div className="space-y-2 mb-4">
                {['Formatting Issue', 'Wrong Answer', 'Wrong Question', 'Image Hidden/Broken', 'Other'].map(issue => (
                  <button
                    key={issue}
                    onClick={() => setReportIssue(issue)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-[13px] transition-all ${reportIssue === issue
                      ? 'border-[#1A237E] bg-blue-50 text-[#1A237E] font-bold shadow-sm'
                      : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
                  >
                    {issue}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Comment (Optional)</p>
              <textarea
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                placeholder="Explain the issue in detail..."
                className="w-full h-24 p-3 bg-gray-50 border border-gray-100 rounded-xl text-[13px] mb-5 focus:outline-none focus:border-[#1A237E] focus:bg-white transition-all resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setReportModal(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={!reportIssue || reportingStatus}
                  className="flex-1 py-3 rounded-xl bg-[#1A237E] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] transition-all"
                >
                  {reportingStatus ? (
                    <span className="material-symbols-rounded animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-rounded text-[18px]">send</span>
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTaking;
