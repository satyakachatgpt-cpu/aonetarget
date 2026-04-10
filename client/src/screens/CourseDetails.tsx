import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getImageUrl, getVideoUrl, getPdfUrl, getYouTubeThumbnail, getGradientPlaceholder, toYouTubeEmbed, isYouTubeUrl, isLiveUrl } from '../lib/utils';
import StudentVideoPlayer from '../components/student/StudentVideoPlayer';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { CATEGORY_GRADIENTS } from '../constants';

interface Video {
  id: string;
  _id?: string;
  title: string;
  duration: string;
  thumbnail?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  isFree?: boolean;
  topicId?: string;
  topicName?: string;
  order?: number;
  completed?: boolean;
  publishOn?: string;
  scheduledTime?: string;
  startTime?: string;
  contentType?: string;
  endTime?: string;
  joinBeforeMinutes?: number;
  meetingLink?: string;
  instructor?: string;
  url?: string;
  folderId?: string | null;
  status?: string;
  streamStatus?: string;
  isLive?: boolean;
  isDemo?: boolean;
  pdf1?: string;
  pdf2?: string;
  studyMaterial?: string;
  scheduledAt?: string;
}

interface Note {
  id: string;
  title: string;
  fileUrl: string;
  fileSize?: string;
}

function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || 'upcoming').toLowerCase();
  if (['ended', 'completed', 'inactive'].includes(raw)) return 'ended';
  if (raw === 'live') return 'live';
  return 'upcoming';
}

interface Test {
  id: string;
  name: string;
  questions: number;
  duration?: number;
  status: string;
}

interface Course {
  id: string;
  name: string;
  title?: string;
  description?: string;
  instructor?: string;
  thumbnail?: string;
  imageUrl?: string;
  price?: number;
  mrp?: number;
  category?: string;
  enrollmentCount?: number;
  notesCount?: number;
  demoVideo?: string;
  settings?: { showTabs?: boolean;[key: string]: any };
  content?: { upsell?: { enabled?: boolean; courses: string[] };[key: string]: any };
}

