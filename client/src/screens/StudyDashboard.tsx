
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is the SI unit of Electric Charge?",
    options: ["Volt", "Coulomb", "Ampere", "Ohm"],
    correct: 1,
    explanation: "The SI unit of electric charge is the Coulomb (C), named after Charles-Augustin de Coulomb."
  },
  {
    id: 2,
    question: "According to Coulomb's Law, the force between two point charges is inversely proportional to:",
    options: ["The distance between them", "The sum of their charges", "The square of the distance between them", "The product of their charges"],
    correct: 2,
    explanation: "Coulomb's Law states F = k(q1q2/r²), where r is the distance. Thus, force is inversely proportional to the square of the distance."
  },
  {
    id: 3,
    question: "A glass rod rubbed with silk acquires which type of charge?",
    options: ["Negative", "Positive", "Neutral", "Both"],
    correct: 1,
    explanation: "When a glass rod is rubbed with silk, electrons are transferred from the rod to the silk, leaving the rod with a positive charge."
  }
];

const StudyDashboard: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (!msg.includes('Downloading')) {
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      setStudent(JSON.parse(storedStudent));
    }

    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const [courseRes, videosRes, notesRes, testsRes] = await Promise.all([
          fetch(`/api/courses/${id}`).then(r => r.json()),
          fetch(`/api/courses/${id}/videos`).then(r => r.json()),
          fetch(`/api/courses/${id}/notes`).then(r => r.json()),
          fetch(`/api/courses/${id}/tests`).then(r => r.json())
        ]);
        setCourse(courseRes);
        setVideos(Array.isArray(videosRes) ? videosRes : []);
        setNotes(Array.isArray(notesRes) ? notesRes : []);
        setTests(Array.isArray(testsRes) ? testsRes : []);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCourseData();
  }, [id]);

  // Download handler - saves to app's downloads collection AND caches file for offline use
  const handleDownload = async (item: any, type: 'video' | 'pdf' | 'audio') => {
    if (!student?.id) {
      showToast('Please login to download');
      return;
    }

    const fileUrl = item.fileUrl || item.youtubeUrl || item.url || '';
    if (!fileUrl) {
      showToast('Error: No file URL available to download.');
      return;
    }

    setDownloadingId(item._id || item.id);
    showToast('Downloading...');

    try {
      // 1. Save to Offline Cache first
      const cache = await caches.open('aone-downloads');
      try {
        const fileResponse = await fetch(fileUrl, { mode: 'cors' });
        if (fileResponse.ok) {
          await cache.put(fileUrl, fileResponse);
        } else {
          // fallback to no-cors if cors fails
          const opaqueResponse = await fetch(fileUrl, { mode: 'no-cors' });
          await cache.put(fileUrl, opaqueResponse);
        }
      } catch (e) {
        // network error or cors blocked entirely, try no-cors fallback
        const opaqueResponse = await fetch(fileUrl, { mode: 'no-cors' });
        await cache.put(fileUrl, opaqueResponse);
      }

      // 2. Save metadata to Database
      const downloadData = {
        id: `download_${Date.now()}`,
        title: item.title,
        type: type,
        fileUrl: fileUrl,
        size: item.fileSize || item.size || 'N/A',
        courseId: id,
        courseName: course?.name || course?.title,
        downloadedAt: new Date().toISOString()
      };

      const response = await fetch(`/api/students/${student.id}/downloads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadData)
      });

      if (response.ok) {
        showToast('Successfully downloaded to app library!');
      } else {
        showToast('Error: Failed to sync metadata.');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Error saving file offline.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === QUIZ_QUESTIONS[currentQuestionIndex].correct;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setIsAnswered(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="bg-[#F3F4F6] min-h-screen animate-fade-in flex flex-col">
      {/* Curved Header */}
      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-10 pb-6 px-4 rounded-b-[2.5rem] shadow-lg sticky top-0 z-40">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-brandBlue font-black text-xs">AT</div>
            <h1 className="text-lg font-bold">{course?.title || course?.name || 'Course Study'}</h1>
          </div>
          <button className="p-1 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">more_vert</span>
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <h2 className="text-base font-bold mb-1">नमस्ते, Student!</h2>
          <p className="text-[10px] opacity-80 mb-3">अपनी पढ़ाई जारी रखें</p>
          <div className="flex justify-between text-[10px] mb-1">
            <span>प्रगति (Progress)</span>
            <span className="font-bold">32%</span>
          </div>
          <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div className="bg-yellow-400 h-full" style={{ width: '32%' }}></div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-brandBlue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm">Loading course materials...</p>
          </div>
        ) : (
          <>
            {/* Resume Section - Hidden when taking a test for focus */}
            {activeTab !== 'tests' && videos.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="material-symbols-rounded text-brandBlue text-lg">play_circle</span> Continue Watching
                </h3>
                <div
                  className="bg-white rounded-xl shadow-sm p-3 border border-gray-100 flex gap-4 items-center cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => window.open(videos[0].youtubeUrl, '_blank')}
                >
                  <div className="relative w-24 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                    <img src={`https://img.youtube.com/vi/${videos[0].youtubeUrl?.includes('v=') ? videos[0].youtubeUrl.split('v=')[1].split('&')[0] : (videos[0].youtubeUrl?.includes('be/') ? videos[0].youtubeUrl.split('be/')[1].split('?')[0] : '')}/mqdefault.jpg`} className="w-full h-full object-cover" alt="Thumb" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="material-symbols-rounded text-white">play_arrow</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs truncate">{videos[0].title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{videos[0].duration} • Lesson 1</p>
                    <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div className="bg-brandBlue h-full w-0"></div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Tabs */}
            <section>
              <div className="flex border-b border-gray-200 mb-4">
                {['वीडियो (Videos)', 'नोट्स (Notes)', 'टेस्ट (Tests)'].map((tab) => {
                  const key = tab.toLowerCase().includes('video') ? 'videos' : tab.toLowerCase().includes('note') ? 'notes' : 'tests';
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 pb-3 text-xs font-bold transition-all ${isActive ? 'text-brandBlue border-b-2 border-brandBlue' : 'text-gray-400'}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              {activeTab === 'videos' && (
                <div className="space-y-4">
                  {videos.length > 0 ? (
                    videos.map((video, idx) => (
                      <div key={video._id || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:border-brandBlue transition-all">
                        <div className="p-4 flex gap-4 items-center">
                          <div
                            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-brandBlue group-hover:text-white transition-all cursor-pointer flex-shrink-0"
                            onClick={() => window.open(video.youtubeUrl, '_blank')}
                          >
                            <span className="material-symbols-rounded font-bold">{idx === 0 ? 'play_arrow' : 'lock'}</span>
                          </div>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => window.open(video.youtubeUrl, '_blank')}>
                            <h4 className="font-bold text-sm truncate">{video.title}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[8px] bg-blue-50 text-brandBlue px-1.5 py-0.5 rounded font-bold uppercase">Video</span>
                              <span className="text-[8px] text-gray-400">{video.duration}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(video, 'video');
                            }}
                            className="p-2 text-gray-400 group-hover:text-brandBlue group-hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                            title="Add to Downloads"
                          >
                            {downloadingId === (video._id || video.id) ? (
                              <span className="material-symbols-rounded animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-rounded">download</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
                      <span className="material-symbols-rounded text-gray-200 text-5xl">smart_display</span>
                      <p className="text-sm font-bold text-gray-400 mt-4">No videos found for this course</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {notes.length > 0 ? (
                    notes.map((note, idx) => (
                      <div key={note._id || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 items-center group hover:border-brandBlue transition-all">
                        <div className="w-10 h-10 bg-brandBlue/10 rounded-full flex items-center justify-center text-brandBlue flex-shrink-0">
                          <span className="material-symbols-rounded">description</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{note.title}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">PDF Document</p>
                        </div>
                        <button
                          onClick={() => handleDownload(note, 'pdf')}
                          className="p-2 text-gray-400 group-hover:text-brandBlue group-hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                          title="Add to Downloads"
                        >
                          {downloadingId === (note._id || note.id) ? (
                            <span className="material-symbols-rounded animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-rounded">download</span>
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
                      <span className="material-symbols-rounded text-gray-200 text-5xl">description</span>
                      <p className="text-sm font-bold text-gray-400 mt-2">कोई नोट्स उपलब्ध नहीं हैं (No notes available yet)</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="space-y-6">
                  {tests.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {tests.map((test, idx) => (
                        <div key={test._id || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 items-center">
                          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                            <span className="material-symbols-rounded">rule</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm">{test.title || test.name}</h4>
                            <p className="text-[10px] text-gray-400">{test.questions?.length || 0} Questions</p>
                          </div>
                          <button className="bg-brandBlue text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">Start</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
                      <span className="material-symbols-rounded text-gray-200 text-5xl">rule</span>
                      <p className="text-sm font-bold text-gray-400 mt-4">No tests available for this course</p>
                    </div>
                  )}

                  {/* Legacy Quiz for Demo purpose if no tests found */}
                  {tests.length === 0 && !quizCompleted && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in mt-12">
                      {/* Quiz Progress */}
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-brandBlue uppercase tracking-widest">
                          Demo Quiz: Q{currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                          Score: {score}
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-8 overflow-hidden">
                        <div
                          className="bg-brandBlue h-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                        ></div>
                      </div>

                      {/* Question */}
                      <h3 className="text-base font-bold text-[#1E293B] leading-relaxed mb-8">
                        {QUIZ_QUESTIONS[currentQuestionIndex].question}
                      </h3>

                      {/* Options */}
                      <div className="space-y-3 mb-8">
                        {QUIZ_QUESTIONS[currentQuestionIndex].options.map((option, idx) => {
                          let optionStyles = "border-gray-100 bg-white text-gray-700";
                          let icon = "";

                          if (selectedOption === idx) {
                            optionStyles = "border-[#1E293B] bg-[#1E293B]/5 text-[#1E293B]";
                          }

                          if (isAnswered) {
                            if (idx === QUIZ_QUESTIONS[currentQuestionIndex].correct) {
                              optionStyles = "border-green-500 bg-green-50 text-green-700";
                              icon = "check_circle";
                            } else if (selectedOption === idx) {
                              optionStyles = "border-red-500 bg-red-50 text-red-700";
                              icon = "cancel";
                            } else {
                              optionStyles = "border-gray-100 bg-white text-gray-400 opacity-50";
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleOptionSelect(idx)}
                              disabled={isAnswered}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex justify-between items-center group ${optionStyles}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${selectedOption === idx ? 'border-[#1E293B] bg-[#1E293B] text-white' : 'border-gray-200 text-gray-400'}`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="text-xs font-bold">{option}</span>
                              </div>
                              {icon && <span className={`material-symbols-rounded text-lg ${idx === QUIZ_QUESTIONS[currentQuestionIndex].correct ? 'text-green-500' : 'text-red-500'}`}>{icon}</span>}
                            </button>
                          );
                        })}
                      </div>

                      {/* Feedback Explanation */}
                      {isAnswered && (
                        <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Explanation:</p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {QUIZ_QUESTIONS[currentQuestionIndex].explanation}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      {!isAnswered ? (
                        <button
                          onClick={handleCheckAnswer}
                          disabled={selectedOption === null}
                          className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all ${selectedOption === null ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#1E293B] text-white hover:bg-[#1E293B]/90'}`}
                        >
                          Check Answer
                        </button>
                      ) : (
                        <button
                          onClick={handleNextQuestion}
                          className="w-full bg-gradient-to-r from-brandBlue to-[#1A237E] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                        >
                          {currentQuestionIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'Finish Quiz'}
                          <span className="material-symbols-rounded text-base">arrow_forward</span>
                        </button>
                      )
                      }
                    </div>
                  )}

                  {tests.length === 0 && quizCompleted && (
                    <div className="bg-white rounded-2xl shadow-xl border border-white p-8 text-center animate-fade-in mt-12">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-rounded text-green-500 text-5xl">military_tech</span>
                      </div>
                      <h3 className="text-xl font-black text-[#1E293B] mb-2 uppercase">Quiz Completed!</h3>
                      <p className="text-sm text-gray-400 mb-8">Excellent effort!</p>

                      <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex justify-around">
                        <div>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Score</span>
                          <span className="text-2xl font-black text-[#1E293B]">{score}/{QUIZ_QUESTIONS.length}</span>
                        </div>
                        <div className="w-px bg-gray-200"></div>
                        <div>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-1">Accuracy</span>
                          <span className="text-2xl font-black text-green-600">{Math.round((score / QUIZ_QUESTIONS.length) * 100)}%</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={resetQuiz}
                          className="w-full bg-[#1E293B] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg"
                        >
                          Retry Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Floating Query Button */}
      <button className="fixed bottom-24 right-4 h-14 w-14 bg-brandBlue text-white rounded-full shadow-2xl flex items-center justify-center z-40">
        <span className="material-symbols-rounded">quiz</span>
      </button>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-fade-in-up">
          {toastMsg.includes('Error') || toastMsg.includes('Failed') ? (
            <span className="material-symbols-rounded text-red-400 text-lg border-2 border-red-400 rounded-full p-0.5">close</span>
          ) : toastMsg.includes('Downloading') ? (
            <span className="material-symbols-rounded text-brandBlue animate-spin text-xl">progress_activity</span>
          ) : (
            <span className="material-symbols-rounded text-green-400 text-xl">check_circle</span>
          )}
          <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default StudyDashboard;
