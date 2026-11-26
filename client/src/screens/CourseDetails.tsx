import React, { useState, useEffect, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getImageUrl, getVideoUrl, getPdfUrl, getYouTubeThumbnail, getGradientPlaceholder, toYouTubeEmbed, isYouTubeUrl, isLiveUrl } from '../lib/utils';
import StudentVideoPlayer from '../components/student/StudentVideoPlayer';
import { CourseTopNav } from './course-details/components/CourseTopNav';
import { CourseOverviewHeader } from './course-details/components/CourseOverviewHeader';
import { VisualPreviewCarousel } from './course-details/components/VisualPreviewCarousel';
import { AboutCourseSpecs } from './course-details/components/AboutCourseSpecs';
import { FreeContentSection } from './course-details/components/FreeContentSection';
import { DifficultySupportCard } from './course-details/components/DifficultySupportCard';
import { InPagePricingSection } from './course-details/components/InPagePricingSection';
import { CouponBottomSheet } from './course-details/components/CouponBottomSheet';
import { StateSelectionBottomSheet } from './course-details/components/StateSelectionBottomSheet';
import { CourseBottomBar } from './course-details/components/CourseBottomBar';
import CourseHero from './course-details/components/CourseHero';
import CourseMetadata from './course-details/components/CourseMetadata';
import CourseCheckoutBar from './course-details/components/CourseCheckoutBar';
import NotesTab from './course-details/components/NotesTab';
import TestsTab from './course-details/components/TestsTab';
import LiveTab from './course-details/components/LiveTab';
import RecordedTab from './course-details/components/RecordedTab';
import { Course, Video, Progress } from '../types';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { CATEGORY_GRADIENTS } from '../constants';
import { API_BASE_URL as _API_BASE_URL, getAuthHeaders as getStudentAuthHeaders } from '../services/apiClient';
const API_BASE_URL = _API_BASE_URL;

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
  const location = useLocation();
  const { student } = useAuthStore();
  const setShowBottomNavOnCourse = useUIStore(s => s.setShowBottomNavOnCourse);
  const [course, setCourse] = useState<Course | null>(() => {
    try {
      const cached = sessionStorage.getItem(`course_cache_${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [videos, setVideos] = useState<Video[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [progress, setProgress] = useState<Progress>({ completedVideos: [], completedTests: [], completedNotes: [] });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem(`course_cache_${id}`);
      return !cached;
    } catch {
      return true;
    }
  });
  const [isEnrolled, setIsEnrolled] = useState(() => {
    try {
      const studentData = localStorage.getItem('student') || localStorage.getItem('studentData');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        const enrolledList = parsed.enrolledCourses || [];
        const enrolledBatch = parsed.enrolledBatch;
        const currentId = id ? String(id) : '';
        return enrolledList.some((c: any) => String(c.id || c._id || c) === currentId) || String(enrolledBatch) === currentId;
      }
    } catch {}
    return false;
  });
  const [mainTab, setMainTab] = useState<'overview' | 'content'>(() => {
    if (location.state?.tab === 'content' || location.state?.openContent) return 'content';
    try {
      const studentData = localStorage.getItem('student') || localStorage.getItem('studentData');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        const enrolledList = parsed.enrolledCourses || [];
        const enrolledBatch = parsed.enrolledBatch;
        const currentId = id ? String(id) : '';
        const isPreEnrolled = enrolledList.some((c: any) => String(c.id || c._id || c) === currentId) || String(enrolledBatch) === currentId;
        if (isPreEnrolled) return 'content';
      }
    } catch {}
    return 'overview';
  });
  const [activeTab, setActiveTab] = useState<'videos' | 'notes' | 'tests' | 'live'>('videos');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [selectedState, setSelectedState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('student_selected_state');
      if (stored) return stored;
      const studentData = localStorage.getItem('studentData');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        if (parsed.state) return parsed.state;
      }
    } catch {}
    return (student as any)?.state || 'Haryana';
  });
  const [isStateSheetOpen, setIsStateSheetOpen] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const handleSelectState = (newState: string) => {
    setSelectedState(newState);
    try {
      localStorage.setItem('student_selected_state', newState);
      const studentData = localStorage.getItem('studentData');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        parsed.state = newState;
        localStorage.setItem('studentData', JSON.stringify(parsed));
      }
    } catch {}
  };
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
      const studentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const adminToken = localStorage.getItem('adminToken');
      const authHeader = studentToken ? { 'Authorization': `Bearer ${studentToken}` } : (adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {});
      const res = await fetch(`${API_BASE_URL}/live-chat/${vId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        }
      });
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
      const res = await fetch(`${API_BASE_URL}/live-chat/${vid}/messages`, {
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
    const studentHeaders = getStudentAuthHeaders();
    return {
      'Content-Type': 'application/json',
      ...studentHeaders
    };
  };



  const tabConfig = [
    { key: 'videos' as const, label: 'Recorded', icon: 'play_circle' },
    { key: 'notes' as const, label: 'Notes', icon: 'description' },
    { key: 'tests' as const, label: 'Tests', icon: 'quiz' },
    { key: 'live' as const, label: 'Live stream', icon: 'sensors' },
  ];

  const setBottomNavHidden = useUIStore(s => s.setBottomNavHidden);

  // Handle mobile web / browser back button when video is open (fallback for non-Capacitor environments)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!showVideoPlayer) return;

    window.history.pushState({ videoModal: true }, '');

    const handlePopState = () => {
      setShowVideoPlayer(false);
      setSelectedVideo(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.videoModal) {
        window.history.back();
      }
    };
  }, [showVideoPlayer]);


  const handleImageError = useCallback((id: string) => {
    setFailedImages(prev => new Set(prev).add(id));
  }, []);



  const handleVideoClick = (video: Video) => {
    // STRICT PLAYABILITY RULE: Upcoming live streams must not open player
    const status = computeEffectiveStatus(video);
    if (video.contentType === 'live_stream' && status === 'upcoming') {
      return;
    }

    if (status === 'live') {
      video.streamStatus = 'live';
      video.isLive = true;
    }

    const isFirstVideoInRoot = navigationHistory.length === 0 && filteredVideos[0] === video;

    const canPlay = (isEnrolled && !isCourseExpired) || video.isFree || video.isDemo || isFirstVideoInRoot;

    // Resolve raw URL first (include recorded links for ended live streams)
    const rawUrl = video.recordedLink || 
                   video.recordingUrl || 
                   video.replayUrl || 
                   video.youtubeUrl || 
                   video.videoUrl || 
                   video.url || 
                   video.meetingLink || 
                   video.liveUrl || 
                   video.streamUrl || 
                   (video as any).streamId || 
                   '';

    const url = toYouTubeEmbed(rawUrl);
    if (canPlay && url) {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    } else if (!canPlay) {
      alert('🔒 Please enroll in this course to watch this video.');
    }
  };

  const handleViewNote = (note: any) => {
    const canPlay = (isEnrolled && !isCourseExpired) || note.isFree || (course?.price === 0 && !isCourseExpired);
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
    const courseUrl = `https://aonetarget.in/#/course/${id}`;
    const courseTitle = course?.name || course?.title || 'Check out this course';
    const shareData = {
      title: courseTitle,
      text: `${courseTitle} - Learn with Aone Target Institute!`,
      url: courseUrl,
    };

    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            title: shareData.title,
            text: `${shareData.text}\n\n📱 Download App:\nhttps://play.google.com/store/apps/details?id=com.aonetarget.education`,
            dialogTitle: 'Share Course'
          });
        } catch (err) {
          console.log('Capacitor share failed:', err);
        }
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n📱 Download App:\nhttps://play.google.com/store/apps/details?id=com.aonetarget.education`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n📱 Download App:\nhttps://play.google.com/store/apps/details?id=com.aonetarget.education`);
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
      const progressRes = await fetch(`${API_BASE_URL}/students/${studentId}/courses/${id}/progress`, { headers: getAuthHeaders() });
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
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 8000, fallback: T): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>(resolve => setTimeout(() => resolve(fallback), timeoutMs))
        ]);
      };

      const t = Date.now();
      const coursePromise = withTimeout(
        fetch(`${API_BASE_URL}/courses/${id}?t=${t}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
        8000,
        null
      );
      const videosPromise = withTimeout(
        fetch(`${API_BASE_URL}/courses/${id}/videos?studentId=${studentId}&t=${t}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
        8000,
        []
      );
      const notesPromise = withTimeout(
        fetch(`${API_BASE_URL}/courses/${id}/notes?t=${t}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
        8000,
        []
      );
      const testsPromise = withTimeout(
        fetch(`${API_BASE_URL}/courses/${id}/tests?t=${t}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
        8000,
        []
      );
      const foldersPromise = withTimeout(
        fetch(`${API_BASE_URL}/courses/${id}/folders?t=${t}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []),
        6000,
        []
      );
      const enrolledPromise = studentId ? withTimeout(
        (async () => {
          let res = await fetch(`${API_BASE_URL}/students/${studentId}/enrolled/${id}?t=${t}`, { headers: h, cache: 'no-store' });
          if (res.status === 401) {
            const refreshed = await useAuthStore.getState().refreshToken().catch(() => false);
            if (refreshed) {
              res = await fetch(`${API_BASE_URL}/students/${studentId}/enrolled/${id}?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' });
            }
          }
          return res.ok ? res.json() : null;
        })().catch(() => null),
        8000,
        null
      ) : Promise.resolve(null);

      // Fast unblock: As soon as main course info arrives, show the page!
      coursePromise.then(courseData => {
        if (courseData && !courseData.error) {
          setCourse(courseData);
          setLoading(false);
          try {
            sessionStorage.setItem(`course_cache_${id}`, JSON.stringify(courseData));
          } catch {}
        }
      });

      const [courseData, videosData, notesData, testsData, foldersData, enrolledData] = await Promise.all([
        coursePromise,
        videosPromise,
        notesPromise,
        testsPromise,
        foldersPromise,
        enrolledPromise
      ]);

      if (courseData && !courseData.error) {
        setCourse(courseData);
        try {
          sessionStorage.setItem(`course_cache_${id}`, JSON.stringify(courseData));
        } catch {}
      }

      setVideos(Array.isArray(videosData) ? videosData : []);
      setNotes(Array.isArray(notesData) ? notesData : []);
      setTests(Array.isArray(testsData) ? testsData.filter((t: Test) => !t.status || t.status === 'active') : []);
      setFolders(Array.isArray(foldersData) ? foldersData : []);

      if (enrolledData) {
        const enrolledFlag = Boolean(enrolledData.enrolled);
        const expiredFlag = Boolean(enrolledData.isExpired);
        setIsEnrolled(enrolledFlag);
        setIsCourseExpired(expiredFlag);
        setEnrollmentStatus(enrolledData.status || (expiredFlag ? 'expired' : (enrolledFlag ? 'active' : 'not_enrolled')));

        if (enrolledFlag) {
          fetchCourseProgress();
          // Active enrolled student: show Content tab automatically!
          if (!expiredFlag) {
            setMainTab('content');
          }
        }
      } else {
        setIsEnrolled(false);
        setIsCourseExpired(false);
        setEnrollmentStatus('not_enrolled');
      }
    } catch (error) {
      // Fetch failed
    } finally {
      setLoading(false);
    }
  };

  const activateEnrolledState = (targetCourseId?: string) => {
    setIsEnrolled(true);
    setIsCourseExpired(false);
    setEnrollmentStatus('active');
    setMainTab('content');
    setBottomNavHidden(false);
    setShowBottomNavOnCourse(true);

    try {
      const idsToSave = Array.from(new Set([id, targetCourseId, course?.id, (course as any)?._id].filter(Boolean).map(String)));
      idsToSave.forEach(cid => sessionStorage.setItem(`course_enrolled_${cid}`, 'true'));
      ['student', 'studentData'].forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const existing = Array.isArray(parsed.enrolledCourses) ? parsed.enrolledCourses.map((c: any) => String(c.id || c._id || c)) : [];
          parsed.enrolledCourses = Array.from(new Set([...existing, ...idsToSave]));
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      });
    } catch {}
  };

  const performDirectEnrollment = async (couponCode?: string) => {
    if (!studentId) {
      alert('Please login first to enroll in this course');
      sessionStorage.setItem('postLoginRedirect', location.pathname);
      navigate('/student-login', { state: { from: location.pathname } });
      return;
    }

    setEnrolling(true);
    try {
      let response = await fetch(`${API_BASE_URL}/students/${studentId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ courseId: id, couponCode })
      });

      if (response.status === 401) {
        const refreshed = await useAuthStore.getState().refreshToken();
        if (refreshed) {
          response = await fetch(`${API_BASE_URL}/students/${studentId}/enroll`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({ courseId: id, couponCode })
          });
        }
      }

      if (response.ok) {
        activateEnrolledState(String(course?.id || course?._id || id || ''));
        setShowSuccessModal(true);
        fetchCourseData();
        fetchCourseProgress();
        useAuthStore.getState().checkAuth().catch(() => {});
      } else {
        const error = await response.json().catch(() => ({}));
        if (response.status === 401) {
          alert('Your session has expired. Please login again to enroll.');
          navigate('/student-login', { state: { from: location.pathname } });
        } else {
          alert(error.error || 'Failed to enroll. Please try again.');
        }
      }
    } catch (error) {
      alert('Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnroll = async () => {
    if (isPaidCourse) {
      handleBuyNow();
      return;
    }
    await performDirectEnrollment();
  };

  const handleApplyCoupon = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          code,
          courseId: id,
          amount: Number(course?.price || 0)
        })
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(code);
        setDiscountAmount(Number(data.discountAmount || data.discount || 0));
        return { success: true, message: `Coupon applied! Saved ₹${data.discountAmount || data.discount}` };
      } else {
        return { success: false, message: data.message || data.error || 'Invalid coupon code' };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to apply coupon' };
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const handleBuyNow = async () => {
    if (!studentId) {
      alert('Please login first to enroll or purchase this course');
      sessionStorage.setItem('postLoginRedirect', location.pathname);
      navigate('/student-login', { state: { from: location.pathname } });
      return;
    }

    const currentBasePrice = Number(course?.price || 0);
    const payableAmount = Math.max(0, currentBasePrice - discountAmount);

    // Free course or 100% coupon discount
    if (payableAmount <= 0 || course?.isFree) {
      await performDirectEnrollment(appliedCoupon || undefined);
      return;
    }

    setProcessingPayment(true);
    try {
      const targetCourseId = String(course?.id || course?._id || id);

      let orderRes = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          courseId: targetCourseId,
          amount: payableAmount,
          couponCode: appliedCoupon || undefined,
          studentId: studentId
        })
      });

      if (orderRes.status === 401) {
        const refreshed = await useAuthStore.getState().refreshToken();
        if (refreshed) {
          orderRes = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({
              courseId: targetCourseId,
              amount: payableAmount,
              couponCode: appliedCoupon || undefined,
              studentId: studentId
            })
          });
        }
      }

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        if (orderRes.status === 401) {
          sessionStorage.setItem('postLoginRedirect', location.pathname);
          alert('Your session has expired. Please login again.');
          navigate('/student-login', { state: { from: location.pathname } });
          setProcessingPayment(false);
          return;
        }
        throw new Error(orderData.error || orderData.message || 'Failed to create payment order');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Aone Target Institute',
        description: course?.title || course?.name || 'Course Purchase',
        order_id: orderData.orderId,
        prefill: {
          name: student?.name || '',
          email: student?.email || '',
          contact: student?.phone || (student as any)?.mobile || ''
        },
        theme: {
          color: '#008BDC'
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/razorpay/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                courseId: targetCourseId,
                studentId: studentId,
                couponCode: appliedCoupon || undefined
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setProcessingPayment(false);
              activateEnrolledState(targetCourseId);
              setShowSuccessModal(true);
              fetchCourseData();
              fetchCourseProgress();
              useAuthStore.getState().checkAuth().catch(() => {});
            } else {
              alert(verifyData.error || 'Payment verification failed. If money was debited, it will be updated shortly.');
            }
          } catch (vErr) {
            console.error('Payment verification error:', vErr);
            alert('Payment completed. Please refresh the page if content remains locked.');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          }
        }
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          alert(resp.error?.description || 'Payment Failed. Please try again.');
          setProcessingPayment(false);
        });
        rzp.open();
      } else {
        alert('Payment gateway is still initializing. Please try again in a few seconds.');
        setProcessingPayment(false);
      }
    } catch (err: any) {
      alert(err.message || 'Payment initiation failed. Please try again.');
      setProcessingPayment(false);
    }
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

      const res = await fetch(`${API_BASE_URL}/students/${studentId}/courses/${id}/progress`, {
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
          const res = await fetch(`${API_BASE_URL}/courses`);
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

  useEffect(() => {
    // Check local student enrollment on id change
    try {
      const studentData = localStorage.getItem('student') || localStorage.getItem('studentData');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        const enrolledList = parsed.enrolledCourses || [];
        const enrolledBatch = parsed.enrolledBatch;
        const currentId = id ? String(id) : '';
        const isPreEnrolled = enrolledList.some((c: any) => String(c.id || c._id || c) === currentId) || String(enrolledBatch) === currentId;
        if (isPreEnrolled) {
          setIsEnrolled(true);
          setMainTab('content');
          return;
        }
      }
    } catch {}
    setIsEnrolled(false);
    setIsCourseExpired(false);
    setEnrollmentStatus('not_enrolled');
  }, [id]);

  useEffect(() => {
    fetchCourseData();
    fetchCourseProgress(); // Force initial sync

    const handleContentUpdate = () => {
      fetchCourseData();
      fetchCourseProgress();
    };

    window.addEventListener('focus', fetchCourseProgress);
    window.addEventListener('app:content-updated', handleContentUpdate);
    window.addEventListener('app:live-status-changed', handleContentUpdate);

    // Auto-poll stream status if on live tab or player is active
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && (activeTab === 'live' || showVideoPlayer)) {
        fetchCourseData();
      }
    }, 6000);

    return () => {
      window.removeEventListener('focus', fetchCourseProgress);
      window.removeEventListener('app:content-updated', handleContentUpdate);
      window.removeEventListener('app:live-status-changed', handleContentUpdate);
      clearInterval(pollInterval);
    };
  }, [id, location.pathname, student?.id, activeTab, showVideoPlayer]);

  // Sync Bottom Navigation: Show BottomNav on course page ONLY when student is enrolled & active
  useEffect(() => {
    const isEnrolledActive = Boolean(isEnrolled && !isCourseExpired);
    if (isEnrolledActive && !showVideoPlayer) {
      setBottomNavHidden(false);
      setShowBottomNavOnCourse(true);
    } else {
      setBottomNavHidden(true);
      setShowBottomNavOnCourse(false);
    }
    return () => {
      setBottomNavHidden(false);
      setShowBottomNavOnCourse(false);
    };
  }, [isEnrolled, isCourseExpired, showVideoPlayer, setBottomNavHidden, setShowBottomNavOnCourse]);

  // Keep selected video in sync with latest videos list for real-time live status updates
  useEffect(() => {
    if (selectedVideo && videos.length > 0) {
      const vId = selectedVideo.id || selectedVideo._id;
      const updated = videos.find(v => (v.id && v.id === vId) || (v._id && v._id === vId));
      if (updated && (updated.streamStatus !== selectedVideo.streamStatus || updated.isLive !== selectedVideo.isLive)) {
        setSelectedVideo(updated);
      }
    }
  }, [videos]);

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

  useEffect(() => {
    // If course is not found after loading, clean it up from local storage so it stops appearing in "Continue Watching"
    if (!loading && !course && id) {
      try {
        const progressData = JSON.parse(localStorage.getItem('player_progress') || '{}');
        const newData = { ...progressData };
        let changed = false;
        Object.keys(newData).forEach(key => {
          if (newData[key].courseId === id) {
            delete newData[key];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('player_progress', JSON.stringify(newData));
        }
      } catch (e) { console.error('Cleanup fail:', e); }
    }
  }, [loading, course, id]);

  const navigateIntoFolder = (folder: any) => {
    setNavigationHistory(prev => [...prev, folder]);
  };

  const lastWatchedVideo = React.useMemo(() => {
    try {
      const progressData = JSON.parse(localStorage.getItem('player_progress') || '{}');
      const watchedIds = Object.keys(progressData);
      if (watchedIds.length > 0) {
        const found = videos.find(v => watchedIds.includes(String(v.id || v._id)));
        if (found) return found;
      }
    } catch {}
    return videos[0] || null;
  }, [videos]);

  const handleStartLearning = () => {
    if (isCourseExpired) {
      alert('Your access to this course has expired. Please renew your subscription to continue.');
      return;
    }
    const targetVideo = lastWatchedVideo || videos[0];
    if (targetVideo) {
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
  const basePrice = Number(course?.price || 0);
  const mrp = Number(course?.mrp || (course as any)?.originalPrice || basePrice);
  const finalPayableAmount = Math.max(0, basePrice - discountAmount);
  const isPaidCourse = basePrice > 0 && !course?.isFree;

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
          <button onClick={() => navigate('/courses', { replace: true })} className="mt-4 btn-primary px-6 py-2.5 text-sm">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const courseImage = getImageUrl(course.imageUrl || course.thumbnail);
  const shareOnPlatform = (platform: string) => {
    const courseTitle = course.name || course.title || 'Check out this course';
    const text = `${courseTitle} - Learn with Aone Target Institute!\n\n📱 Download App:\nhttps://play.google.com/store/apps/details?id=com.aonetarget.education`;
    let url = '';
    switch (platform) {
      case 'whatsapp': url = `https://wa.me/?text=${encodeURIComponent(text)}`; break;
      case 'telegram': url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`; break;
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=https://play.google.com/store/apps/details?id=com.aonetarget.education`; break;
      case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`; break;
    }
    if (url) window.open(url, '_blank');
  };

  const demoVideos = videos.filter(v => v.isDemo || v.isFree || v.contentType === 'free_video');
  const previewVideos = demoVideos.length > 0 ? demoVideos : (recordedVideos.length > 0 ? [recordedVideos[0]] : []);
  const freeVideos = videos.filter(v => v.isFree || v.isDemo);

  return (
    <div className={`min-h-screen bg-[#f8fafc] font-outfit select-none ${(!isEnrolled || isCourseExpired) ? 'pb-28 sm:pb-32' : 'pb-24 sm:pb-28'}`}>
      {/* Top Bar with Back, Title, Share & Overview / Content Tabs (Screenshots 6, 7, 8) */}
      <CourseTopNav
        courseTitle={course.name || course.title}
        mainTab={mainTab}
        onTabChange={setMainTab}
        onBack={() => navigate(-1)}
        onShare={handleShare}
        shareSuccess={shareSuccess}
      />

      {mainTab === 'overview' ? (
        <main className="space-y-1 animate-fade-in pb-4">
          {/* Header with Title, Category, Likes and Tags (Screenshot 6) */}
          <CourseOverviewHeader
            title={course.name || course.title}
            category={course.category}
            likeCount={160}
            hasLiveClasses={liveStreams.length > 0}
            hasFreeContent={freeVideos.length > 0}
            hasTests={tests.length > 0}
          />

          {/* Visual Preview Row: Poster + Playable Demo Video with Duration Badge (Screenshot 6) */}
          <VisualPreviewCarousel
            courseImage={courseImage}
            courseTitle={course.name || course.title}
            demoVideos={previewVideos}
            onPlayDemo={handleVideoClick}
          />

          {/* About Course Specs (Dynamic Validity from Admin + Learning Material Count) (Screenshot 6) */}
          <AboutCourseSpecs
            courseName={course.name || course.title}
            description={course.description}
            validity={course.validity}
            expiryMode={course.expiryMode}
            totalVideos={recordedVideos.length}
            totalTests={tests.length}
            totalNotes={notes.length}
            onViewContent={() => setMainTab('content')}
          />

          {/* Free Content (Only shown if student is NOT enrolled or course is expired) */}
          {(!isEnrolled || isCourseExpired) && freeVideos.length > 0 && (
            <FreeContentSection
              freeVideos={freeVideos}
              onPlayVideo={handleVideoClick}
              onViewSyllabus={() => setMainTab('content')}
            />
          )}

          {/* Support Card (Screenshot 7, 8) */}
          <DifficultySupportCard
            studentName={student?.name}
            courseTitle={course?.name || course?.title}
            supportPhone="919009008148"
          />

          {/* In-Page Pricing Details (Hidden for enrolled students with active access) */}
          {isPaidCourse && (!isEnrolled || isCourseExpired) && (
            <InPagePricingSection
              price={basePrice}
              mrp={mrp}
              discountAmount={discountAmount}
              gstAmount={0}
              finalAmount={finalPayableAmount}
              appliedCoupon={appliedCoupon}
              studentState={selectedState}
              onOpenCoupons={() => setIsCouponSheetOpen(true)}
              onRemoveCoupon={handleRemoveCoupon}
              onStateClick={() => setIsStateSheetOpen(true)}
            />
          )}

          {/* Recommended / Upsell */}
          {upsellData.length > 0 && (
            <div className="mt-6 px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-rounded text-primary-600 text-lg">recommend</span>
                <h3 className="font-black text-gray-900 text-xs tracking-tight">
                  Recommended for you
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upsellData.map((up, i) => (
                  <div
                    key={up.id || (up as any)._id}
                    onClick={() => navigate(`/course/${up.id || (up as any)._id}`)}
                    className="p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-gray-200"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      {up.thumbnail || up.imageUrl ? (
                        <img src={getImageUrl(up.thumbnail || up.imageUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary-600 font-extrabold text-lg">{(up.title || up.name || 'C').charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 line-clamp-1">{up.title || up.name}</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">₹{up.price || 0}</p>
                    </div>
                    <span className="material-symbols-rounded text-gray-400 text-base">chevron_right</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      ) : (
        /* CONTENT TAB (Curriculum Syllabus with Locks for Un-enrolled) */
        <main className="p-4 space-y-4 animate-fade-in pb-6">
          {/* Active Enrolled Student: Clean Modern Learning Card */}
          {isEnrolled && !isCourseExpired && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Enrolled
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {completedVideosCount} of {totalVideos} completed
                  </span>
                </div>
                <span className="text-xs font-black text-gray-900">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-primary-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(progressPercent, 2)}%` }}
                ></div>
              </div>

              {/* Bottom: Next Lesson Info & Continue Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded text-lg">play_arrow</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                      {completedVideosCount > 0 ? 'Up Next' : 'First Class'}
                    </p>
                    <p className="text-xs font-bold text-gray-800 truncate mt-0.5 max-w-[200px] sm:max-w-md">
                      {lastWatchedVideo ? lastWatchedVideo.title : 'Ready to start'}
                    </p>
                  </div>
                </div>

                {lastWatchedVideo && (
                  <button
                    onClick={() => handleVideoClick(lastWatchedVideo)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-rounded text-sm">play_circle</span>
                    <span>{completedVideosCount > 0 ? 'Resume' : 'Start'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expired Course Notice */}
          {isCourseExpired && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                  <span className="material-symbols-rounded text-xl">lock_clock</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-red-900">Course Access Expired</h4>
                  <p className="text-xs text-red-600">Your enrollment period has ended. Renew now to access your videos, notes, and tests.</p>
                </div>
              </div>
              <button
                onClick={handleBuyNow}
                className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0"
              >
                <span>Renew Course</span>
                <span className="material-symbols-rounded text-sm">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Subtabs Selector */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'videos'
                  ? 'bg-[#1e293b] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-rounded text-base">play_circle</span>
              <span>Videos ({recordedVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'notes'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-rounded text-base">description</span>
              <span>Notes ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'tests'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-rounded text-base">quiz</span>
              <span>Tests ({tests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('live')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'live'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-rounded text-base">sensors</span>
              <span>Live ({liveStreams.length})</span>
            </button>
          </div>

          {/* Subtab Contents */}
          {activeTab === 'videos' && (
            <RecordedTab 
              filteredFolders={filteredFolders}
              filteredVideos={filteredVideos}
              navigationHistory={navigationHistory}
              isEnrolled={isEnrolled}
              isExpired={isCourseExpired}
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
              isExpired={isCourseExpired}
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
              onStartTest={(testId) => { 
                if (isCourseExpired) { 
                  alert('Your access to this course has expired. Please renew to continue.'); 
                  return; 
                } 
                navigate(`/test/${testId}`, { 
                  state: { from: location.pathname + location.search } 
                }); 
              }}
              onEnroll={handleEnroll}
              onBuyNow={handleBuyNow}
            />
          )}

          {activeTab === 'live' && (
            <LiveTab 
              liveStreams={liveStreams}
              isEnrolled={isEnrolled}
              isExpired={isCourseExpired}
              isPaidCourse={isPaidCourse}
              coursePrice={course.price}
              enrolling={enrolling}
              onJoinLive={handleVideoClick}
              onEnroll={handleEnroll}
              onBuyNow={handleBuyNow}
              computeStatus={computeEffectiveStatus}
            />
          )}
        </main>
      )}

      {/* Ultra-Premium Floating Gradient Checkout Bar (Hidden for active enrolled students) */}
      {!showVideoPlayer && (!isEnrolled || isCourseExpired) && (
        <CourseCheckoutBar
          course={course}
          isPaidCourse={isPaidCourse}
          isEnrolled={isEnrolled}
          enrollmentStatus={enrollmentStatus}
          enrolling={enrolling}
          processing={processingPayment}
          payableAmount={finalPayableAmount}
          progressPercent={progressPercent}
          completedVideosCount={completedVideosCount}
          totalVideos={totalVideos}
          onBuyNow={handleBuyNow}
          onEnroll={handleEnroll}
          onStartLearning={handleStartLearning}
        />
      )}

      {/* Slide-Up Coupon Bottom Sheet (Screenshot 9) */}
      <CouponBottomSheet
        isOpen={isCouponSheetOpen}
        onClose={() => setIsCouponSheetOpen(false)}
        courseId={String(id)}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
      />

      {/* State Selection Bottom Sheet */}
      <StateSelectionBottomSheet
        isOpen={isStateSheetOpen}
        onClose={() => setIsStateSheetOpen(false)}
        selectedState={selectedState}
        onSelectState={handleSelectState}
      />

      {showVideoPlayer && selectedVideo && (
        <StudentVideoPlayer
          videoId={selectedVideo.id || selectedVideo._id || ''}
          src={toYouTubeEmbed(
            selectedVideo.recordedLink || 
            selectedVideo.recordingUrl || 
            selectedVideo.replayUrl || 
            selectedVideo.youtubeUrl || 
            selectedVideo.videoUrl || 
            selectedVideo.url || 
            selectedVideo.meetingLink || 
            selectedVideo.liveUrl || 
            selectedVideo.streamUrl || 
            ''
          )}
          title={selectedVideo.title}
          courseTitle={course?.name || course?.title}
          courseId={id}
          duration={
            selectedVideo.duration && selectedVideo.duration !== '00:00'
              ? selectedVideo.duration
              : (selectedVideo.startedAt || selectedVideo.startTime) && (selectedVideo.endedAt || selectedVideo.endTime)
                ? String(Math.floor((new Date(selectedVideo.endedAt || selectedVideo.endTime).getTime() - new Date(selectedVideo.startedAt || selectedVideo.startTime).getTime()) / 1000))
                : undefined
          }
          isLive={
            (selectedVideo.contentType === 'live_stream' || selectedVideo.type === 'live' || selectedVideo.platform === 'youtube_live') &&
            computeEffectiveStatus(selectedVideo) === 'live'
          }
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
      {/* Enrollment / Payment Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-4xl text-emerald-600">check_circle</span>
            </div>

            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              Enrollment Successful!
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-1.5 leading-relaxed">
              You are now enrolled in <span className="font-bold text-gray-800">{course?.name || course?.title}</span>.
            </p>

            <div className="mt-4 py-2 px-3 rounded-xl bg-emerald-50/70 border border-emerald-100 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <span className="material-symbols-rounded text-sm">lock_open</span>
              <span>Full Batch Content Unlocked</span>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                setMainTab('content');
              }}
              className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Start Learning Now</span>
              <span className="material-symbols-rounded text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;
