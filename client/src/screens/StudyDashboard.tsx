import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LiveClassesCalendar from '../components/student/LiveClassesCalendar';
import { getPdfUrl, getVideoUrl, getImageUrl, getYouTubeThumbnail, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

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
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [activeSubject, setActiveSubject] = useState('All Subjects');
  const [subjects, setSubjects] = useState<any[]>([]);

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
        const sId = storedStudent ? JSON.parse(storedStudent).id : '';
        const [courseRes, vRes, nRes, tRes, fRes] = await Promise.all([
          fetch(`/api/courses/${id}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/courses/${id}/videos?studentId=${sId}`).then(r => r.ok ? r.json() : []),
          fetch(`/api/courses/${id}/notes`).then(r => r.ok ? r.json() : []),
          fetch(`/api/courses/${id}/tests`).then(r => r.ok ? r.json() : []),
          fetch(`/api/courses/${id}/folders`).then(r => r.ok ? r.json() : [])
        ]);
        setCourse(courseRes);
        setVideos(Array.isArray(vRes) ? vRes : []);
        setNotes(Array.isArray(nRes) ? nRes : []);
        setTests(Array.isArray(tRes) ? tRes : []);
        setFolders(Array.isArray(fRes) ? fRes : []);

        // Fetch user downloads to check what's already offline
        if (storedStudent) {
          const s = JSON.parse(storedStudent);
          const dRes = await fetch(`/api/students/${s.id}/downloads`).then(r => r.ok ? r.json() : []);
          if (Array.isArray(dRes)) {
            setDownloadedIds(new Set(dRes.map(d => d.id || d._id)));
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    const fetchSubjects = async () => {
      try {
        const res = await fetch('/api/subjects');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSubjects([{ id: 'all', name: 'All Subjects' }, ...data]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };

    if (id) {
      fetchCourseData();
      fetchSubjects();
    }
  }, [id]);

  const isFreeContent = course?.price === 0 || course?.isFree === true ||
    course?.categoryId === 'free-content' ||
    course?.type === 'free';

  // Download handler - saves to app's downloads collection AND caches file for offline use
  const handleDownload = async (item: any, type: 'video' | 'pdf' | 'audio') => {
    if (!student?.id) {
      showToast('Please login to download');
      return;
    }

    const fileUrl = toYouTubeEmbed(item.youtubeUrl || item.fileUrl || item.url || item.videoUrl || '');
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
        setDownloadedIds(prev => new Set([...prev, item._id || item.id]));
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

  const handleView = (item: any, type: 'video' | 'pdf') => {
    if (type === 'video') {
      navigate('/video-player', { state: { video: item, courseTitle: course?.title || course?.name, courseId: id } });
    } else {
      const pdfUrl = getPdfUrl(item.fileUrl || item.url || item.link);
      if (pdfUrl) {
        navigate('/pdf-viewer', { state: { pdf: { ...item, fileUrl: pdfUrl }, title: item.title || item.name } });
      } else {
        showToast('Error: No file URL available to view.');
      }
    }
  };
  const normalizeId = (id: any): string | null => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return normalizeId(id._id);
    return String(id);
  };

  const handleFolderClick = (folder: any) => {
    setFolderStack(prev => [...prev, folder]);
    setCurrentFolderId(normalizeId(folder.id || folder._id));
  };

  const handleBackNavigation = () => {
    if (folderStack.length === 0) return;
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    setCurrentFolderId(newStack.length > 0 ? normalizeId(newStack[newStack.length - 1].id || newStack[newStack.length - 1]._id) : null);
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
                  onClick={() => {
                    const firstVideo = videos[0];
                    if (isFreeContent || downloadedIds.has(firstVideo._id || firstVideo.id) || isYouTubeUrl(firstVideo.videoUrl || firstVideo.url || firstVideo.youtubeUrl)) {
                      handleView(firstVideo, 'video');
                    } else {
                      showToast('Please download the lesson to start watching.');
                    }
                  }}
                >
                  <div className="relative w-24 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                    <img src={getYouTubeThumbnail(videos[0].youtubeUrl || videos[0].videoUrl || videos[0].url || '') || getImageUrl(videos[0].thumbnail)} className="w-full h-full object-cover" alt="Thumb" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="material-symbols-rounded text-white">
                        {isFreeContent || downloadedIds.has(videos[0]._id || videos[0].id) ? 'play_arrow' : 'download'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs truncate">{videos[0].title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {isFreeContent || downloadedIds.has(videos[0]._id || videos[0].id) ? 'Resume Lesson' : 'Download to Resume'}
                    </p>
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
                {['Recorded', 'Notes', 'Tests', 'Live Classes'].map((tab) => {
                  const key = tab.toLowerCase().includes('recorded') ? 'videos' : tab.toLowerCase().includes('note') ? 'notes' : tab.toLowerCase().includes('live') ? 'live' : 'tests';
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 pb-3 text-[11px] font-black uppercase tracking-wider transition-all ${isActive ? 'text-brandBlue border-b-2 border-brandBlue' : 'text-gray-400'}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Subject Filter Pills */}
              {subjects.length > 1 && (
                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-6">
                  {subjects.map((sub, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSubject(sub.name || sub)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubject === (sub.name || sub)
                        ? 'bg-brandBlue text-white shadow-md active:scale-95'
                        : 'bg-white text-gray-400 border border-gray-100 active:scale-95'
                        }`}
                    >
                      {sub.name || sub}
                    </button>
                  ))}
                </div>
              )}

              {/* Breadcrumb / Back Navigation */}
              {currentFolderId && (
                <div className="flex items-center gap-2 mb-4 animate-fade-in bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                  <button
                    onClick={handleBackNavigation}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brandBlue text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                  >
                    <span className="material-symbols-rounded text-base">arrow_back</span>
                    Back
                  </button>
                  <div className="flex items-center gap-1 overflow-hidden">
                    <span className="text-gray-400 text-xs">/</span>
                    {folderStack.map((f, i) => (
                      <React.Fragment key={i}>
                        <span className={`text-[10px] uppercase tracking-widest truncate ${i === folderStack.length - 1 ? 'text-brandBlue font-black' : 'text-gray-400 font-bold'}`}>
                          {f.name}
                        </span>
                        {i < folderStack.length - 1 && <span className="text-gray-400 text-xs mx-1">›</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'videos' && (
                <div className="space-y-4">
                  {/* Folders in Videos Tab */}
                  {(folders.filter(f => normalizeId(f.parentId) === currentFolderId).length > 0) && (
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      {folders.filter(f => normalizeId(f.parentId) === currentFolderId).map((folder) => (
                        <div
                          key={folder._id || folder.id}
                          onClick={() => handleFolderClick(folder)}
                          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-brandBlue transition-all animate-fade-in-up group active:scale-[0.98]"
                        >
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-brandBlue group-hover:bg-brandBlue group-hover:text-white transition-all">
                            <span className="material-symbols-rounded text-2xl">folder</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-800 truncate">{folder.title || folder.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Explore Folder</p>
                          </div>
                          <span className="material-symbols-rounded text-gray-300">chevron_right</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {videos
                    .filter(v => normalizeId(v.folderId) === currentFolderId && (activeSubject === 'All Subjects' || v.subject === activeSubject))
                    .length > 0 ? (
                    videos
                      .filter(v => normalizeId(v.folderId) === currentFolderId && (activeSubject === 'All Subjects' || v.subject === activeSubject))
                      .map((video, idx) => (
                        <div key={video._id || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:border-brandBlue transition-all">
                          <div className="p-4 flex gap-4 items-center">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{video.title}</h4>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[8px] bg-blue-50 text-brandBlue px-1.5 py-0.5 rounded font-bold uppercase">Video</span>
                                <span className="text-[8px] text-gray-400">{video.duration}</span>
                              </div>
                            </div>
                            {isFreeContent || downloadedIds.has(video._id || video.id) || isYouTubeUrl(video.videoUrl || video.url || video.youtubeUrl) ? (
                              <button
                                onClick={() => handleView(video, 'video')}
                                className="bg-brandBlue text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2"
                              >
                                <span className="material-symbols-rounded text-sm">play_arrow</span>
                                Watch
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownload(video, 'video')}
                                className="p-2 text-gray-400 group-hover:text-brandBlue group-hover:bg-blue-50 rounded-lg transition-all flex-shrink-0"
                                title="Add to Downloads"
                              >
                                {downloadingId === (video._id || video.id) ? (
                                  <span className="material-symbols-rounded animate-spin">progress_activity</span>
                                ) : (
                                  <span className="material-symbols-rounded">download</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : null}

                  {videos.filter(v => normalizeId(v.folderId) === currentFolderId && v.contentType !== 'youtube_zoom' && v.contentType !== 'live_stream').length === 0 && folders.filter(f => normalizeId(f.parentId) === currentFolderId).length === 0 && (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
                      <span className="material-symbols-rounded text-gray-200 text-5xl">smart_display</span>
                      <p className="text-sm font-bold text-gray-400 mt-4">No content found in this folder</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'live' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <LiveClassesCalendar studentId={student?.id} courseId={id} />
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Folders in Notes Tab */}
                  {folders.filter(f => normalizeId(f.parentId) === currentFolderId).map((folder) => (
                    <div
                      key={folder._id || folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-brandBlue transition-all animate-fade-in-up group active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <span className="material-symbols-rounded text-2xl">folder</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-800 truncate">{folder.title || folder.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">View Notes Folder</p>
                      </div>
                      <span className="material-symbols-rounded text-gray-300">chevron_right</span>
                    </div>
                  ))}

                  {notes
                    .filter(n => normalizeId(n.folderId) === currentFolderId && (activeSubject === 'All Subjects' || n.subject === activeSubject))
                    .length > 0 ? (
                    notes
                      .filter(n => normalizeId(n.folderId) === currentFolderId && (activeSubject === 'All Subjects' || n.subject === activeSubject))
                      .map((note, idx) => (
                        <div key={note._id || idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 items-center group hover:border-brandBlue transition-all">
                          <div className="w-10 h-10 bg-brandBlue/10 rounded-full flex items-center justify-center text-brandBlue flex-shrink-0">
                            <span className="material-symbols-rounded">description</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm">{note.title}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">PDF Document</p>
                          </div>
                          {isFreeContent || downloadedIds.has(note._id || note.id) ? (
                            <button
                              onClick={() => handleView(note, 'pdf')}
                              className="bg-brandBlue text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                              View
                            </button>
                          ) : (
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
                          )}
                        </div>
                      ))
                  ) : null}

                  {notes.filter(n => normalizeId(n.folderId) === currentFolderId).length === 0 && folders.filter(f => normalizeId(f.parentId) === currentFolderId).length === 0 && (
                    <div className="bg-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-200">
                      <span className="material-symbols-rounded text-gray-200 text-5xl">description</span>
                      <p className="text-sm font-bold text-gray-400 mt-2">कोई नोट्स उपलब्ध नहीं हैं (No notes available yet)</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="space-y-6">
                  {/* Folders in Tests Tab */}
                  {folders.filter(f => normalizeId(f.parentId) === currentFolderId).map((folder) => (
                    <div
                      key={folder._id || folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-brandBlue transition-all animate-fade-in-up group active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <span className="material-symbols-rounded text-2xl">folder</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-800 truncate">{folder.title || folder.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">View Test Folder</p>
                      </div>
                      <span className="material-symbols-rounded text-gray-300">chevron_right</span>
                    </div>
                  ))}

                  {tests
                    .filter(t => normalizeId(t.folderId) === currentFolderId && (activeSubject === 'All Subjects' || t.subject === activeSubject))
                    .length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {tests
                        .filter(t => normalizeId(t.folderId) === currentFolderId && (activeSubject === 'All Subjects' || t.subject === activeSubject))
                        .map((test, idx) => (
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

      {/* No dynamic modals here anymore, uses next-page navigation */}

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
