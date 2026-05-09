import React, { useState, useEffect, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getImageUrl, getVideoUrl, getPdfUrl, getYouTubeThumbnail, getGradientPlaceholder, toYouTubeEmbed, isYouTubeUrl, isLiveUrl } from '../lib/utils';
import StudentVideoPlayer from '../components/student/StudentVideoPlayer';
import CourseHero from './course-details/components/CourseHero';
import CourseMetadata from './course-details/components/CourseMetadata';
import NotesTab from './course-details/components/NotesTab';
import TestsTab from './course-details/components/TestsTab';
import LiveTab from './course-details/components/LiveTab';
import RecordedTab from './course-details/components/RecordedTab';
import { Course, Video, Progress } from '../types';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { CATEGORY_GRADIENTS } from '../constants';

// Local Video interface removed; using Course/Video/Progress from ../types

interface Note {
  id: string;
  title: string;
  fileUrl: string;
  fileSize?: string;
  createdAt?: string;
  datetime?: string;
}

function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' | 'recorded' {
  const raw = (lc.streamStatus || lc.status || lc.liveStatus || lc.eventStatus || 'upcoming').toLowerCase();
  
  const isExplicitlyEnded = ['ended', 'completed', 'inactive', 'recorded', 'disable', 'finished'].includes(raw);
  const isImplicitlyEnded = (lc.isLive === false && (lc.endedAt || lc.endTime)) || 
                           (lc.type === 'recorded' || lc.contentType === 'recorded' || lc.contentType === 'video');
  const hasEndedLabel = lc.statusLabel === 'EVENT ENDED' || lc.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) return 'ended';
  if (raw === 'live' || lc.isLive === true) return 'live';

  // --- Schedule-Aware logic ---
  const scheduledAt = lc.scheduledAt || lc.scheduledTime || lc.startTime || lc.publishOn || '';
  if (scheduledAt) {
    const scheduledTime = new Date(scheduledAt.replace(' ', 'T')).getTime();
    if (scheduledTime > Date.now()) {
      return 'upcoming';
    } else if (!isExplicitlyEnded) {
       return 'live'; // Promote to live if time passed and not explicitly ended
    }
  }

  return 'upcoming';
}

interface Test {
  id: string;
  name: string;
  questions: number;
  duration?: number;
  status: string;
}

// Interfaces moved to src/types/index.ts

const CourseDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { student } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [progress, setProgress] = useState<Progress>({ completedVideos: [], completedTests: [], completedNotes: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'tests' | 'live'>('videos');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCourseExpired, setIsCourseExpired] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('not_enrolled');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [newLiveMessage, setNewLiveMessage] = useState('');
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

  // 1. STABLE VIDEO ID GENERATOR (CRITICAL FOR PROGRESS SYNC)
  const getVideoId = useCallback((v: any, index: number) => {
    return String(v._id || v.id || v.sourceVideoId || `${v.title}-${index}`);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLiveMessages = async (vId: string) => {
    try {
      const res = await fetch(`/api/live-chat/${vId}/messages`);
      if (res.ok) {
        const data = await res.json();
        // Normalize fields for StudentVideoPlayer
        const normalized = (data || []).map((msg: any) => ({
          ...msg,
          content: msg.message || msg.content,
          role: msg.role || (msg.senderId?.includes('admin') || msg.isAdmin ? 'admin' : 'student')
        }));
        setLiveMessages(normalized);
      }
    } catch (e) { }
  };

  useEffect(() => {
    if (showVideoPlayer && selectedVideo && selectedVideo.contentType === 'live_stream') {
      fetchLiveMessages(selectedVideo.id || selectedVideo._id);
      pollRef.current = setInterval(() => {
        fetchLiveMessages(selectedVideo.id || selectedVideo._id);
      }, 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setLiveMessages([]);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [showVideoPlayer, selectedVideo]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveMessages]);

  const handleSendLiveMessage = async (msgOverride?: string) => {
    const finalMsg = msgOverride || newLiveMessage.trim();
    if (!finalMsg || !selectedVideo || !student) return;
    try {
      const vid = selectedVideo.id || selectedVideo._id;
      const res = await fetch(`/api/live-chat/${vid}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          senderId: student.id || student._id,
          senderName: student.name || 'Student',
          message: finalMsg,
          role: 'student'
        })
      });
      if (res.ok) {
        setNewLiveMessage('');
        fetchLiveMessages(vid as string);
      }
    } catch (e) { }
  };
  const [enrolling, setEnrolling] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const normalizeId = (id: any): string | null => {
    if (id === null || id === undefined) return null;
    if (typeof id === 'string') {
      const s = id.trim();
      return (s === 'null' || s === 'undefined' || s === '') ? null : s;
    }
    if (typeof id === 'object') {
      if (id.$oid) return String(id.$oid);
      if (id._id) return normalizeId(id._id);
      if ((id as any).id && typeof (id as any).id === 'string') return (id as any).id;
      if (id.toString && typeof id.toString === 'function') {
        const str = id.toString();
        if (str !== '[object Object]') return str;
      }
    }
    const finalStr = String(id);
    return (finalStr === '[object Object]' || finalStr === 'null' || finalStr === 'undefined') ? null : finalStr;
  };

  const getAuthHeaders = () => {
    const adminId = localStorage.getItem('adminId');
    const adminToken = localStorage.getItem('adminToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (adminId) headers['x-admin-id'] = adminId;
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    if (!headers['Authorization']) {
      const studentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (studentToken) headers['Authorization'] = `Bearer ${studentToken}`;
    }
    return headers;
  };



  const tabConfig = [
    { key: 'videos' as const, label: 'Recorded', icon: 'play_circle' },
    { key: 'notes' as const, label: 'Notes', icon: 'description' },
    { key: 'tests' as const, label: 'Tests', icon: 'quiz' },
    { key: 'live' as const, label: 'Live stream', icon: 'sensors' },
  ];

  const setBottomNavHidden = useUIStore(s => s.setBottomNavHidden);

  useEffect(() => {
    setBottomNavHidden(showVideoPlayer);
    return () => setBottomNavHidden(false);
  }, [showVideoPlayer, setBottomNavHidden]);


  const handleImageError = useCallback((id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  }, []);



  const handleVideoClick = (video: Video) => {
    // STRICT PLAYABILITY RULE: Upcoming live streams must not open player
    if (video.contentType === 'live_stream' && computeEffectiveStatus(video) !== 'live') {
      return;
    }

    const isFirstVideoInRoot = navigationHistory.length === 0 && filteredVideos[0] === video;

    const canPlay = isEnrolled || video.isFree || video.isDemo || isFirstVideoInRoot;

    // Resolve raw URL first
    const rawUrl = video.youtubeUrl || video.videoUrl || video.url || video.meetingLink || (video as any).streamId || '';

    const url = toYouTubeEmbed(rawUrl);
    if (canPlay && url) {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    } else if (!canPlay) {
      alert('🔒 Please enroll in this course to watch this video.');
    }
  };

  const handleViewNote = (note: any) => {
    const canPlay = isEnrolled || note.isFree || (course?.price === 0);
    if (!canPlay) {
      alert('🔒 Please enroll in this course to view this document.');
      return;
    }

    const pdfUrl = getPdfUrl(note.fileUrl || note.url);
    if (pdfUrl) {
      navigate('/pdf-viewer', { state: { pdf: { ...note, fileUrl: pdfUrl }, title: note.title || 'Document' } });
    }
  };

  const handleShare = async () => {
    const courseUrl = `${window.location.origin}/#/course/${id}`;
    const courseTitle = course?.name || course?.title || 'Check out this course';
    const shareData = {
      title: courseTitle,
      text: `${courseTitle} - Learn with Aone Target!`,
      url: courseUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${courseTitle}\n${courseUrl}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(`${courseTitle}\n${courseUrl}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        // Share failed
      }
    }
  };

  const getStudentId = () => {
    const studentData = localStorage.getItem('studentData');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        // Standardize resolution logic to match backend variants
        return parsed._id || parsed.id || parsed.userId || parsed.studentId || '';
      } catch {
        return '';
      }
    }
    return '';
  };
  const studentId = getStudentId();

  const [folders, setFolders] = useState<any[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  const fetchCourseProgress = useCallback(async () => {
    if (!studentId || !id) return;
    try {
      const progressRes = await fetch(`/api/students/${studentId}/courses/${id}/progress`, { headers: getAuthHeaders() });
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        
        // STRICT SAFETY: Do not overwrite if response is missing critical arrays
        if (progressData && Array.isArray(progressData.completedVideos)) {
          setProgress(prev => {
            // MERGE rather than replace to prevent "zero-flicker" on stale responses
            const merged = new Set([
              ...prev.completedVideos.map(v => String(v)),
              ...progressData.completedVideos.map((v: any) => String(v))
            ]);
            return {
              ...prev,
              ...progressData,
              completedVideos: Array.from(merged)
            };
          });
        }
      }
    } catch (e) { 
      console.warn('[Progress] Fetch failed, keeping local state');
    }
  }, [student?.id, id]);

  const fetchCourseData = async () => {
    try {
      const h = getAuthHeaders();
      const [courseData, videosData, notesData, testsData, foldersData] = await Promise.all([
        fetch(`/api/courses/${id}`, { headers: h }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/courses/${id}/videos?studentId=${studentId}`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/courses/${id}/notes`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/courses/${id}/tests`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/courses/${id}/folders`, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      if (courseData && !courseData.error) {
        setCourse(courseData);
      }

      setVideos(Array.isArray(videosData) ? videosData : []);
      setNotes(Array.isArray(notesData) ? notesData : []);
      setTests(Array.isArray(testsData) ? testsData.filter((t: Test) => !t.status || t.status === 'active') : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);

      if (studentId) {
        try {
          const enrolledRes = await fetch(`/api/students/${studentId}/enrolled/${id}`, { headers: getAuthHeaders() });
          if (enrolledRes.ok) {
            const enrolledData = await enrolledRes.json();
            setIsEnrolled(enrolledData.enrolled || false);
            setIsCourseExpired(enrolledData.isExpired || false);
            setEnrollmentStatus(enrolledData.status || (enrolledData.isExpired ? 'expired' : (enrolledData.enrolled ? 'active' : 'not_enrolled')));

            if (enrolledData.enrolled) {
              await fetchCourseProgress();
            }
          }
        } catch { }
      }
    } catch (error) {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!studentId) {
      alert('Please login first to enroll in this course');
      sessionStorage.setItem('postLoginRedirect', location.pathname);
      navigate('/student-login', { state: { from: location.pathname } });
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch(`/api/students/${studentId}/enroll`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ courseId: id })
      });

      if (response.ok) {
        setIsEnrolled(true);
        alert('Enrollment successful! You now have access to all course content.');
        const progressRes = await fetch(`/api/students/${studentId}/courses/${id}/progress`, { headers: getAuthHeaders() });
        const progressData = await progressRes.json();
        setProgress(progressData);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to enroll. Please try again.');
      }
    } catch (error) {
      alert('Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuyNow = () => {
    if (!studentId) {
      alert('Please login first');
      sessionStorage.setItem('postLoginRedirect', location.pathname);
      navigate('/student-login', { state: { from: location.pathname } });
      return;
    }
    navigate(`/checkout/${id}`);
  };

  const markVideoComplete = async (videoId: string) => {
    if (!videoId || !studentId) return;

    // 1. Prevent redundant calls if already completed in local state
    const currentCompleted = new Set(progress.completedVideos.map(vid => String(vid)));
    if (currentCompleted.has(videoId)) return;

    try {
      // 2. Update local UI instantly for snappy feel (Optimistic Update)
      setProgress(prev => ({
        ...prev,
        completedVideos: [...new Set([...prev.completedVideos.map(v => String(v)), videoId])]
      }));

      const res = await fetch(`/api/students/${studentId}/courses/${id}/progress`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ videoId: String(videoId), action: 'complete' })
      });

      if (res.ok) {
        const latestProgress = await res.json();
        // 3. MERGE, DO NOT OVERWRITE (Safety against race conditions)
        setProgress(prev => {
          const merged = new Set([
            ...prev.completedVideos.map(v => String(v)),
            ...(latestProgress.completedVideos || []).map((v: any) => String(v))
          ]);
          return {
            ...prev,
            ...latestProgress,
            completedVideos: Array.from(merged)
          };
        });
      }
    } catch (error) {
      console.error('[Progress] Update failed:', error);
    }
  };

  const [upsellData, setUpsellData] = useState<Course[]>([]);
  useEffect(() => {
    if (course?.content?.upsell?.enabled && course.content.upsell.courses.length > 0) {
      const fetchUpsell = async () => {
        try {
          const res = await fetch('/api/courses');
          if (res.ok) {
            const all = await res.json();
            const recommended = all.filter((c: any) =>
              course.content?.upsell?.courses.includes(c.title || c.name) &&
              (c.id || c._id) !== (course.id || course._id)
            );
            setUpsellData(recommended);
          }
        } catch (e) { }
      };
      fetchUpsell();
    }
  }, [course]);

  const location = useLocation();

  useEffect(() => {
    fetchCourseData();
    fetchCourseProgress(); // Force initial sync
    window.addEventListener('focus', fetchCourseProgress);
    return () => window.removeEventListener('focus', fetchCourseProgress);
  }, [id, location.pathname, student?.id]);

  useEffect(() => {
    if (course) {
      document.title = `${course.name || course.title} | Aone Target`;
      
      // TRACK RECENTLY VIEWED
      try {
        const viewed = JSON.parse(localStorage.getItem('recently_viewed_courses') || '[]');
        const filtered = viewed.filter((c: any) => (c.id || c._id) !== (course.id || course._id));
        const updated = [{ 
          id: course.id || course._id || "", 
          name: course.name || course.title, 
          imageUrl: course.imageUrl || course.thumbnail 
        }, ...filtered].slice(0, 10);
        localStorage.setItem('recently_viewed_courses', JSON.stringify(updated));
      } catch (e) { console.error(e); }
    }
  }, [course]);

  const navigateIntoFolder = (folder: any) => {
    setNavigationHistory(prev => [...prev, folder]);
  };

  const handleStartLearning = () => {
    // Find first playable video or resume last one
    if (videos.length > 0) {
      // Check for resume video first
      const resumeVideoId = (navigate as any).state?.resumeVideoId;
      let targetVideo = videos.find(v => (v.id || v._id) === resumeVideoId);
      
      if (!targetVideo) {
        // Fallback to first video
        targetVideo = videos[0];
      }
      
      handleVideoClick(targetVideo);
    }
  };

  const handleAutoNext = () => {
    if (!selectedVideo) return;
    const currentIndex = videos.findIndex(v => (v.id || v._id) === (selectedVideo.id || selectedVideo._id));
    if (currentIndex !== -1 && currentIndex < videos.length - 1) {
      const nextVideo = videos[currentIndex + 1];
      // Skip if it's a folder or non-playable
      if (nextVideo.contentType === 'folder') {
         // Optionally navigate into folder, but for simple auto-next we just stop or skip
         return;
      }
      handleVideoClick(nextVideo);
    }
  };

  const navigateUp = () => {
    const newHistory = [...navigationHistory];
    newHistory.pop();
    setNavigationHistory(newHistory);
  };

  const currentFolder = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  const recordedVideos = videos.filter(v => 
    v.contentType === 'video' || 
    v.contentType === 'recorded' || 
    !v.contentType || 
    computeEffectiveStatus(v) === 'ended'
  );
  const liveStreams = videos.filter(v => 
    (v.contentType === 'live_stream' || v.contentType === 'youtube_zoom') && 
    computeEffectiveStatus(v) !== 'ended'
  );

  const currentFolderId = normalizeId(currentFolder?._id || currentFolder?.id);

  const filteredVideos = recordedVideos.filter(v => {
    const vFolderId = normalizeId(v.folderId);
    return vFolderId === currentFolderId ||
      (vFolderId && currentFolder?._id && vFolderId === normalizeId(currentFolder._id)) ||
      (vFolderId && currentFolder?.id && vFolderId === normalizeId(currentFolder.id));
  }).sort((a: any, b: any) => (Number(a.order) || Number(a.sortingOrder) || 0) - (Number(b.order) || Number(b.sortingOrder) || 0));

  const filteredNotes = notes.filter(n => {
    const nFolderId = normalizeId((n as any).folderId);
    return nFolderId === currentFolderId ||
      (nFolderId && currentFolder?._id && nFolderId === normalizeId(currentFolder._id)) ||
      (nFolderId && currentFolder?.id && nFolderId === normalizeId(currentFolder.id));
  }).sort((a: any, b: any) => (Number(a.order) || Number(a.sortingOrder) || 0) - (Number(b.order) || Number(b.sortingOrder) || 0));

  const filteredTests = tests.filter(t => {
    const tFolderId = normalizeId((t as any).folderId);
    return tFolderId === currentFolderId ||
      (tFolderId && currentFolder?._id && tFolderId === normalizeId(currentFolder._id)) ||
      (tFolderId && currentFolder?.id && tFolderId === normalizeId(currentFolder.id));
  }).sort((a: any, b: any) => (Number(a.order) || Number(a.sortingOrder) || 0) - (Number(b.order) || Number(b.sortingOrder) || 0));

  const filteredFolders = folders.filter(f => {
    const fParentId = normalizeId(f.parentId);
    return fParentId === currentFolderId ||
      (fParentId && currentFolder?._id && fParentId === normalizeId(currentFolder._id)) ||
      (fParentId && currentFolder?.id && fParentId === normalizeId(currentFolder.id));
  }).sort((a: any, b: any) => (Number(a.order) || Number(a.sortingOrder) || 0) - (Number(b.order) || Number(b.sortingOrder) || 0));

  const totalVideos = recordedVideos.length;
  // Deduplicate using Set to prevent > 100% progress if backend/frontend state has duplicates
  const uniqueCompletedVideos = new Set(progress.completedVideos || []);
  
  // Calculate count of uniquely completed videos that actually exist in the current recordedVideos list
  const validCompletedCount = recordedVideos.filter((v, idx) => {
    const vId = getVideoId(v, idx);
    return uniqueCompletedVideos.has(vId);
  }).length;

  const completedVideosCount = Math.min(validCompletedCount, totalVideos);
  const progressPercent = totalVideos > 0 ? Math.min(100, Math.round((completedVideosCount / totalVideos) * 100)) : 0;
  const isPaidCourse = course?.price && course.price > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-100">
        <div className="w-full h-56 skeleton rounded-none"></div>
        <div className="px-4 -mt-8 relative z-10">
          <div className="card-premium p-5 space-y-3">
            <div className="skeleton h-6 w-3/4 rounded-full"></div>
            <div className="skeleton h-4 w-1/2 rounded-full"></div>
            <div className="skeleton h-3 w-full rounded-full"></div>
            <div className="flex gap-2 mt-2">
              <div className="skeleton h-8 w-20 rounded-full"></div>
              <div className="skeleton h-8 w-20 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="flex mt-4 px-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 skeleton h-12 rounded-2xl"></div>
          ))}
        </div>
        <div className="px-4 mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-premium p-4 flex gap-4">
              <div className="skeleton w-28 h-20 rounded-2xl flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded-full"></div>
                <div className="skeleton h-3 w-1/2 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-surface-100 flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-5xl text-gray-300">error</span>
          </div>
          <p className="text-gray-500 font-medium">Course not found</p>
          <button onClick={() => navigate('/courses')} className="mt-4 btn-primary px-6 py-2.5 text-sm">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const courseImage = getImageUrl(course.imageUrl || course.thumbnail);
  const shareOnPlatform = (platform: string) => {
    const courseUrl = `${window.location.origin}/#/course/${id}`;
    const courseTitle = course.name || course.title || 'Check out this course';
    const text = `${courseTitle} - Learn with Aone Target Institute!`;
    let url = '';
    switch (platform) {
      case 'whatsapp': url = `https://wa.me/?text=${encodeURIComponent(text + '\n' + courseUrl)}`; break;
      case 'telegram': url = `https://t.me/share/url?url=${encodeURIComponent(courseUrl)}&text=${encodeURIComponent(text)}`; break;
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(courseUrl)}`; break;
      case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(courseUrl)}`; break;
    }
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-surface-100 pb-32">
      <CourseHero 
        courseImage={courseImage}
        courseName={course.name || course.title}
        onBack={() => navigate(-1)}
        onShare={handleShare}
        shareSuccess={shareSuccess}
      />

      <CourseMetadata 
        courseName={course.name || course.title}
        instructor={course.instructor}
        category={course.category}
        enrollmentCount={course.enrollmentCount}
        isEnrolled={isEnrolled}
        progressPercent={progressPercent}
        completedVideosCount={completedVideosCount}
        totalVideos={totalVideos}
        onSharePlatform={shareOnPlatform}
      />


      <main className="p-4 origin-top transition-transform duration-200 space-y-4">


        {course.description && navigationHistory.length === 0 && (
          <div className="card-premium p-4 animate-fade-in-up">
            <h3 className="font-bold text-sm text-primary-800 mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-primary-600 to-primary-400 rounded-full" />
              <span className="material-symbols-rounded text-base">info</span>
              About this Course
            </h3>
            <div
              className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course.description || '') }}
            />
          </div>
        )}

        {(videos.length > 0 || notes.length > 0 || tests.length > 0) && navigationHistory.length === 0 && (
          <div className="card-premium p-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <h3 className="font-bold text-sm text-primary-800 mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-gradient-to-b from-primary-600 to-primary-400 rounded-full" />
              <span className="material-symbols-rounded text-base">inventory_2</span>
              What's Included
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {recordedVideos.length > 0 && (
                <div 
                  onClick={() => setActiveTab('videos')}
                  className="flex items-center gap-2.5 bg-primary-50 rounded-2xl px-3 py-3 cursor-pointer hover:bg-primary-100 transition-all active:scale-95 group"
                >
                  <span className="material-symbols-rounded text-primary-600 text-xl group-hover:scale-110 transition-transform">play_circle</span>
                  <span className="text-xs font-bold text-gray-700">{recordedVideos.length} Videos</span>
                </div>
              )}
              {notes.length > 0 && (
                <div 
                  onClick={() => setActiveTab('notes')}
                  className="flex items-center gap-2.5 bg-orange-50 rounded-2xl px-3 py-3 cursor-pointer hover:bg-orange-100 transition-all active:scale-95 group"
                >
                  <span className="material-symbols-rounded text-orange-500 text-xl group-hover:scale-110 transition-transform">description</span>
                  <span className="text-xs font-bold text-gray-700">{notes.length} Notes</span>
                </div>
              )}
              {tests.length > 0 && (
                <div 
                  onClick={() => setActiveTab('tests')}
                  className="flex items-center gap-2.5 bg-purple-50 rounded-2xl px-3 py-3 cursor-pointer hover:bg-purple-100 transition-all active:scale-95 group"
                >
                  <span className="material-symbols-rounded text-purple-500 text-xl group-hover:scale-110 transition-transform">quiz</span>
                  <span className="text-xs font-bold text-gray-700">{tests.length} Tests</span>
                </div>
              )}
              <div 
                onClick={() => setActiveTab('live')}
                className="flex items-center gap-2.5 bg-accent-50 rounded-2xl px-3 py-3 cursor-pointer hover:bg-accent-100 transition-all active:scale-95 group"
              >
                <span className="material-symbols-rounded text-accent-500 text-xl group-hover:scale-110 transition-transform">sensors</span>
                <span className="text-xs font-bold text-gray-700">Live Classes ({liveStreams.length})</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <RecordedTab 
            filteredFolders={filteredFolders}
            filteredVideos={filteredVideos}
            navigationHistory={navigationHistory}
            isEnrolled={isEnrolled}
            uniqueCompletedVideos={uniqueCompletedVideos}
            failedImages={failedImages}
            onNavigateIntoFolder={navigateIntoFolder}
            onNavigateUp={navigateUp}
            onVideoClick={handleVideoClick}
            onImageError={handleImageError}
            getVideoId={getVideoId}
            normalizeId={normalizeId}
            computeStatus={computeEffectiveStatus}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab 
            notes={notes}
            isEnrolled={isEnrolled}
            isPaidCourse={isPaidCourse}
            coursePrice={course.price}
            enrolling={enrolling}
            onViewNote={handleViewNote}
            onEnroll={handleEnroll}
            onBuyNow={handleBuyNow}
          />
        )}

        {activeTab === 'tests' && (
          <TestsTab 
            tests={tests}
            isEnrolled={isEnrolled}
            isExpired={isCourseExpired}
            coursePrice={course.price}
            enrolling={enrolling}
            completedTests={progress.completedTests || []}
            onStartTest={(testId) => { if (isCourseExpired) { alert('Your access to this course has expired. Please renew to continue.'); return; } navigate(`/test/${testId}`); }}
            onEnroll={handleEnroll}
            onBuyNow={handleBuyNow}
          />
        )}

        {activeTab === 'live' && (
          <LiveTab 
            liveStreams={liveStreams}
            isEnrolled={isEnrolled}
            isPaidCourse={isPaidCourse}
            coursePrice={course.price}
            enrolling={enrolling}
            onJoinLive={handleVideoClick}
            onEnroll={handleEnroll}
            onBuyNow={handleBuyNow}
            computeStatus={computeEffectiveStatus}
          />
        )}

        {upsellData.length > 0 && (
          <div className="mt-8 px-1 pb-4">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded-full" />
              <h3 className="font-black text-gray-900 text-sm tracking-tight text-primary-800 flex items-center gap-2">
                <span className="material-symbols-rounded text-base">recommend</span>
                Recommended for you
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upsellData.map((up, i) => (
                <div
                  key={up.id || (up as any)._id}
                  onClick={() => navigate(`/course/${up.id || (up as any)._id}`)}
                  className="card-premium p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:border-indigo-100 group animate-fade-in-up shadow-sm bg-white rounded-3xl"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-16 h-16 rounded-[1.2rem] overflow-hidden bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                    {up.thumbnail || up.imageUrl ? (
                      <img src={getImageUrl(up.thumbnail || up.imageUrl)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <span className="text-indigo-600 font-extrabold text-xl">{(up.title || up.name || 'C').charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-gray-900 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{up.title || up.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-green-600 tracking-tight">₹{up.price || 0}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full">New Course</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <span className="material-symbols-rounded text-lg">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {enrollmentStatus === 'expired' ? (
          <div className="mt-8 mb-24 px-4 sticky bottom-4 z-40">
            <div className="bg-[#2D0D0D] p-5 rounded-[2.2rem] shadow-[0_20px_50px_rgba(220,38,38,0.3)] flex items-center justify-between border border-red-500/20 mx-auto max-w-sm animate-fade-in-up">
              <div className="flex flex-col gap-1 ml-1">
                <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.15em]">Subscription Ended</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-black text-white tracking-tight">EXPIRED</span>
                </div>
              </div>
            </div>
          </div>
        ) : !isEnrolled ? (
          <div className="mt-8 mb-24 px-4 sticky bottom-4 z-40">
            <div className="bg-[#0D1B2A] p-5 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border border-white/10 mx-auto max-w-sm animate-fade-in-up">
              <div className="flex flex-col gap-1 ml-1">
                {(course.tsCount || 0) > 0 && (
                   <div className="flex items-center gap-1.5 mb-1 animate-pulse">
                      <span className="material-symbols-rounded text-green-400 text-[14px]">card_membership</span>
                      <span className="text-green-400 text-[9px] font-black uppercase tracking-widest">Includes {course.tsCount} Test Series</span>
                   </div>
                )}
                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">ENROLLMENT FEE</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-[900] text-white tracking-tight">₹{course.price}</span>
                  {course.mrp && course.mrp > (course.price || 0) && (
                    <span className="text-xs text-white/20 line-through font-bold">₹{course.mrp}</span>
                  )}
                </div>
              </div>

              {isPaidCourse ? (
                <button
                  onClick={handleBuyNow}
                  className="px-8 py-3.5 bg-white text-[#0D1B2A] rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-xl active:scale-[0.98] transition-all"
                >
                  PURCHASE COURSE
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-8 py-3.5 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-xl active:scale-[0.98] transition-all"
                >
                  {enrolling ? 'ENROLLING...' : 'ENROLL FREE'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 mb-24 px-4 sticky bottom-4 z-40">
            <button
               onClick={handleStartLearning}
               className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-brandBlue text-white p-5 rounded-[2.2rem] shadow-[0_20px_50px_rgba(46,115,232,0.3)] border border-brandBlue/20 animate-fade-in-up active:scale-[0.98] transition-all"
            >
               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-rounded text-white">play_arrow</span>
               </div>
               <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Success! Enrolled</span>
                  <span className="text-sm font-black uppercase tracking-widest">START LEARNING</span>
               </div>
            </button>
          </div>
        )}
      </main>

      {showVideoPlayer && selectedVideo && (
        <StudentVideoPlayer
          videoId={selectedVideo.id || selectedVideo._id || ''}
          src={selectedVideo.youtubeUrl ? selectedVideo.youtubeUrl : (selectedVideo.videoUrl ? getVideoUrl(selectedVideo.videoUrl) : (selectedVideo.url ? (selectedVideo.url.includes('youtube.com') || selectedVideo.url.includes('youtu.be') ? selectedVideo.url : getVideoUrl(selectedVideo.url)) : selectedVideo.meetingLink || ''))}
          title={selectedVideo.title}
          courseTitle={course?.name || course?.title}
          courseId={id}
          thumbnail={selectedVideo.thumbnail}
          duration={selectedVideo.duration}
          isLive={selectedVideo.contentType === 'live_stream'}
          onClose={closeVideoPlayer}
          onMarkComplete={() => {
            const vId = selectedVideo.id || selectedVideo._id;
            const stableVId = vId ? getVideoId(selectedVideo, videos.indexOf(selectedVideo)) : '';
            if (stableVId) markVideoComplete(stableVId as string);
          }}
          chatMessages={liveMessages}
          onSendMessage={(msg) => {
            handleSendLiveMessage(msg);
          }}
          onNext={handleAutoNext}
          pdf1={selectedVideo.pdf1 || selectedVideo.pdf1Url || selectedVideo.pdfUrl}
          pdf2={selectedVideo.pdf2 || selectedVideo.pdf2Url}
          studyMaterial={selectedVideo.studyMaterial || selectedVideo.studyMaterialUrl || selectedVideo.documentUrl || selectedVideo.material}
        />
      )}
    </div>
  );
};

export default CourseDetails;