interface Progress {
  completedVideos: string[];
  completedTests: string[];
  completedNotes: string[];
}

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
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [newLiveMessage, setNewLiveMessage] = useState('');
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

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
        headers: { 'Content-Type': 'application/json' },
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

    console.log('Video clicked:', video.title, 'Playable:', isEnrolled || video.isFree || video.isDemo, 'URL:', video.youtubeUrl || video.videoUrl);
    const canPlay = isEnrolled || video.isFree || video.isDemo;

    // Resolve raw URL first
    const rawUrl = video.youtubeUrl || video.videoUrl || video.url || video.meetingLink || (video as any).streamId || '';

    const url = toYouTubeEmbed(rawUrl);
    if (canPlay && url) {
      setSelectedVideo({ ...video, url });
      setShowVideoPlayer(true);
    } else if (!canPlay) {
      alert('Please enroll in this course to watch this video.');
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
        return parsed.id || '';
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
          const enrolledRes = await fetch(`/api/students/${studentId}/enrolled/${id}`);
          if (enrolledRes.ok) {
            const enrolledData = await enrolledRes.json();
            setIsEnrolled(enrolledData.enrolled || false);

            if (enrolledData.enrolled) {
              const progressRes = await fetch(`/api/students/${studentId}/courses/${id}/progress`);
              if (progressRes.ok) {
                const progressData = await progressRes.json();
                setProgress(progressData);
              }
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
      navigate('/student-login');
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch(`/api/students/${studentId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id })
      });

      if (response.ok) {
        setIsEnrolled(true);
        alert('Enrollment successful! You now have access to all course content.');
        const progressRes = await fetch(`/api/students/${studentId}/courses/${id}/progress`);
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
      navigate('/student-login');
      return;
    }
    navigate(`/checkout/${id}`);
  };

  const markVideoComplete = async (videoId: string) => {
    try {
      await fetch(`/api/students/${studentId}/courses/${id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'complete' })
      });
      setProgress(prev => ({
        ...prev,
        completedVideos: [...prev.completedVideos, videoId]
      }));
    } catch (error) {
      // Update failed
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
              (c.id || c._id) !== (course.id || (course as any)._id)
            );
            setUpsellData(recommended);
          }
        } catch (e) { }
      };
      fetchUpsell();
    }
  }, [course]);

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const navigateIntoFolder = (folder: any) => {
    setNavigationHistory(prev => [...prev, folder]);
  };

  const navigateUp = () => {
    const newHistory = [...navigationHistory];
    newHistory.pop();
    setNavigationHistory(newHistory);
  };

  const currentFolder = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  const recordedVideos = videos.filter(v => v.contentType === 'video' || v.contentType === 'recorded' || !v.contentType);
  const liveStreams = videos.filter(v => v.contentType === 'live_stream');

  const currentFolderId = normalizeId(currentFolder?._id || currentFolder?.id);

  const filteredVideos = recordedVideos.filter(v => {
    const vFolderId = normalizeId(v.folderId);
    return vFolderId === currentFolderId ||
      (vFolderId && currentFolder?._id && vFolderId === normalizeId(currentFolder._id)) ||
      (vFolderId && currentFolder?.id && vFolderId === normalizeId(currentFolder.id));
  });

  const filteredNotes = notes.filter(n => {
    const nFolderId = normalizeId((n as any).folderId);
    return nFolderId === currentFolderId ||
      (nFolderId && currentFolder?._id && nFolderId === normalizeId(currentFolder._id)) ||
      (nFolderId && currentFolder?.id && nFolderId === normalizeId(currentFolder.id));
  });

  const filteredTests = tests.filter(t => {
    const tFolderId = normalizeId((t as any).folderId);
    return tFolderId === currentFolderId ||
      (tFolderId && currentFolder?._id && tFolderId === normalizeId(currentFolder._id)) ||
      (tFolderId && currentFolder?.id && tFolderId === normalizeId(currentFolder.id));
  });

  const filteredFolders = folders.filter(f => {
    const fParentId = normalizeId(f.parentId);
    return fParentId === currentFolderId ||
      (fParentId && currentFolder?._id && fParentId === normalizeId(currentFolder._id)) ||
      (fParentId && currentFolder?.id && fParentId === normalizeId(currentFolder.id));
  });

  const totalVideos = recordedVideos.length;
  const completedVideos = progress.completedVideos.length;
  const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
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
      <div className="relative">
        {courseImage ? (
          <div className="w-full h-56 bg-gradient-to-br from-primary-800 to-primary-600 relative overflow-hidden">
            <img src={courseImage} alt={course.name || course.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
            </div>
            <span className="material-symbols-rounded text-white/15 text-[120px]">school</span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200">
            <span className="material-symbols-rounded text-white text-xl">arrow_back</span>
          </button>
          <div className="relative">
            <button onClick={handleShare} className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200">
              <span className="material-symbols-rounded text-white text-xl">share</span>
            </button>
            {shareSuccess && (
              <div className="absolute -bottom-10 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-elevated animate-fade-in">
                <span className="material-symbols-rounded text-xs mr-1">check_circle</span>
                Link copied!
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 animate-fade-in-up">
        <div className="card-premium p-5">
          <h1 className="text-lg font-extrabold text-gray-800 leading-tight">{course.name || course.title}</h1>
          {course.instructor && (
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                <span className="material-symbols-rounded text-primary-600 text-base">person</span>
              </div>
              <span className="text-sm text-gray-600 font-medium">{course.instructor}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {course.category && (
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 text-[10px] font-bold px-3 py-1.5 rounded-full">
                <span className="material-symbols-rounded text-xs">category</span>
                {course.category}
              </span>
            )}
            {(course.enrollmentCount !== undefined && course.enrollmentCount > 0) && (
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-full">
                <span className="material-symbols-rounded text-xs">group</span>
                {course.enrollmentCount} Enrolled
              </span>
            )}
          </div>

          {isEnrolled && (
            <div className="mt-4 bg-surface-100 rounded-2xl p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500 font-medium">{completedVideos}/{totalVideos} videos completed</span>
                <span className="font-bold text-primary-600">{progressPercent}%</span>
              </div>
              <div className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500 relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  {progressPercent > 5 && <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse-soft" />}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-surface-200">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Share:</span>
            {[
              { platform: 'whatsapp', color: '#25D366', icon: 'chat' },
              { platform: 'telegram', color: '#26A5E4', icon: 'send' },
              { platform: 'facebook', color: '#1877F2', icon: 'thumb_up' },
              { platform: 'twitter', color: '#1DA1F2', icon: 'tag' },
            ].map(s => (
              <button
                key={s.platform}
                onClick={() => shareOnPlatform(s.platform)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white active:scale-[0.97] transition-all duration-200 hover:shadow-card"
                style={{ backgroundColor: s.color }}
              >
                <span className="material-symbols-rounded text-sm">{s.icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>


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
              dangerouslySetInnerHTML={{ __html: course.description }}
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
          <div className="space-y-3">
            {/* Course Content Header/Grid similar to Reference */}


            {navigationHistory.length > 0 && (
              <button
                onClick={navigateUp}
                className="flex items-center gap-1.5 text-primary-600 font-black text-[10px] mb-4 px-3 py-2 bg-primary-50 w-fit rounded-xl hover:bg-primary-100 transition-all uppercase tracking-widest border border-primary-100/50 active:scale-95"
              >
                <span className="material-symbols-rounded text-base">chevron_left</span>
                Back to {navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2].title : 'All Content'}
              </button>
            )}

            <div className="space-y-4">
              {filteredFolders.map((folder) => (
                <div
                  key={normalizeId(folder.id || folder._id)}
                  onClick={() => navigateIntoFolder(folder)}
                  className="bg-white p-4 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between group rounded-[1.8rem] border-[1.5px] border-gray-50 shadow-sm hover:shadow-md hover:border-primary-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#3F51B5] rounded-[1.2rem] flex items-center justify-center text-white shadow-lg overflow-hidden relative">
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="material-symbols-rounded text-2xl">folder</span>
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm tracking-tight leading-none mb-1.5 transition-colors group-hover:text-primary-600">
                        {folder.title || (folder as any).name || 'Chapter'}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] opacity-40">SECTION</p>
                    </div>
                  </div>
                  <span className="material-symbols-rounded text-gray-300 group-hover:text-primary-500 transition-all mr-1">chevron_right</span>
                </div>
              ))}
            </div>

            {filteredVideos.length === 0 &&
              filteredFolders.length === 0 ? (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-rounded text-3xl text-gray-300">video_library</span>
                </div>
                <p className="text-gray-400 font-medium text-sm">No items in this folder</p>
              </div>
            ) : (
              filteredVideos.map((video, index) => {
                const videoId = video.id || video._id;
                const isCompleted = progress.completedVideos.includes(videoId as string);
                const canPlay = isEnrolled || video.isFree || video.isDemo || (index === 0 && navigationHistory.length === 0);
                const isLocked = !canPlay;
                return (
                  <div
                    key={videoId}
                    onClick={() => !isLocked && handleVideoClick(video)}
                    className={`card-premium overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 animate-fade-in-up ${isLocked ? 'opacity-70' : ''}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative w-28 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                        {!failedImages.has(video.id) ? (
                          <img
                            src={getImageUrl(video.thumbnail) || getYouTubeThumbnail(video.youtubeUrl || video.videoUrl || '') || `https://picsum.photos/400/225?sig=${video.id}`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => handleImageError(video.id)}
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${getGradientPlaceholder(video.title, CATEGORY_GRADIENTS).gradient} flex items-center justify-center`}>
                            <span className="text-white text-2xl font-bold opacity-60">{getGradientPlaceholder(video.title, CATEGORY_GRADIENTS).initial}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          {isLocked ? (
                            <div className="w-9 h-9 bg-gray-800/80 rounded-full flex items-center justify-center">
                              <span className="material-symbols-rounded text-lg text-white">lock</span>
                            </div>
                          ) : (
                            <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-card">
                              <span className="material-symbols-rounded text-lg text-primary-600">play_arrow</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          {video.duration || '00:00'}
                        </div>
                        {(video.isFree || video.isDemo || (index === 0 && navigationHistory.length === 0)) && !isEnrolled && (
                          <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            {video.isDemo ? 'DEMO' : 'FREE'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-start gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${isLocked ? 'bg-surface-200 text-gray-400' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary-50 text-primary-600'}`}>
                            {isCompleted ? <span className="material-symbols-rounded text-xs">check</span> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{video.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-400 font-medium">{video.duration || '00:00'} min</span>
                              {isCompleted && (
                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">Completed</span>
                              )}
                              {isLocked && (
                                <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">Locked</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isEnrolled && !isCompleted && !isLocked && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markVideoComplete(video.id); }}
                          className="self-center w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all duration-200 flex-shrink-0"
                        >
                          <span className="material-symbols-rounded text-lg">check_circle</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {!isEnrolled ? (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-rounded text-3xl text-gray-300">lock</span>
                </div>
                <p className="text-gray-500 font-medium text-sm">Enroll to access notes</p>
                {isPaidCourse ? (
                  <button onClick={handleBuyNow} className="mt-4 btn-accent px-6 py-2.5 text-sm">Buy Now - ₹{course.price}</button>
                ) : (
                  <button onClick={handleEnroll} disabled={enrolling} className="mt-4 btn-primary px-6 py-2.5 text-sm disabled:opacity-50">{enrolling ? 'Enrolling...' : 'Enroll Free'}</button>
                )}
              </div>
            ) : notes.length === 0 ? (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-rounded text-3xl text-gray-300">description</span>
                </div>
                <p className="text-gray-400 font-medium text-sm">No notes available here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Notes List - Flat List as requested */}
                {notes.map((note: any, i: number) => (
                  <div
                    key={note.id || note._id}
                    className="card-premium p-4 flex items-center gap-4 animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-rounded text-orange-500 text-xl">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{note.title}</h4>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[10px]">picture_as_pdf</span>
                        PDF • {note.fileSize || '2.5 MB'}
                      </p>
                    </div>
                    <a
                      href={getPdfUrl(note.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 active:scale-[0.97] transition-all duration-200 hover:bg-primary-100"
                    >
                      <span className="material-symbols-rounded text-xl">download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-4">
            {navigationHistory.length > 0 && (
              <button
                onClick={navigateUp}
                className="flex items-center gap-1.5 text-primary-600 font-black text-[10px] mb-4 px-3 py-2 bg-primary-50 w-fit rounded-xl hover:bg-primary-100 transition-all uppercase tracking-widest border border-primary-100/50 active:scale-95"
              >
                <span className="material-symbols-rounded text-base">chevron_left</span>
                Back to {navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2].title : 'All Content'}
              </button>
            )}

            {filteredTests.length === 0 && filteredFolders.length === 0 ? (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-rounded text-3xl text-gray-300">quiz</span>
                </div>
                <p className="text-gray-400 font-medium text-sm">No tests available here</p>
              </div>
            ) : (
              filteredTests.map((test: any, i: number) => {
                const isAttempted = progress.completedTests.includes(test.id);
                const canAccess = isEnrolled || test.isFree;
                const isLocked = !canAccess;
                return (
                  <div
                    key={test.id}
                    className={`card-premium p-4 animate-fade-in-up ${isLocked ? 'opacity-70' : ''}`}
                    style={{ animationDelay: `${(filteredFolders.length + i) * 60}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLocked ? 'bg-surface-200' : 'bg-gradient-to-br from-purple-100 to-purple-50'}`}>
                          <span className={`material-symbols-rounded text-xl ${isLocked ? 'text-gray-400' : 'text-purple-500'}`}>
                            {isLocked ? 'lock' : 'quiz'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-800">{test.name}</h4>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {test.numberOfQuestions || test.questions || 0} Questions • {test.duration || 60} mins
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.isFree && !isEnrolled && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                            FREE
                          </span>
                        )}
                        {isAttempted && (
                          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5">
                            <span className="material-symbols-rounded text-[10px]">check_circle</span>
                            Done
                          </span>
                        )}
                        {isLocked && (
                          <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>
                    {canAccess ? (
                      <button
                        onClick={() => navigate(`/test/${test.id || test._id}`)}
                        className="w-full btn-primary py-3 text-sm active:scale-[0.97] transition-all duration-200"
                      >
                        {isAttempted ? 'View Result / Retake' : 'Start Test'}
                      </button>
                    ) : (
                      <button
                        onClick={handleBuyNow}
                        className="w-full bg-surface-200 text-gray-500 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200"
                      >
                        <span className="material-symbols-rounded text-sm">lock</span>
                        Buy Course to Unlock
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div className="space-y-6">
            {!isEnrolled ? (
              <div className="card-premium p-10 text-center animate-fade-in-up">
                <div className="w-20 h-20 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-4xl text-gray-300">lock</span>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Access Restricted</h3>
                <p className="text-gray-500 font-medium text-sm mb-6">Please enroll in this course to join live interactive sessions and expert-led classes.</p>
                {isPaidCourse ? (
                  <button onClick={handleBuyNow} className="btn-accent px-10 py-4 text-sm rounded-2xl shadow-xl hover:scale-105 transition-all">Buy Course - ₹{course.price}</button>
                ) : (
                  <button onClick={handleEnroll} disabled={enrolling} className="btn-primary px-10 py-4 text-sm rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50">{enrolling ? 'Enrolling...' : 'Enroll Free'}</button>
                )}
              </div>
            ) : (
              <>
                {liveStreams.filter(live => computeEffectiveStatus(live) === 'live').length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                      Ongoing Live Sessions
                    </h3>
                    <div className="space-y-4">
                      {liveStreams.filter(live => computeEffectiveStatus(live) === 'live').map((live, idx) => {
                        const thumbUrl = getImageUrl(live.thumbnail) || getYouTubeThumbnail(live.youtubeUrl || '') || `https://picsum.photos/400/225?sig=${live.id || live._id || idx}`;

                        return (
                          <div
                            key={live.id || live._id}
                            onClick={() => handleVideoClick(live)}
                            className="card-premium p-4 rounded-[2.5rem] border-2 border-red-100 bg-red-50/20 shadow-xl shadow-red-500/5 group relative overflow-hidden active:scale-[0.98] transition-all"
                          >
                             <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                             <div className="flex gap-4 items-center relative z-10">
                              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20 relative">
                                <span className="material-symbols-rounded text-white text-3xl">sensors</span>
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-extrabold text-lg text-gray-900 truncate mb-1 uppercase tracking-tight">{live.title}</h4>
                                <span className="text-sm text-gray-500 font-bold flex items-center gap-1.5">
                                  <span className="material-symbols-rounded text-lg text-red-500">person</span>
                                  {live.instructor || 'Lead Instructor'}
                                </span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVideoClick(live); }}
                                className="bg-red-600 text-white text-xs px-6 py-2.5 rounded-xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-[0.97] uppercase tracking-widest"
                              >
                                <span className="material-symbols-rounded text-lg">videocam</span>
                                JOIN
                              </button>
                            </div>

                            {(live.pdf1 || live.pdf2 || live.studyMaterial) && (
                              <div className="flex flex-wrap gap-2 pt-4 mt-1 border-t border-red-100/50 relative z-10">
                                {live.pdf1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank'); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-600 text-[10px] font-black border border-red-100 uppercase tracking-widest shadow-sm"
                                  >
                                    <span className="material-symbols-rounded text-base">picture_as_pdf</span>
                                    PDF 1
                                  </button>
                                )}
                                {live.studyMaterial && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank'); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-600 text-[10px] font-black border border-indigo-100 uppercase tracking-widest shadow-sm"
                                  >
                                    <span className="material-symbols-rounded text-base">auto_stories</span>
                                    Material
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {liveStreams.filter(live => computeEffectiveStatus(live) === 'upcoming').length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                      <span className="material-symbols-rounded text-sm text-primary-500">schedule</span>
                      Upcoming Live Classes
                    </h3>
                    {liveStreams.filter(live => computeEffectiveStatus(live) === 'upcoming').map((live, idx) => {
                      const scheduledTime = live.scheduledTime || live.startTime || live.publishOn || live.scheduledAt;
                      
                      const displayTime = (() => {
                        if (!scheduledTime) return '';
                        const d = new Date(String(scheduledTime).replace(' ', 'T'));
                        if (isNaN(d.getTime())) return '';
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      })();

                      return (
                        <div
                          key={live.id || live._id}
                          className="card-premium p-5 rounded-[2.2rem] border border-gray-100 bg-white shadow-card flex flex-col gap-4 group"
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="w-14 h-14 bg-blue-50 rounded-[1.2rem] flex items-center justify-center shrink-0 border border-blue-100">
                              <span className="material-symbols-rounded text-blue-500 text-2xl">calendar_today</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-extrabold text-gray-900 text-sm uppercase tracking-tight line-clamp-1">{live.title}</h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                <span className="text-[11px] text-gray-400 font-bold flex items-center gap-1.5">
                                  <span className="material-symbols-rounded text-[16px] text-blue-400">person</span>
                                  {live.instructor || 'Lead Instructor'}
                                </span>
                                {displayTime && (
                                  <span className="text-[11px] text-gray-500 font-extrabold flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-[16px] text-blue-500">schedule</span>
                                    {displayTime}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 bg-blue-50 text-blue-600 text-[9px] px-3.5 py-2 rounded-xl font-black uppercase tracking-widest border border-blue-100">
                              Upcoming
                            </div>
                          </div>

                          {(live.pdf1 || live.studyMaterial) && (
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                               {live.pdf1 && (
                                <button
                                  onClick={() => window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100/50"
                                >
                                  <span className="material-symbols-rounded text-[14px]">picture_as_pdf</span>
                                  PDF
                                </button>
                               )}
                               {live.studyMaterial && (
                                <button
                                  onClick={() => window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100/50"
                                >
                                  <span className="material-symbols-rounded text-[14px]">auto_stories</span>
                                  Note
                                </button>
                               )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {liveStreams.filter(live => ['live', 'upcoming'].includes(computeEffectiveStatus(live))).length === 0 && (
                  <div className="card-premium p-10 text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-rounded text-3xl text-gray-300">sensors_off</span>
                    </div>
                    <p className="text-gray-400 font-medium text-sm">No live classes scheduled</p>
                  </div>
                )}

              </>
            )}
          </div>
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

        {!isEnrolled && (
          <div className="mt-8 mb-24 px-4 sticky bottom-4 z-40">
            <div className="bg-[#0D1B2A] p-5 rounded-[2.2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border border-white/10 mx-auto max-w-sm animate-fade-in-up">
              <div className="flex flex-col gap-0.5 ml-1">
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
            if (vId) markVideoComplete(vId as string);
            closeVideoPlayer();
          }}
          chatMessages={liveMessages}
          onSendMessage={(msg) => {
            handleSendLiveMessage(msg);
          }}
        />
      )}
    </div>
  );
};

export default CourseDetails;
