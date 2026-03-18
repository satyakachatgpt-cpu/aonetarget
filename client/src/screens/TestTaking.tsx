import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

type QuestionStatus = 'unanswered' | 'answered' | 'flagged' | 'flagged-answered';

const TestTaking: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

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
  const [student, setStudent] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent && storedStudent !== 'undefined') {
      try {
        setStudent(JSON.parse(storedStudent));
      } catch (e) {
        console.error('Failed to parse student data', e);
      }
    }
    fetchTestData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testId]);

  const fetchTestData = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (!res.ok) throw new Error('Test not found');
      const testData = await res.json();
      if (!testData || typeof testData !== 'object') throw new Error('Invalid test data');
      setTest(testData);
      const q = Array.isArray(testData.questions) ? testData.questions : [];
      setQuestions(q);
      const durationSecs = (testData.duration || 60) * 60;
      setTimeLeft(durationSecs);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      setError(err.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0 && !submitted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
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
  }, [questions.length, submitted]);

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

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitted || submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student?.id || 'anonymous',
          answers,
          timeTaken
        })
      });

      if (!res.ok) throw new Error('Failed to submit');
      const resultData = await res.json();
      setResult(resultData);
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
      const testNegMarking = test?.negativeMarking || 0;
      questions.forEach(q => {
        const marks = q.marks || test?.marksPerQuestion || 4;
        const negMarks = q.negativeMarks || testNegMarking || 0;
        totalMarks += marks;
        if (answers[q.id]) {
          if (answers[q.id] === q.correctAnswer) {
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
  }, [submitted, submitting, testId, student, answers, questions]);

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
          <button onClick={() => navigate('/mock-tests')} className="mt-4 bg-[#1A237E] text-white px-6 py-2 rounded-lg text-sm font-bold">
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const pctColor = result.percentage >= 70 ? 'text-green-600' : result.percentage >= 40 ? 'text-amber-600' : 'text-[#D32F2F]';
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-4 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (test?.courseId) navigate(`/course/${test.courseId}`);
                else navigate(-1);
              }}
              className="p-2 rounded-full hover:bg-white/20"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold">Test Results</h1>
          </div>
        </header>

        <div className="p-4 max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center mb-4">
            <div className={`text-5xl font-black ${pctColor}`}>{result.percentage}%</div>
            <p className="text-gray-500 text-sm mt-1">Your Score</p>
            <div className="mt-3 text-lg font-bold text-gray-800">
              {result.obtainedMarks} / {result.totalMarks} Marks
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-rounded text-green-600">check_circle</span>
              </div>
              <div className="text-lg font-bold text-green-600">{result.correctAnswers}</div>
              <p className="text-[10px] text-gray-400">Correct</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-rounded text-[#D32F2F]">cancel</span>
              </div>
              <div className="text-lg font-bold text-[#D32F2F]">{result.wrongAnswers}</div>
              <p className="text-[10px] text-gray-400">Wrong</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-rounded text-gray-500">remove_circle</span>
              </div>
              <div className="text-lg font-bold text-gray-500">{result.unanswered}</div>
              <p className="text-[10px] text-gray-400">Skipped</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Time Taken</span>
              <span className="font-bold text-gray-800">{formatTime(result.timeTaken)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Total Questions</span>
              <span className="font-bold text-gray-800">{result.totalQuestions}</span>
            </div>
            {result.negativeMarksTotal > 0 && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Negative Marks</span>
                <span className="font-bold text-[#D32F2F]">-{result.negativeMarksTotal}</span>
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <h3 className="font-bold text-sm mb-3 text-gray-700">Answer Review</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((q, idx) => {
                  const studentAns = answers[q.id];
                  const isCorrect = studentAns === q.correctAnswer;
                  return (
                    <div key={q.id} className={`p-3 rounded-lg border ${studentAns ? (isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200 bg-gray-50'}`}>
                      <p className="text-xs font-semibold text-gray-700">Q{idx + 1}. {q.question}</p>
                      <div className="mt-1 text-[10px]">
                        {studentAns ? (
                          <span className={isCorrect ? 'text-green-600' : 'text-[#D32F2F]'}>
                            Your answer: {studentAns} {isCorrect ? '✓' : `✗ (Correct: ${q.correctAnswer})`}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not answered (Correct: {q.correctAnswer})</span>
                        )}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] text-gray-500 mt-1 italic">{q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (test?.courseId) navigate(`/course/${test.courseId}`);
              else navigate('/mock-tests');
            }}
            className="w-full bg-[#1A237E] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-rounded text-[18px]">arrow_back</span>
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flagged.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1A237E] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => {
              if (test?.courseId) navigate(`/course/${test.courseId}`);
              else setConfirmSubmit(true);
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

      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {answeredCount} Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            {questions.length - answeredCount} Remaining
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
          {currentIndex + 1}/{questions.length}
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
            {questions.map((q, idx) => {
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
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{currentQuestion?.marks || test?.marksPerQuestion || 1} mark{(currentQuestion?.marks || 1) > 1 ? 's' : ''}</span>
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
              <p className="text-sm font-medium text-gray-800 leading-relaxed">{currentQuestion.question}</p>
              {currentQuestion.questionImage && (
                <img src={currentQuestion.questionImage} alt="Question" className="mt-3 max-w-full rounded-lg border max-h-60 object-contain" />
              )}
              {(test?.negativeMarking > 0 || currentQuestion.negativeMarks > 0) && (
                <p className="text-[10px] text-[#D32F2F] mt-2 flex items-center gap-1">
                  <span className="material-symbols-rounded text-[12px]">remove_circle</span>
                  Negative marking: -{currentQuestion.negativeMarks || test?.negativeMarking || 0} marks for wrong answer
                </p>
              )}
            </div>

            <div className="space-y-3">
              {[
                { key: 'A', value: currentQuestion.optionA, image: currentQuestion.optionAImage },
                { key: 'B', value: currentQuestion.optionB, image: currentQuestion.optionBImage },
                { key: 'C', value: currentQuestion.optionC, image: currentQuestion.optionCImage },
                { key: 'D', value: currentQuestion.optionD, image: currentQuestion.optionDImage },
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
                        <span className={`text-sm ${isSelected ? 'text-[#1A237E] font-semibold' : 'text-gray-700'}`}>
                          {opt.value}
                        </span>
                      )}
                      {opt.image && (
                        <img src={opt.image} alt={`Option ${opt.key}`} className="mt-1 max-h-32 rounded border object-contain" />
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

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => setConfirmSubmit(true)}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-xs font-bold bg-[#D32F2F] text-white"
          >
            <span className="material-symbols-rounded text-[16px]">send</span>
            Submit
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#1A237E] text-white"
          >
            Next
            <span className="material-symbols-rounded text-[16px]">chevron_right</span>
          </button>
        )}
      </div>

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
                <span className="font-bold text-[#D32F2F]">{questions.length - answeredCount}</span>
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
    </div>
  );
};

export default TestTaking;
