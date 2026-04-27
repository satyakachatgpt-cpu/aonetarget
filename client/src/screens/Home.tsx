import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI, blogAPI, newsAPI, categoriesAPI, bannersAPI, testsAPI, testSeriesAPI, liveVideosAPI, quickLinksAPI } from '../services/apiClient';
import StudentSidebar from '../components/StudentSidebar';
import { useAuthStore } from '../store/authStore';
import { Course, Student } from '../types';


interface NewsItem {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  showAsModal?: boolean;
  priority?: string;
  isActive?: boolean;
}

interface Banner {
  _id?: string;
  id?: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  isActive?: boolean;
  order?: number;
  courseId?: string;
  batchId?: string;
  targetId?: string;
  packageId?: string;
  actionUrl?: string;
  redirectUrl?: string;
  type?: string;
}

import { CATEGORY_ICONS, CATEGORY_GRADIENTS } from '../constants';
import { getImageUrl, getPdfUrl, isLiveUrl, getEmbedUrl } from '../lib/utils';

// ━━━ Shared Live Status Helpers (same as LiveClasses.tsx) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function computeEffectiveStatus(lc: any): 'live' | 'upcoming' | 'ended' {
  const raw = (lc.streamStatus || lc.status || lc.liveStatus || lc.eventStatus || 'upcoming').toLowerCase();
  
  const isExplicitlyEnded = ['ended', 'completed', 'inactive', 'disable', 'finished'].includes(raw);
  const isImplicitlyEnded = (lc.isLive === false && (lc.endedAt || lc.endTime)) || 
                           (lc.type === 'recorded' || lc.contentType === 'recorded' || lc.contentType === 'video');
  const hasEndedLabel = lc.statusLabel === 'EVENT ENDED' || lc.label === 'EVENT ENDED';

  if (isExplicitlyEnded || isImplicitlyEnded || hasEndedLabel) return 'ended';
  if (raw === 'live' || lc.isLive === true) return 'live';
  return 'upcoming';
}


function resolveStreamUrl(lc: any): string {
  return lc.streamId || lc.videoUrl || lc.url || lc.meetingLink || lc.link || '';
}

function useHomeLiveCountdown(scheduledTimeStr: string | undefined) {
  const getSecsLeft = () => {
    if (!scheduledTimeStr) return null;
    const t = new Date(scheduledTimeStr.replace(' ', 'T'));
    if (isNaN(t.getTime())) return null;
    return Math.floor((t.getTime() - Date.now()) / 1000);
  };
  const [secs, setSecs] = React.useState<number | null>(getSecsLeft);
  React.useEffect(() => {
    setSecs(getSecsLeft());
    const id = setInterval(() => setSecs(getSecsLeft()), 1000);
    return () => clearInterval(id);
  }, [scheduledTimeStr]);
  return secs;
}

const HomeLiveCountdownDisplay = ({ scheduledTimeStr }: { scheduledTimeStr: string }) => {
  const secs = useHomeLiveCountdown(scheduledTimeStr);
  if (secs === null || secs <= 0) return <span>Upcoming</span>;
  
  if (secs < 60) {
    return <span className="text-orange-500 animate-pulse">Starting soon</span>;
  }
  
  if (secs < 3600) {
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, '0');
    return <span>Starts in {mm}:{ss}</span>;
  }
  
  const hh = Math.floor(secs / 3600);
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span>Starts in {hh}:{mm}:{ss}</span>;
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { student, isAuthenticated, unreadNotificationsCount } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newsModal, setNewsModal] = useState<NewsItem | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [examDocs, setExamDocs] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [quickLinks, setQuickLinks] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const bannerDragInfo = useRef({ startX: 0, startTime: 0 });

  const handleBannerClick = useCallback((banner: Banner) => {
    const b = banner as any;
    // 1. Prioritize direct IDs
    const targetId = b.courseId || b.batchId || b.packageId || b.targetId;
    if (targetId) {
      navigate(`/course/${targetId}`);
      return;
    }

    // 2. Handle URL fields
    const link = b.linkUrl || b.actionUrl || b.redirectUrl || b.link || b.url;
    if (!link) return;

    if (link.startsWith('http')) {
      // Check if it's an internal course link pasted as full URL
      if (link.includes('/course/')) {
        const parts = link.split('/course/');
        const id = parts[parts.length - 1].split(/[?#]/)[0];
        if (id) {
          navigate(`/course/${id}`);
          return;
        }
      }
      window.open(link, '_blank');
    } else {
      // Internal path
      const path = link.startsWith('/') ? link : `/${link}`;
      navigate(path);
    }
  }, [navigate]);

  const onBannerTouchStart = (e: React.TouchEvent) => {
    bannerDragInfo.current = { startX: e.touches[0].clientX, startTime: Date.now() };
  };

  const onBannerTouchEnd = (e: React.TouchEvent, banner: Banner) => {
    const diffX = e.changedTouches[0].clientX - bannerDragInfo.current.startX;
    const diffTime = Date.now() - bannerDragInfo.current.startTime;

    if (Math.abs(diffX) > 50) {
      // Swipe detected
      if (diffX > 0) setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length);
      else setCurrentSlide(prev => (prev + 1) % banners.length);
    } else if (Math.abs(diffX) < 10 && diffTime < 300) {
      // Clean click detected
      handleBannerClick(banner);
    }
  };

  const featuredToDisplay = useMemo(() => {
    // 1. Get explicitly featured courses
    const featured = courses.filter((c: any) => c.settings?.isFeatured === true);
    
    // 2. If we have 4 or more featured, just show top 4
    if (featured.length >= 4) return featured.slice(0, 4);
    
    // 3. Otherwise, fill up to 4 using other latest batches
    const featuredIds = new Set(featured.map(c => c._id || c.id));
    const others = courses.filter(c => !featuredIds.has(c._id || c.id));
    
    const combined = [...featured, ...others].slice(0, 4);
    return combined;
  }, [courses]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    // Filter categories based on search query
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(cat =>
        cat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  }, [categories, searchQuery]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await coursesAPI.getAll();
        const coursesList = Array.isArray(data) ? data : [];

        // Universal Numeric Sort Fallback
        const sorted = [...coursesList].sort((a, b) => {
          const orderA = a.settings?.sortingOrder ?? 9999;
          const orderB = b.settings?.sortingOrder ?? 9999;
          return Number(orderA) - Number(orderB);
        });

        setCourses(sorted);
      } catch (error) {
        console.error('Failed to fetch from MongoDB:', error);
      }
    };

    const fetchCategories = async () => {
      try {
        const data = await categoriesAPI.getAll();
        const active = (Array.isArray(data) ? data : []).filter((c: any) => c.isActive);
        setCategories(active);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    const fetchBanners = async () => {
      try {
        const data = await bannersAPI.getAll();
        const activeBanners = (Array.isArray(data) ? data : []).filter((b: any) => b.isActive !== false && b.active !== false);
        if (activeBanners.length > 0) {
          activeBanners.sort((a: Banner, b: Banner) => (a.order || 0) - (b.order || 0));
          setBanners(activeBanners);
        } else {
          setBanners([{ imageUrl: '/attached_assets/download_1770552281686.png', title: 'Aone Target Institute' }]);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        setBanners([{ imageUrl: '/attached_assets/download_1770552281686.png', title: 'Aone Target Institute' }]);
      }
    };


    const fetchNews = async () => {
      try {
        setNewsLoading(true);
        // Try fetching from blogAPI (primary for News section)
        let newsData = await blogAPI.getAll().catch(() => []);

        // Fallback or merge with newsAPI if empty
        if (!Array.isArray(newsData) || newsData.length === 0) {
          const alternativeNews = await newsAPI.getAll().catch(() => []);
          newsData = alternativeNews;
        }

        const activeNews = (Array.isArray(newsData) ? newsData : []).map((n: any) => ({
          ...n,
          thumbnail: getImageUrl(n.thumbnail || n.imageUrl || n.image)
        })).filter((n: any) =>
          (n.status === 'published' || n.status === 'active' || n.isActive !== false) && n.status !== 'draft'
        ).sort((a: any, b: any) => {
          const getTimestamp = (item: any) => {
            if (!item) return 0;
            if (item.id && typeof item.id === 'string') {
              const numStr = item.id.replace(/\D/g, '');
              if (numStr.length >= 13) {
                const parsed = parseInt(numStr.substring(0, 13));
                if (!isNaN(parsed)) return parsed;
              }
            }
            const d = new Date(item.createdAt || item.publishDate || item.createdDate || item.date || 0).getTime();
            return isNaN(d) ? 0 : d;
          };
          return getTimestamp(b) - getTimestamp(a);
        });

        setAllNews(activeNews.slice(0, 8));

        const modalNews = activeNews.find((n: any) => n.showAsModal || n.featured);
        if (modalNews) {
          const dismissedNews = localStorage.getItem('dismissedNews');
          const dismissed = dismissedNews ? JSON.parse(dismissedNews) : [];
          const newsId = modalNews.id || modalNews._id;
          if (!dismissed.includes(newsId)) {
            setNewsModal({
              ...modalNews,
              message: modalNews.content || modalNews.excerpt || modalNews.message || '',
              id: newsId,
              thumbnail: modalNews.thumbnail
            });
            setShowNewsModal(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setNewsLoading(false);
      }
    };

    const fetchLiveClasses = async () => {
      try {
        let data = [];
        const studentId = student?.id || student?._id;
        if (isAuthenticated && studentId) {
          data = await liveVideosAPI.getByStudentId(studentId);
        } else {
          data = [];
        }
        
        // Sort by scheduled time or creation time descending (Latest first)
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
          const getT = (item: any) => {
            const date = item.scheduledAt || item.scheduledTime || item.startTime || item.createdAt || item.createdDate || 0;
            return new Date(date).getTime();
          };
          return getT(b) - getT(a);
        });
        
        setLiveClasses(sorted);
      } catch (error) {
        console.error('Failed to fetch live classes:', error);
      }
    };

    const fetchTestSeries = async () => {
      try {
        const data = await testSeriesAPI.getAll();
        setTestSeries(Array.isArray(data) ? data : []);
      } catch (error) { /* Silent fail */ }
    };

    const fetchExamDocs = async () => {
      try {
        const response = await fetch('/api/exam-documents');
        if (response.ok) {
          const data = await response.json();
          const active = (Array.isArray(data) ? data : []).filter((d: any) => d.status === 'active');
          setExamDocs(active);
        }
      } catch (error) {
        console.error('Failed to fetch exam docs:', error);
      }
    };

    const fetchQuickLinks = async () => {
      try {
        const data = await quickLinksAPI.getAll();
        setQuickLinks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch quick links:', error);
      }
    };

    const fetchAll = async () => {
      // Parallelize independent fetches to speed up initial load
      try {
        await Promise.all([
          fetchCourses(),
          fetchCategories(),
          fetchBanners(),
          fetchLiveClasses(),
          fetchTestSeries(),
          fetchExamDocs(),
          fetchQuickLinks(),
          fetchNews()
        ]);
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    };

    fetchAll();
  }, [isAuthenticated, student]);

  const dismissNewsModal = () => {
    if (newsModal) {
      const dismissedNews = localStorage.getItem('dismissedNews');
      const dismissed = dismissedNews ? JSON.parse(dismissedNews) : [];
      dismissed.push(newsModal.id);
      localStorage.setItem('dismissedNews', JSON.stringify(dismissed));
    }
    setShowNewsModal(false);
    setNewsModal(null);
  };

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
  };

  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  };

  const handleDownloadAPK = () => {
    if (isStandalone()) {
      alert('App is already installed!');
      return;
    }
    setShowDownloadModal(true);
    setInstallSuccess(false);
    setIsInstalling(false);
    setShowIOSSteps(false);
  };

  const handleInstallAndroid = async () => {
    setIsInstalling(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstallSuccess(true);
        setDeferredPrompt(null);
      }
      setIsInstalling(false);
    } else {
      try {
        const response = await fetch('/api/download/apk', { method: 'HEAD' });
        if (response.ok) {
          const link = document.createElement('a');
          link.href = '/api/download/apk';
          link.setAttribute('download', 'AoneTarget_Latest.apk');
          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          setInstallSuccess(true);
        } else {
          alert('Please use "Add to Home Screen" from your browser menu to install the app.');
        }
      } catch {
        alert('Please use "Add to Home Screen" from your browser menu to install the app.');
      }
      setIsInstalling(false);
    }
  };

  const handleInstallIOS = () => {
    setShowIOSSteps(true);
  };

  useEffect(() => {
    const handler = () => {
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleShare = (linkObj: any) => {
    if (linkObj && linkObj.url) {
      window.open(linkObj.url, '_blank');
      return;
    }
  };

  const handleHardcodedShare = (platform: string) => {
    let url = "";
    switch (platform) {
      case 'fb': url = `https://www.facebook.com/aonetargetinstitute`; break;
      case 'ig': url = `https://www.instagram.com/aonetargetinstitute`; break;
      case 'yt': url = `https://www.youtube.com/@AONETARGETINSTITUTE`; break;
      case 'wa': url = `https://api.whatsapp.com/send/?phone=919009008148`; break;
      case 'tg': url = `https://t.me/share/url?url=https://aonetarget.com&text=Check out Aone Target Institute!`; break;
    }
    window.open(url, '_blank');
  };

  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chipRef.current;
    if (!container) return;

    let animationId: number;
    let scrollPos = container.scrollLeft;
    let isInteracting = false;
    let resumeTimeout: any;

    const scroll = () => {
      if (!isInteracting && container) {
        scrollPos += 0.5; // Slow, smooth speed
        // If we've reached the end of the first set of items, reset to start seamlessly
        if (container.scrollWidth > 0 && scrollPos >= container.scrollWidth / 2) {
          scrollPos = 0;
        }
        container.scrollLeft = scrollPos;
      } else if (container) {
        // Sync positioning when user is manually scrolling
        scrollPos = container.scrollLeft;
      }
      animationId = requestAnimationFrame(scroll);
    };

    const handleInteractionStart = () => { 
      isInteracting = true; 
      clearTimeout(resumeTimeout);
    };
    
    const handleInteractionEnd = () => {
      // Delay before resuming to allow native friction/momentum to finish
      resumeTimeout = setTimeout(() => {
        isInteracting = false;
        if (container) scrollPos = container.scrollLeft;
      }, 1500);
    };

    animationId = requestAnimationFrame(scroll);

    container.addEventListener('mousedown', handleInteractionStart);
    container.addEventListener('touchstart', handleInteractionStart, { passive: true });
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(resumeTimeout);
      container.removeEventListener('mousedown', handleInteractionStart);
      container.removeEventListener('touchstart', handleInteractionStart);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, []);

  const handleJoinLiveClass = (lc: any) => {
    if (computeEffectiveStatus(lc) !== 'live') return;
    const url = resolveStreamUrl(lc);
    if (!url) { navigate('/live-classes'); return; }
    
    // Check if it's a YouTube URL (Live or Watch)
    const isYT = url.includes('youtube.com') || url.includes('youtu.be');
    
    if (isYT) {
      const videoId = lc.id || lc._id || 'live';
      navigate(`/watch/${videoId}`, {
        state: {
          video: {
            ...lc,
            title: lc.title || lc.name || 'Live Class',
            embedUrl: getEmbedUrl(url)
          }
        }
      });
    } else {
      // Fallback for Zoom, Google Meet, etc.
      window.open(url, '_blank');
    }
  };

  // Tick every 30s for client-side auto-promotion
  const [_homeTick, setHomeTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setHomeTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col bg-surface-100 min-h-screen pb-4 overflow-x-hidden">
      <div className="animate-fade-in">
        <header className="sticky top-0 z-40 shadow-lg" style={{ background: '#283593' }}>
        <div className="px-4 py-2 flex items-center justify-between gap-3 min-h-[68px]">
          {isSearching ? (
            <div className="flex-1 flex items-center gap-3 animate-slide-in-left">
              <div className="flex-1 relative">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 text-white placeholder-white/50 pl-4 pr-4 py-2 rounded-xl border border-white/20 focus:bg-white/20 focus:border-white/40 transition-all outline-none text-[13px]"
                  placeholder="Search for courses..."
                />
              </div>

              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 shrink-0 flex items-center justify-center text-white text-[11px] font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-[42px] h-[42px] rounded-[14px] bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 shrink-0 flex items-center justify-center"
              >
                <span className="material-symbols-rounded text-white text-[26px]">menu</span>
              </button>

              <div className="flex-1 flex justify-center items-center px-1">
                <div className="bg-white rounded-[20px] px-3 py-1 shadow-md flex items-center justify-center h-[50px] w-full max-w-[180px] overflow-hidden mix-blend-normal">
                  <img
                    src={getImageUrl("/attach-assist/alonelogo_1770810181717.jpg")}
                    alt="Aone Target"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsSearching(true)}
                  className="w-[42px] h-[42px] rounded-[14px] bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 flex items-center justify-center"
                >
                  <span className="material-symbols-rounded text-white text-[22px] font-medium">search</span>
                </button>
                <button
                  onClick={() => navigate('/notifications')}
                  className="w-[42px] h-[42px] rounded-[14px] bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 relative flex items-center justify-center"
                >
                  <span className="material-symbols-rounded text-white text-[22px] font-medium">notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-[10px] right-[10px] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#283593] animate-pulse"></span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="px-4 py-3 space-y-4">
        <div
          ref={chipRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 select-none touch-pan-x"
        >
          {(() => {
            const chips = [
              { label: 'All Courses', icon: 'school', color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/explore' },
              { label: 'Live Classes', icon: 'sensors', color: 'text-rose-600', bg: 'bg-rose-50', path: '/live-classes' },
              { label: 'Test', icon: 'quiz', color: 'text-amber-600', bg: 'bg-amber-50', path: '/mock-tests' },
              { label: 'Free Content', icon: 'auto_awesome', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/free-content' },
            ];
            // Duplicate chips for seamless infinite loop
            return [...chips, ...chips].map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-[18px] border border-[#283593]/30 shrink-0 active:scale-95 transition-all shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_-5px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 group"
              >
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <span className="material-symbols-rounded text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div className="pr-1 text-left">
                  <span className="text-[13px] font-medium text-gray-800 tracking-tight leading-none group-hover:text-primary transition-colors block whitespace-nowrap">{item.label}</span>
                </div>
              </button>
            ));
          })()}
        </div>

        {banners.length > 0 ? (
          <div className="relative w-full overflow-hidden rounded-3xl shadow-elevated aspect-[2/1] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex transition-transform duration-700 ease-in-out h-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {banners.map((banner, index) => (
                <div 
                  key={banner._id || banner.id || index} 
                  className="w-full flex-shrink-0 h-full bg-gradient-to-br from-primary-800 to-primary-600 flex items-center justify-center relative touch-pan-y"
                  onTouchStart={onBannerTouchStart}
                  onTouchEnd={(e) => onBannerTouchEnd(e, banner)}
                  onMouseDown={(e) => {
                    bannerDragInfo.current = { startX: e.clientX, startTime: Date.now() };
                  }}
                  onMouseUp={(e) => {
                    const diffX = Math.abs(e.clientX - bannerDragInfo.current.startX);
                    const diffTime = Date.now() - bannerDragInfo.current.startTime;
                    if (diffX < 10 && diffTime < 300) {
                      handleBannerClick(banner);
                    }
                  }}
                >
                  {banner.imageUrl ? (
                    <img
                      src={getImageUrl(banner.imageUrl)}
                      alt={banner.title || `Banner ${index + 1}`}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-primary-800 to-primary-600 flex items-center justify-center p-4 select-none">
                      <div className="text-center text-white">
                        <h3 className="text-xl font-medium">{banner.title}</h3>
                        {banner.subtitle && <p className="text-sm opacity-80 mt-1">{banner.subtitle}</p>}
                      </div>
                    </div>
                  )}
                  {(banner.linkUrl || banner.courseId || banner.batchId || banner.actionUrl) && (
                    <div className="absolute inset-0 bg-black/5 opacity-0 active:opacity-100 transition-opacity pointer-events-none"></div>
                  )}
                </div>
              ))}
            </div>
            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-white w-7 shadow-lg' : 'bg-white/50 w-2'}`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-[2/1] rounded-3xl bg-gray-50"></div>
        )}

        <section className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-primary-600 rounded-full shadow-sm"></div>
              <div>
                <h2 className="section-title">Our Courses</h2>
                <p className="section-subtitle">Explore top categories</p>
              </div>
            </div>
            <button onClick={() => navigate('/explore')} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97]">
              View All
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </button>
          </div>
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredCategories.slice(0, 6).map((cat, i) => (
                <div
                  key={cat._id || cat.id || i}
                  onClick={() => {
                    const lTitle = (cat.title || '').toLowerCase();
                    if (cat.id === 'mock-test' || lTitle.includes('mock test')) {
                      navigate('/mock-tests');
                    } else if (cat.id === 'ebooks' || lTitle.includes('ebook') || lTitle.includes('notes')) {
                      navigate('/ebook-notes');
                    } else {
                      navigate(`/explore/${cat.id}`);
                    }
                  }}
                  className={`relative p-3.5 rounded-3xl h-40 flex flex-col justify-between text-white bg-gradient-to-br ${cat.gradient || CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]} overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 shadow-elevated hover:shadow-card-hover hover:-translate-y-0.5 group`}
                >
                  {cat.imageUrl && (
                    <img src={getImageUrl(cat.imageUrl)} alt={cat.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {cat.imageUrl && <div className="absolute inset-0 bg-black/40"></div>}
                  <div className="relative z-10 flex justify-between items-start">
                    <span className="glass bg-white/20 text-[8px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {cat.tag || 'COURSE'}
                    </span>
                    <div className="w-10 h-10 glass bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
                      <span className="material-symbols-rounded text-white text-xl">{cat.icon || CATEGORY_ICONS[cat.title] || 'auto_stories'}</span>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-medium text-lg leading-tight">{cat.title}</h3>
                    <span className="text-[10px] opacity-80 font-medium">{cat.subtitle}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 h-9 w-9 glass bg-white/25 rounded-full flex items-center justify-center border border-white/30 z-10 group-hover:bg-white/40 group-hover:scale-110 transition-all duration-200">
                    <span className="material-symbols-rounded text-white text-lg">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
              <span className="material-symbols-rounded text-6xl text-gray-300">search_off</span>
              <p className="text-sm text-gray-400 mt-4">No results found</p>
              <p className="text-[10px] text-gray-300 mt-1">Try searching with different keywords</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 opacity-0">
              {[0, 1].map(i => <div key={i} className="h-36" />)}
            </div>
          )}
        </section>


        {liveClasses.length > 0 && (() => {
          const ongoing = liveClasses.filter(lc => computeEffectiveStatus(lc) === 'live');
          const upcoming = liveClasses.filter(lc => computeEffectiveStatus(lc) === 'upcoming');
          
          if (ongoing.length === 0 && upcoming.length === 0) return null;

          return (
            <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {/* ONGOINING LIVE SESSIONS */}
              {ongoing.length > 0 && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-8 bg-red-600 rounded-full shadow-[0_0_12px_rgba(220,38,38,0.4)] animate-pulse"></div>
                      <div>
                        <h2 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Ongoing Live Session</h2>
                        <p className="text-[11px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                          Live Now
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/live-classes')}
                      className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97] bg-red-600 border-red-500 shadow-lg shadow-red-600/20"
                    >
                      View All
                      <span className="material-symbols-rounded text-sm">arrow_forward</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {ongoing.slice(0, 4).map((lc: any, i: number) => {
                      return (
                        <div key={lc._id || lc.id || i} className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-red-100/50 to-transparent shadow-xl transition-all duration-500 hover:shadow-red-500/10 hover:-translate-y-1">
                           <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl"></div>
                           <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-700"></div>
                           
                           <div className="relative z-10 p-3 flex gap-3 items-center">
                            <div className="w-12 h-12 bg-gradient-to-tr from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/25 relative overflow-hidden group-hover:scale-110 transition-transform">
                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                              <span className="material-symbols-rounded text-white text-2xl relative z-10">sensors</span>
                              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base text-gray-800 truncate tracking-tight">{lc.title || lc.name || 'Live Class'}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1.5 bg-rose-500/10 backdrop-blur-md text-rose-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-rose-200/50 shadow-sm">
                                   <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                                   LIVE
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleJoinLiveClass(lc); }}
                              className="relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 text-white text-[13px] px-4 py-2 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20 active:scale-95 group/btn"
                            >
                              <div className="absolute inset-0 bg-black opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                              <span className="material-symbols-rounded text-[18px]">videocam</span>
                              JOIN
                            </button>
                          </div>
                          
                          {(lc.pdf1 || lc.pdf2 || lc.studyMaterial) && (
                            <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2 relative z-10">
                              {lc.pdf1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank'); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-red-600 text-[10px] font-bold border border-red-100 hover:bg-white transition-all shadow-sm"
                                >
                                  <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                                  PDF 1
                                </button>
                              )}
                              {lc.pdf2 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.pdf2))}&title=${encodeURIComponent('PDF 2')}`, '_blank'); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-red-600 text-[10px] font-bold border border-red-100 hover:bg-white transition-all shadow-sm"
                                >
                                  <span className="material-symbols-rounded text-sm">picture_as_pdf</span>
                                  PDF 2
                                </button>
                              )}
                              {lc.studyMaterial && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank'); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 text-blue-600 text-[10px] font-bold border border-blue-100 hover:bg-white transition-all shadow-sm"
                                >
                                  <span className="material-symbols-rounded text-sm">auto_stories</span>
                                  Material
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* UPCOMING SESSIONS */}
              {upcoming.length > 0 && (
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-7 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full shadow-sm"></div>
                      <div>
                        <h2 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Scheduled Sessions</h2>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Upcoming Classes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/live-classes')}
                      className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97] bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/20"
                    >
                      View All
                      <span className="material-symbols-rounded text-sm">arrow_forward</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {upcoming.slice(0, 4).map((lc: any, i: number) => {
                      const rawScheduled = lc.scheduledAt || lc.scheduledTime || lc.startTime || '';
                      const scheduledISO = rawScheduled ? rawScheduled.replace(' ', 'T') : '';

                      return (
                        <div key={lc._id || lc.id || i} className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-indigo-100/50 to-transparent shadow-sm transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1">
                           <div className="absolute inset-0 bg-white/70 backdrop-blur-xl rounded-2xl"></div>
                           
                           <div className="relative z-10 p-3 flex gap-3 items-center">
                            <div className="w-12 h-12 bg-indigo-50/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                              <span className="material-symbols-rounded text-indigo-500 text-2xl">calendar_today</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-base text-gray-800 truncate tracking-tight group-hover:text-indigo-600 transition-colors">{lc.title || lc.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 bg-indigo-500/10 backdrop-blur-md text-indigo-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-200/50 shadow-sm">
                                  <span className="material-symbols-rounded text-[14px]">schedule</span>
                                  <HomeLiveCountdownDisplay scheduledTimeStr={scheduledISO} />
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0">
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Upcoming</span>
                            </div>
                          </div>

                          {(lc.pdf1 || lc.pdf2 || lc.studyMaterial) && (
                            <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2 relative z-10">
                              {lc.pdf1 && (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const status = computeEffectiveStatus(lc);
                                    if (status !== 'live') {
                                      alert("PDF will be available once the class starts.");
                                      return;
                                    }
                                    window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank'); 
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-black border border-red-100 transition-all uppercase tracking-widest shadow-sm opacity-50 cursor-not-allowed"
                                >
                                  <span className="material-symbols-rounded text-[16px]">picture_as_pdf</span>
                                  PDF 1
                                </button>
                              )}
                              {lc.pdf2 && (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const status = computeEffectiveStatus(lc);
                                    if (status !== 'live') {
                                      alert("PDF will be available once the class starts.");
                                      return;
                                    }
                                    window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.pdf2))}&title=${encodeURIComponent('PDF 2')}`, '_blank'); 
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-black border border-red-100 transition-all uppercase tracking-widest shadow-sm opacity-50 cursor-not-allowed"
                                >
                                  <span className="material-symbols-rounded text-[16px]">picture_as_pdf</span>
                                  PDF 2
                                </button>
                              )}
                              {lc.studyMaterial && (
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const status = computeEffectiveStatus(lc);
                                    if (status !== 'live') {
                                      alert("Material will be available once the class starts.");
                                      return;
                                    }
                                    window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(lc.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank'); 
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100 transition-all uppercase tracking-widest shadow-sm opacity-50 cursor-not-allowed"
                                >
                                  <span className="material-symbols-rounded text-[16px]">auto_stories</span>
                                  Material
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          );
        })()}

        {courses.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-primary-600 rounded-full shadow-sm"></div>
                <div>
                  <h2 className="section-title">Featured Batches</h2>
                  <p className="section-subtitle">Enroll in top batches</p>
                </div>
              </div>
              <button onClick={() => navigate('/batches')} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97]">
                View All
                <span className="material-symbols-rounded text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredToDisplay.map((course: any, i: number) => {
                const bgGrad = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length] || 'from-primary to-primary-600';
                const hasImage = !!(course.imageUrl || course.thumbnail);

                return (
                  <div
                    key={course._id || course.id || i}
                    onClick={() => navigate(`/course/${course._id || course.id}`)}
                    className="w-full aspect-[1.7/1] rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 relative group flex"
                  >
                    {hasImage ? (
                      <div className="w-full h-full relative">
                        {course.settings?.markNewBatch && (
                          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.1em] rounded-full shadow-lg border border-white/20 animate-pulse">
                            NEW BATCH
                          </div>
                        )}
                        <img
                          src={getImageUrl(course.imageUrl || course.thumbnail)}
                          alt={course.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Name Overlay Gradient */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 rounded-b-xl">
                          <p className="text-white font-bold text-sm leading-tight">
                            {course.name || course.title || course.courseName}
                          </p>
                        </div>

                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                          <button className="bg-white text-black text-[9px] font-black px-4 py-2 rounded-xl shadow-lg border border-white/20 uppercase tracking-widest active:scale-95 transition-all">
                            JOIN NOW
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${bgGrad} flex p-3.5 relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
                        {course.settings?.markNewBatch && (
                          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.1em] rounded-full shadow-lg border border-white/20 animate-pulse">
                            NEW BATCH
                          </div>
                        )}
                        {/* Decorative circles to emulate a neat banner background */}
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>

                        <div className="flex-1 pr-1 flex flex-col justify-between z-10">
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-white/20 rounded-[6px] text-[10px] text-white font-bold uppercase tracking-wider mb-1.5 backdrop-blur-sm shadow-sm border border-white/10">
                              {course.category || 'TEST SERIES'}
                            </span>
                            <h4 className="font-bold text-[14px] text-white leading-tight line-clamp-2 shadow-sm">{course.title || course.name}</h4>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            {(() => {
                              const isEnrolled = isAuthenticated && student?.enrolledCourses?.some(ec => 
                                String(ec) === String(course.id) || String(ec) === String(course._id)
                              );
                              
                              if (isEnrolled) {
                                return (
                                  <div className="flex items-center gap-1.5 py-1">
                                    <span className="material-symbols-rounded text-yellow-400 text-[14px]">verified</span>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Enrolled</span>
                                  </div>
                                );
                              }

                              return (course.price !== undefined && course.price !== null) && (
                                <div className="flex flex-col pb-0.5">
                                  <span className="text-[15px] font-black text-yellow-400 drop-shadow-md leading-none">
                                    {course.price === 0 ? 'Free' : `₹${course.price}`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="w-[30%] relative z-10 flex flex-col items-end justify-between">
                          <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                            <span className="material-symbols-rounded text-white text-[14px]">school</span>
                          </div>
                          {(() => {
                             const isEnrolled = isAuthenticated && student?.enrolledCourses?.some(ec => 
                               String(ec) === String(course.id) || String(ec) === String(course._id)
                             );
                             return (
                               <button 
                                 className="bg-white text-black text-[11px] font-black px-4 py-2 rounded-xl hover:bg-white transition-all whitespace-nowrap shadow-lg uppercase tracking-widest active:scale-95 border border-white/20"
                               >
                                 {isEnrolled ? 'Open' : 'Join'}
                               </button>
                             );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {testSeries.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-primary-600 rounded-full shadow-sm"></div>
                <div>
                  <h2 className="section-title">Popular Test Series</h2>
                  <p className="section-subtitle">Practice & improve your score</p>
                </div>
              </div>
              <button onClick={() => navigate('/mock-tests')} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97]">
                View All
                <span className="material-symbols-rounded text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {testSeries.slice(0, 4).map((ts: any, i: number) => (
                <div
                  key={ts._id || ts.id || i}
                  onClick={() => navigate('/mock-tests', { state: { seriesId: ts._id || ts.id } })}
                  className="card-premium p-3 rounded-2xl border border-gray-100/50 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mb-3 group-hover:from-primary-200 group-hover:to-primary-300 transition-all duration-200">
                    <span className="material-symbols-rounded text-primary text-xl">quiz</span>
                  </div>
                  <h4 className="font-medium text-sm text-gray-800 leading-tight line-clamp-2">{ts.title || ts.name || 'Test Series'}</h4>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="material-symbols-rounded text-[12px] text-gray-400">subject</span>
                    <span className="text-[11px] text-gray-400">{ts.subject || ts.category || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100/80">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-rounded text-[12px]">description</span>
                      {ts.totalTests || ts.tests?.length || 0} Tests
                    </span>
                    {(ts.price !== undefined && ts.price !== null) && (
                      <span className="text-xs font-medium text-primary bg-primary-50 px-2.5 py-0.5 rounded-full">
                        {ts.price === 0 ? 'Free' : `₹${ts.price}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {examDocs.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '0.28s' }}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-7 bg-gradient-to-b from-teal-500 to-teal-700 rounded-full shadow-sm"></div>
                <div>
                  <h2 className="section-title text-sm">Exam Documents</h2>
                  <p className="section-subtitle">Important PDFs & Materials</p>
                </div>
              </div>
              <button onClick={() => navigate('/ebook-notes')} className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1 hover:gap-2 transition-all duration-200 active:scale-[0.97] bg-teal-600 border-teal-500">
                View All
                <span className="material-symbols-rounded text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {examDocs.slice(0, 5).map((doc: any, i: number) => (
                <div
                  key={doc._id || doc.id || i}
                  onClick={() => doc.fileUrl && window.open(getPdfUrl(doc.fileUrl), '_blank')}
                  className="w-36 flex-shrink-0 card-premium p-2.5 rounded-2xl border border-gray-100/50 cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center mb-2.5">
                    <span className="material-symbols-rounded text-teal-600 text-lg">description</span>
                  </div>
                  <h4 className="font-medium text-[11px] text-navy line-clamp-2 h-7">{doc.title}</h4>
                  <p className="text-[8px] text-gray-400 mt-1.5 uppercase font-semibold tracking-wider">{doc.exam || 'General'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(() => {
          // Fallback static data that matches the exact screenshot for visualization
          const displayNews = allNews.length > 0 ? allNews : [
            {
              id: 'd1',
              title: 'मुख्य चुनाव आयुक्त ज्ञानेश कुमार पर महाभियोग',
              thumbnail: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
            },
            {
              id: 'd2',
              title: 'भारत के विदेशी मुद्रा भंडार में भारी गिरावट',
              thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Reserve_Bank_of_India_logo.svg/1024px-Reserve_Bank_of_India_logo.svg.png',
            },
            {
              id: 'd3',
              title: '(AIFF) के पूर्व महासचिव कुशल दास का निधन',
              thumbnail: 'https://images.unsplash.com/photo-1542314831-c6a4d14eff4c?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80',
            }
          ];

          if (newsLoading) return <div className="animate-pulse h-32 bg-gray-100 rounded-2xl mx-4 mb-4"></div>;

          return (
            <section className="animate-fade-in-up" style={{ animationDelay: '0.32s' }}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-primary-600 rounded-full shadow-sm"></div>
                  <div>
                    <h2 className="section-title">Latest News</h2>
                    <p className="section-subtitle">Stay informed with institute news</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {displayNews.slice(0, 4).map((news: any, i: number) => (
                  <div
                    key={news.id || i}
                    onClick={() => {
                      const id = news.id || news._id || i;
                      window.open(`/#/news/${id}`, '_blank');
                    }}
                    className="bg-white rounded-[16px] p-3 border border-gray-100 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="flex-1 min-w-0">
                      {news.featured && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="bg-amber-100/80 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-amber-200/50 shadow-sm transition-all group-hover:scale-105 origin-left">
                            <span className="material-icons text-[10px] text-amber-500">star</span>
                            Featured
                          </span>
                        </div>
                      )}
                      <h4 className="font-semibold text-[14px] text-gray-800 leading-snug line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">{news.title || news.message}</h4>
                      <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
                        <span>Read Article</span>
                        <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                      </div>
                    </div>
                    <div className="w-[100px] h-[70px] rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-50 bg-white flex items-center justify-center">
                      {news.thumbnail ? (
                        <img
                          src={news.thumbnail}
                          alt="News"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="material-symbols-rounded text-gray-400 text-2xl">newspaper</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {displayNews.length > 4 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => navigate('/news')}
                    className="btn-primary text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 active:scale-[0.97] transition-all duration-200"
                  >
                    Read More News
                    <span className="material-symbols-rounded text-[16px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </section>
          );
        })()}
      </main>

      <div className="px-4 mb-8 space-y-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-6 border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col items-center gap-6 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#3DDC84]/5 rounded-full blur-[80px]"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px]"></div>

          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <span className="text-[10px] font-black text-gray-800 uppercase tracking-[0.3em] opacity-40">Join Our Community</span>
            <div className="flex gap-1">
              <div className="h-0.5 w-6 bg-black rounded-full"></div>
              <div className="h-0.5 w-2 bg-black/10 rounded-full"></div>
            </div>
          </div>

          <div className="flex flex-nowrap justify-center items-center gap-3 w-full relative z-10 overflow-x-auto no-scrollbar pb-1">
            {quickLinks.length > 0 ? (
              quickLinks
                .filter(link => (link as any).type !== 'yt' && (link as any).status !== 'inactive')
                .sort((a, b) => b.sortBy - a.sortBy)
                .map((link, i) => (
                  <button
                    key={link.id || i}
                    onClick={() => handleShare(link)}
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_8px_20px_-5px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_25px_-5px_rgba(0,0,0,0.2)] active:scale-90 transition-all duration-500 hover:-translate-y-1 relative group bg-white border border-gray-50 overflow-hidden shrink-0"
                  >
                    {/* Soft Hover Overlay */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                      style={{ background: link.bgColor || 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}
                    ></div>

                    {link.imageUrl ? (
                      <img
                        src={link.imageUrl}
                        alt={link.title}
                        className="w-7 h-7 object-contain relative z-10 group-hover:scale-110 transition-all duration-500"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <span className="material-symbols-rounded text-gray-400 group-hover:text-black text-xl relative z-10 transition-colors">link</span>
                    )}
                  </button>
                ))
            ) : (
              // Enhanced Premium Fallback in a single clean row
              [
                { platform: 'fb', bg: '#1877F2', img: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png' },
                { platform: 'ig', bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', img: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png' },
                { platform: 'wa', bg: '#25D366', img: 'https://cdn-icons-png.flaticon.com/512/3670/3670051.png' },
                { platform: 'yt', bg: '#FF0000', img: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' },
                { platform: 'tg', bg: '#24A1DE', img: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png' },
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleHardcodedShare(s.platform)}
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center bg-white shadow-[0_8px_15px_rgba(0,0,0,0.05)] border border-gray-50 active:scale-90 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_12px_22px_rgba(0,0,0,0.1)] relative group shrink-0"
                >
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: s.bg }}></div>
                  <img
                    src={s.img}
                    className="w-[26px] h-[26px] object-contain relative z-10 group-hover:scale-110 transition-all duration-500"
                    alt={s.platform}
                  />
                </button>
              ))
            )}
          </div>
        </div>

        <button
          onClick={handleDownloadAPK}
          className="w-full bg-[#F3F6F3] rounded-[32px] p-6 flex items-center justify-between active:scale-[0.98] transition-all duration-300 border border-white group overflow-hidden relative shadow-sm"
        >
          {/* Material You blur effects */}
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-[#3DDC84]/15 rounded-full blur-2xl group-hover:bg-[#3DDC84]/25 transition-all duration-500"></div>
          <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-[#1A237E]/5 rounded-full blur-2xl"></div>

          <div className="flex items-center gap-5 relative z-10">
            {/* Premium Icon Container */}
            <div className="w-16 h-16 bg-white/80 backdrop-blur-md rounded-[24px] flex items-center justify-center shrink-0 shadow-sm border border-white/50 group-hover:scale-105 transition-transform duration-500">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#3DDC84">
                <path d="M17.523 15.3414C17.0232 15.3414 16.6179 14.9362 16.6179 14.4363C16.6179 13.9365 17.0232 13.5312 17.523 13.5312C18.0229 13.5312 18.4281 13.9365 18.4281 14.4363C18.4281 14.9362 18.0229 15.3414 17.523 15.3414ZM6.47702 15.3414C5.9772 15.3414 5.57195 14.9362 5.57195 14.4363C5.57195 13.9365 5.9772 13.5312 6.47702 13.5312C6.97684 13.5312 7.38209 13.9365 7.38209 14.4363C7.38209 14.9362 6.97684 15.3414 6.47702 15.3414ZM17.9616 10.0571L19.7289 7.00041C19.8217 6.83979 19.7663 6.6353 19.6057 6.54252C19.445 6.44975 19.2405 6.50518 19.1478 6.6658L17.3468 9.77884C15.8239 9.08889 14.0734 8.71875 12.2039 8.71875C10.3344 8.71875 8.58394 9.08889 7.06105 9.77884L5.26006 6.6658C5.16728 6.50518 4.96279 6.44975 4.80217 6.54252C4.64155 6.6353 4.58612 6.83979 4.6789 7.00041L6.44621 10.0571C3.12004 11.8385 0.887207 15.1438 0.887207 19.0062H23.5206C23.5206 15.1438 21.2878 11.8385 17.9616 10.0571Z" />
              </svg>
            </div>

            <div className="text-left">
              <h4 className="text-[19px] font-semibold text-gray-900 tracking-tight leading-none mb-1.5 flex items-center gap-2">
                Get Android App
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3DDC84] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3DDC84]"></span>
                </span>
              </h4>
              <p className="text-[12px] text-gray-500 font-medium">Compatible with Android 8.0+</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <span className="bg-white/80 backdrop-blur-sm py-1.5 px-3 rounded-full text-[10px] font-bold text-[#2E7D32] border border-[#3DDC84]/20 shadow-sm uppercase tracking-wider hidden sm:block">
              Free
            </span>
            <div className="w-14 h-14 bg-gray-900 text-white rounded-[20px] flex items-center justify-center shadow-lg group-hover:bg-[#3DDC84] group-hover:shadow-[#3DDC84]/30 transition-all duration-500 group-hover:translate-x-1">
              <span className="material-symbols-rounded text-[28px]">download_for_offline</span>
            </div>
          </div>
        </button>
      </div>
    </div>

      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        student={student}
      />

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowDownloadModal(false)}>
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] p-6 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-rounded text-3xl">download</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Download App</h3>
                  <p className="text-white/70 text-sm mt-0.5">Install Aone Target on your device</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {installSuccess ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-rounded text-4xl text-green-600">check_circle</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 mb-2">Installation Started!</h4>
                  <p className="text-sm text-gray-500">The app is being installed on your device.</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleInstallAndroid}
                    disabled={isInstalling}
                    className="w-full bg-[#F3F6F3] hover:bg-[#E8F5E9] rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 border border-[#3DDC84]/20 active:scale-[0.98] group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3DDC84]/10 rounded-full blur-xl group-hover:bg-[#3DDC84]/20 transition-all"></div>
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                      <svg className="w-9 h-9" viewBox="0 0 24 24" fill="#3DDC84">
                        <path d="M17.523 15.3414C17.0232 15.3414 16.6179 14.9362 16.6179 14.4363C16.6179 13.9365 17.0232 13.5312 17.523 13.5312C18.0229 13.5312 18.4281 13.9365 18.4281 14.4363C18.4281 14.9362 18.0229 15.3414 17.523 15.3414ZM6.47702 15.3414C5.9772 15.3414 5.57195 14.9362 5.57195 14.4363C5.57195 13.9365 5.9772 13.5312 6.47702 13.5312C6.97684 13.5312 7.38209 13.9365 7.38209 14.4363C7.38209 14.9362 6.97684 15.3414 6.47702 15.3414ZM17.9616 10.0571L19.7289 7.00041C19.8217 6.83979 19.7663 6.6353 19.6057 6.54252C19.445 6.44975 19.2405 6.50518 19.1478 6.6658L17.3468 9.77884C15.8239 9.08889 14.0734 8.71875 12.2039 8.71875C10.3344 8.71875 8.58394 9.08889 7.06105 9.77884L5.26006 6.6658C5.16728 6.50518 4.96279 6.44975 4.80217 6.54252C4.64155 6.6353 4.58612 6.83979 4.6789 7.00041L6.44621 10.0571C3.12004 11.8385 0.887207 15.1438 0.887207 19.0062H23.5206C23.5206 15.1438 21.2878 11.8385 17.9616 10.0571Z" />
                      </svg>
                    </div>
                    <div className="text-left flex-1 relative z-10">
                      <h4 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                        {isInstalling ? 'Installing...' : 'Get Android App'}
                        <span className="bg-[#E8F5E9] py-0.5 px-2 rounded-full text-[10px] font-bold text-[#2E7D32] uppercase">Free</span>
                      </h4>
                      <p className="text-[12px] text-gray-500 mt-0.5">Compatible with Android 8.0+</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-md group-hover:bg-[#3DDC84] transition-all duration-300 relative z-10 shrink-0">
                      {isInstalling ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="material-symbols-rounded text-xl">download</span>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={handleInstallIOS}
                    className="w-full bg-[#F5F5F7] hover:bg-[#EFEFEF] rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 border border-gray-200 active:scale-[0.98] group relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-gray-300/20 rounded-full blur-xl group-hover:bg-gray-400/20 transition-all"></div>
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#000000">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.82 11.78 5.72 12.58 5.72C13.39 5.72 14.88 4.62 16.42 4.79C17.08 4.82 18.87 5.06 20.04 6.7C19.93 6.77 17.72 8.04 17.75 10.72C17.77 13.93 20.58 14.97 20.62 14.99C20.59 15.07 20.17 16.54 19.17 18.05L18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.58 4.35 14.89 5.18C14.22 6 13.07 6.69 11.95 6.61C11.8 5.46 12.39 4.26 13 3.5Z" />
                      </svg>
                    </div>
                    <div className="text-left flex-1 relative z-10">
                      <h4 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                        Get iPhone App
                        <span className="bg-gray-200 py-0.5 px-2 rounded-full text-[10px] font-bold text-gray-600 uppercase">Free</span>
                      </h4>
                      <p className="text-[12px] text-gray-500 mt-0.5">Compatible with iOS 13.0+</p>
                    </div>
                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-md group-hover:bg-gray-800 transition-all duration-300 relative z-10 shrink-0">
                      <span className="material-symbols-rounded text-xl">download</span>
                    </div>
                  </button>

                  {showIOSSteps && (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                      <h5 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <span className="material-symbols-rounded text-lg">info</span>
                        iPhone Installation Steps
                      </h5>
                      <ol className="text-xs text-blue-800 space-y-1.5 ml-1">
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600 shrink-0">1.</span>
                          <span>Open this website in <strong>Safari</strong> browser</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600 shrink-0">2.</span>
                          <span>Tap the <span className="inline-flex items-center"><span className="material-symbols-rounded text-sm align-middle">ios_share</span></span> <strong>Share</strong> button at the bottom of Safari</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600 shrink-0">3.</span>
                          <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold text-blue-600 shrink-0">4.</span>
                          <span>Tap <strong>"Add"</strong> in the top right corner</span>
                        </li>
                      </ol>
                      <p className="text-xs text-blue-600 mt-3 font-medium">The app will appear on your home screen like a native app!</p>
                    </div>
                  )}

                  {!showIOSSteps && !deferredPrompt && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                      <h5 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <span className="material-symbols-rounded text-lg">lightbulb</span>
                        Quick Install Tip
                      </h5>
                      <p className="text-xs text-amber-800">
                        Open this website in <strong>Chrome</strong> or <strong>Safari</strong>, then tap the menu (⋮) and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => { setShowDownloadModal(false); setIsInstalling(false); setInstallSuccess(false); setShowIOSSteps(false); }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-lg">close</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {
        showNewsModal && newsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-fade-in pb-24">
            <div className="bg-white rounded-[32px] w-[95%] max-w-[360px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform animate-scale-in flex flex-col max-h-[70vh] border border-white/20">
              {newsModal.imageUrl && (
                <div className="relative shrink-0">
                  <img
                    src={newsModal.imageUrl}
                    alt={newsModal.title}
                    className="w-full h-36 object-cover"
                  />
                  {newsModal.priority === 'high' && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/20 uppercase tracking-tighter">
                      <span className="material-symbols-rounded text-sm">priority_high</span>
                      URGENT
                    </div>
                  )}
                </div>
              )}
              <div className="p-5 flex flex-col overflow-hidden">
                {!newsModal.imageUrl && newsModal.priority === 'high' && (
                  <div className="inline-block bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full mb-3 uppercase tracking-widest border border-red-100 w-fit shrink-0">
                    <span className="material-symbols-rounded text-sm align-middle mr-1">priority_high</span>
                    Urgent Notice
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-4 shrink-0">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#283593] to-[#1A237E] rounded-[18px] flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                    <span className="material-symbols-rounded text-xl">campaign</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-gray-900 leading-tight tracking-tight">{newsModal.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Aone Target Institute</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[100px]">
                  <div 
                    className="text-[13px] text-gray-600 leading-relaxed news-content-html"
                    dangerouslySetInnerHTML={{ __html: newsModal.message }}
                  />
                </div>

                <div className="pt-5 shrink-0">
                  <button
                    onClick={dismissNewsModal}
                    className="w-full bg-[#283593] text-white py-3.5 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-200 shadow-xl shadow-indigo-900/20 uppercase tracking-widest"
                  >
                    <span className="material-symbols-rounded text-[18px]">check_circle</span>
                    Got it, Thanks!
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default Home;
