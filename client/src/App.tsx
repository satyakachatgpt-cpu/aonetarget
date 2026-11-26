import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Capacitor } from '@capacitor/core';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import BackButtonHandler from './components/BackButtonHandler';
import { useAuthStore } from './store/authStore';
import { clearAdminSession } from './services/apiClient';
import FreeContent from './screens/FreeContent';
import FreeVideosList from './screens/FreeVideosList';
import StudyDashboard from './screens/StudyDashboard';

// Resilient Lazy Loader: Automatically retries on dynamic import failures (e.g. after Vite restarts/HMR invalidations)
const lazyRetry = (importFn: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.warn('[Vite] Dynamic import failed, attempting recovery...', error);
      try {
        return await importFn();
      } catch (retryError) {
        const reloadKey = 'vite_chunk_reload_lock';
        const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
        if (Date.now() - lastReload > 8000) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
        }
        throw retryError;
      }
    }
  });

const Home = lazyRetry(() => import('./screens/Home'));
const CourseDetails = lazyRetry(() => import('./screens/CourseDetails'));
const Checkout = lazyRetry(() => import('./screens/Checkout'));
const Success = lazyRetry(() => import('./screens/Success'));
const VideoPlayer = lazyRetry(() => import('./screens/VideoPlayer'));
const AdminDashboard = lazyRetry(() => import('./screens/AdminDashboard'));
const AdminLogin = lazyRetry(() => import('./screens/AdminLogin'));
const StudentLogin = lazyRetry(() => import('./screens/StudentLogin'));
const StudentProfile = lazyRetry(() => import('./screens/StudentProfile'));
const StudentDashboard = lazyRetry(() => import('./screens/StudentDashboard'));
const CoursesScreen = lazyRetry(() => import('./screens/CoursesScreen'));
const ExploreCourses = lazyRetry(() => import('./screens/ExploreCourses'));
const CategoryPage = lazyRetry(() => import('./screens/CategoryPage'));
const SubCategoryDetail = lazyRetry(() => import('./screens/SubCategoryDetail'));
const ChatsScreen = lazyRetry(() => import('./screens/ChatsScreen'));
const MyCourses = lazyRetry(() => import('./screens/MyCourses'));
const LiveClasses = lazyRetry(() => import('./screens/LiveClasses'));
const MockTests = lazyRetry(() => import('./screens/MockTests'));
const TestTaking = lazyRetry(() => import('./screens/TestTaking'));
const EbookNotes = lazyRetry(() => import('./screens/EbookNotes'));

const Notifications = lazyRetry(() => import('./screens/Notifications'));
const WatchHistory = lazyRetry(() => import('./screens/WatchHistory'));
const HelpSupport = lazyRetry(() => import('./screens/HelpSupport'));
const Settings = lazyRetry(() => import('./screens/Settings'));
const ReferEarn = lazyRetry(() => import('./screens/ReferEarn'));
const PurchaseSuccess = lazyRetry(() => import('./screens/PurchaseSuccess'));
const ContentTypeDetail = lazyRetry(() => import('./screens/ContentTypeDetail'));
const NewsArticle = lazyRetry(() => import('./screens/NewsArticle'));
const AllNews = lazyRetry(() => import('./screens/AllNews'));
const Batches = lazyRetry(() => import('./screens/Batches'));
const TermsOfService = lazyRetry(() => import('./screens/TermsOfService'));
const PrivacyPolicy = lazyRetry(() => import('./screens/PrivacyPolicy'));
const RefundPolicy = lazyRetry(() => import('./screens/RefundPolicy'));
const PDFViewerScreen = lazyRetry(() => import('./screens/PDFViewerScreen'));
const WatchPage = lazyRetry(() => import('./screens/WatchPage'));
const MyTests = lazyRetry(() => import('./screens/MyTests'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-[100dvh] w-full bg-[#283593] animate-in fade-in duration-300 overflow-hidden">
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute w-full h-full border-4 border-white/20 rounded-full"></div>
        <div className="absolute w-full h-full border-4 border-white rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-white/80 font-medium text-sm animate-pulse">Loading...</p>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-6 w-full animate-in fade-in">
    <div className="w-8 h-8 border-[3px] border-[#283593] border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const MainLayout: React.FC<{ isLoggedIn: boolean; children: React.ReactNode }> = ({ isLoggedIn, children }) => {
  const location = useLocation();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const currentPath = location.pathname;
  const hideOnPaths = ['/course/', '/news/', '/test/', '/checkout/', '/video-player', '/test-series/', '/live-session/'];
  const shouldHide = hideOnPaths.some(path => currentPath.startsWith(path));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-white shadow-xl relative overflow-hidden flex flex-col w-full">
      {/* PWA Status Bar Background (Only visible in standalone mode) */}
      <div className="pwa-status-bar bg-[#283593] shrink-0" />
      <div id="sidebar-root" />
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar relative smooth-scroll">
        <div 
          className="font-outfit"
          style={{ paddingBottom: shouldHide ? '0px' : 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </div>
      </div>
      <BottomNav isLoggedIn={isLoggedIn} />
    </div>
  );
};

const ProtectedRedirect = () => {
  const location = useLocation();
  const path = location.pathname + location.search;
  sessionStorage.setItem('postLoginRedirect', path);
  return <Navigate to="/student-login" state={{ from: path }} />;
};

// Use Vite's define plugin to inject the build timestamp automatically
declare const __APP_VERSION__: string;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev-version';

const isAdminRoute = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';
  const href = window.location.href || '';
  return (
    hash.startsWith('#/admin') || 
    hash.includes('admin') || 
    pathname.startsWith('/admin') || 
    pathname.includes('admin') ||
    href.includes('admin')
  );
};

// Instant URL Normalization for admin routes when visited without hash
if (typeof window !== 'undefined' && !window.location.hash && (window.location.pathname.startsWith('/admin') || window.location.pathname === '/admin' || window.location.pathname === '/admin-login')) {
  window.location.replace(`/#${window.location.pathname}${window.location.search}`);
}

// Student Auth Modal wrapper that uses useLocation inside Router
const StudentAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isStudentLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  setIsStudentLoggedIn: (student: any, token: string, devId: string, refresh: string) => void;
}> = ({ isOpen, onClose, isStudentLoggedIn, isAdminLoggedIn, setIsStudentLoggedIn }) => {
  const location = useLocation();

  const isAdmin = 
    isAdminLoggedIn || 
    (typeof window !== 'undefined' && localStorage.getItem('isAdminAuthenticated') === 'true') ||
    isAdminRoute() ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/admin-login');

  const isExcluded = 
    isAdmin ||
    isStudentLoggedIn ||
    location.pathname.startsWith('/student-login');

  if (!isOpen || isExcluded) {
    return null;
  }

  return (
    <div 
      data-auth-popup="true"
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-[440px] h-[100dvh] sm:h-auto sm:max-h-[92vh] bg-white sm:rounded-[28px] overflow-hidden sm:shadow-2xl relative flex flex-col">
        <Suspense fallback={<PageLoader />}>
          <StudentLogin 
            setAuth={(student, token, devId, refresh) => {
              setIsStudentLoggedIn(student, token, devId, refresh);
              onClose();
            }}
            onClose={onClose}
          />
        </Suspense>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Apply safe area fallback padding ONLY for native Android/iOS apps
    // This prevents double-padding and ensures older phones get at least 24px space
    if (Capacitor.isNativePlatform()) {
      document.body.style.paddingTop = 'max(env(safe-area-inset-top), 24px)';

      // Handle deep links (e.g. aonetarget://news/{id} or https://aonetarget.in/news/{id})
      import('@capacitor/app').then(({ App: CapApp }) => {
        const handleDeepUrl = (urlStr?: string) => {
          if (!urlStr) return;
          try {
            if (urlStr.includes('news')) {
              const match = urlStr.match(/news[\/:]([^\/?#&]+)/);
              if (match && match[1]) {
                window.location.hash = `/news/${match[1]}`;
              }
            }
          } catch (e) {
            console.error('Deep link handling error:', e);
          }
        };

        // Cold start URL
        CapApp.getLaunchUrl().then((launch) => {
          if (launch?.url) handleDeepUrl(launch.url);
        }).catch(() => {});

        // Warm start / app already running
        CapApp.addListener('appUrlOpen', (event) => {
          if (event?.url) handleDeepUrl(event.url);
        });
      }).catch(() => {});
    }
  }, []);

  // Force logout on app update
  useEffect(() => {
    const currentVersion = localStorage.getItem('app_version');
    if (currentVersion !== APP_VERSION) {
      const savedDeviceId = localStorage.getItem('deviceId');
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
      if (savedDeviceId) localStorage.setItem('deviceId', savedDeviceId);
      window.location.reload(); // Reload completely
    }
  }, []);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const isAuth = localStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAuth) return false;
    
    // Validate session duration (18 hours)
    const loginTime = localStorage.getItem('adminLoginTimestamp');
    if (loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      if (elapsed > 18 * 60 * 60 * 1000) {
        // Session expired
        clearAdminSession();
        return false;
      }
    }
    return true;
  });
  const { isAuthenticated: isStudentLoggedIn, isLoading, checkAuth, setAuth: setIsStudentLoggedIn } = useAuthStore();

  useEffect(() => {
    if (!isAdminRoute()) {
      checkAuth();
    }
    // Safety Watchdog: Never let loading screen freeze more than 3.5s
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }, 3500);
    return () => clearTimeout(safetyTimer);
  }, [checkAuth]);

  const [showSplash, setShowSplash] = useState(() => {
    // Do not show splash screen on admin routes
    if (isAdminRoute()) {
      return false;
    }
    // Do not show splash screen on desktop/laptop
    if (window.innerWidth >= 768) {
      return false;
    }
    // Only show splash once per session so navigating or reloading is instantaneous
    if (sessionStorage.getItem('splash_shown') === 'true') {
      return false;
    }
    return true;
  });

  const [showAuthPopup, setShowAuthPopup] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (isAdminRoute() || localStorage.getItem('isAdminAuthenticated') === 'true') return false;
    const dismissed = sessionStorage.getItem('auth_popup_dismissed') === 'true';
    return !dismissed;
  });

  const handleCloseAuthPopup = useCallback(() => {
    sessionStorage.setItem('auth_popup_dismissed', 'true');
    setShowAuthPopup(false);
  }, []);

  useEffect(() => {
    const handleClose = () => handleCloseAuthPopup();
    window.addEventListener('app:close-auth-popup', handleClose);
    return () => window.removeEventListener('app:close-auth-popup', handleClose);
  }, [handleCloseAuthPopup]);

  // Keep auth popup dismissed if admin is authenticated or on admin route
  useEffect(() => {
    const isAuth = isAdminLoggedIn || (typeof window !== 'undefined' && localStorage.getItem('isAdminAuthenticated') === 'true');
    if (isAuth || isAdminRoute()) {
      setShowAuthPopup(false);
      sessionStorage.setItem('auth_popup_dismissed', 'true');
    }
  }, [isAdminLoggedIn]);

  useEffect(() => {
    const handleHashChange = () => {
      const isAuth = localStorage.getItem('isAdminAuthenticated') === 'true';
      if (isAuth || isAdminRoute()) {
        setShowAuthPopup(false);
        sessionStorage.setItem('auth_popup_dismissed', 'true');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Proactive Admin Session Monitor
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const checkSession = () => {
      const loginTime = localStorage.getItem('adminLoginTimestamp');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > 18 * 60 * 60 * 1000) {
          clearAdminSession();
          setIsAdminLoggedIn(false);
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, [isAdminLoggedIn]);

  // Security Measures (Anti-Piracy, Screenshot & Recording Deterrent)
  useEffect(() => {
    const isAdmin = () => isAdminRoute();

    const handleContextMenu = (e: MouseEvent) => {
      if (!isAdmin()) e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAdmin()) return;
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'P' || e.key === 'S')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'U')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (!isAdmin()) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
    };
  }, []);

  const handleSplashComplete = useCallback(() => {
    try { sessionStorage.setItem('splash_shown', 'true'); } catch {}
    setShowSplash(false);
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />

      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <Router>
          <BackButtonHandler />
          <StudentAuthModal
            isOpen={showAuthPopup}
            onClose={handleCloseAuthPopup}
            isStudentLoggedIn={isStudentLoggedIn}
            isAdminLoggedIn={isAdminLoggedIn}
            setIsStudentLoggedIn={setIsStudentLoggedIn}
          />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin-login" element={isAdminLoggedIn ? <Navigate to="/admin" replace /> : <AdminLogin setAuth={setIsAdminLoggedIn} />} />
            <Route
              path="/admin/*"
              element={isAdminLoggedIn ? <AdminDashboard setAuth={setIsAdminLoggedIn} /> : <Navigate to="/admin-login" />}
            />

            <Route 
              path="/student-login" 
              element={
                <div className="font-outfit w-full min-h-[100dvh] flex items-center justify-center bg-slate-100 sm:p-4">
                  <div className="w-full sm:max-w-[440px] h-[100dvh] sm:h-auto sm:max-h-[92vh] bg-white sm:rounded-[28px] overflow-hidden sm:shadow-2xl relative flex flex-col">
                    <StudentLogin setAuth={setIsStudentLoggedIn} />
                  </div>
                </div>
              } 
            />

            <Route path="/news" element={<AllNews />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/watch/:batchId/:videoId" element={<WatchPage />} />
            <Route path="/watch/:videoId" element={<WatchPage />} />

            <Route path="*" element={
              <MainLayout isLoggedIn={isStudentLoggedIn}>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/batches" element={<Batches />} />
                    <Route path="/courses" element={<CoursesScreen />} />
                    <Route path="/explore" element={<ExploreCourses />} />
                    <Route path="/explore/:categoryId" element={<CategoryPage />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/refund" element={<RefundPolicy />} />
                    <Route path="/explore/:categoryId/:subId" element={<SubCategoryDetail />} />
                    <Route path="/content/:contentType" element={<ContentTypeDetail />} />
                    <Route path="/free-content" element={<FreeContent />} />
                    <Route path="/free-videos" element={<FreeVideosList />} />
                    <Route path="/course/:id" element={<CourseDetails />} />
                    <Route path="/checkout/:id" element={<Checkout />} />
                    <Route path="/study/:id" element={<StudyDashboard />} />
                    <Route path="/video-player" element={<VideoPlayer />} />
                    <Route path="/success" element={<Success />} />
                    <Route path="/purchase-success" element={<PurchaseSuccess />} />

                    <Route path="/student-dashboard" element={
                      isStudentLoggedIn ? <StudentDashboard /> : <ProtectedRedirect />
                    } />
                    <Route path="/my-courses" element={
                      isStudentLoggedIn ? <MyCourses /> : <ProtectedRedirect />
                    } />
                    <Route path="/live-classes" element={
                      isStudentLoggedIn ? <LiveClasses /> : <ProtectedRedirect />
                    } />
                    <Route path="/mock-tests" element={
                      isStudentLoggedIn ? <MockTests /> : <ProtectedRedirect />
                    } />
                    <Route path="/my-tests" element={
                      isStudentLoggedIn ? <MyTests /> : <ProtectedRedirect />
                    } />
                    <Route path="/test/:testId" element={
                      isStudentLoggedIn ? <TestTaking /> : <ProtectedRedirect />
                    } />
                    <Route path="/ebook-notes" element={
                      isStudentLoggedIn ? <EbookNotes /> : <ProtectedRedirect />
                    } />

                    <Route path="/notifications" element={
                      isStudentLoggedIn ? <Notifications /> : <ProtectedRedirect />
                    } />
                    <Route path="/watch-history" element={
                      isStudentLoggedIn ? <WatchHistory /> : <ProtectedRedirect />
                    } />
                    <Route path="/help-support" element={
                      isStudentLoggedIn ? <HelpSupport /> : <ProtectedRedirect />
                    } />
                    <Route path="/settings" element={
                      isStudentLoggedIn ? <Settings setAuth={setIsStudentLoggedIn} /> : <ProtectedRedirect />
                    } />
                    <Route path="/refer-earn" element={
                      isStudentLoggedIn ? <ReferEarn /> : <ProtectedRedirect />
                    } />

                    <Route path="/chats" element={
                      isStudentLoggedIn ? <ChatsScreen /> : <ProtectedRedirect />
                    } />
                    <Route path="/profile" element={
                      isStudentLoggedIn ? <StudentProfile setAuth={setIsStudentLoggedIn} /> : <ProtectedRedirect />
                    } />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            } />
            <Route path="/pdf-viewer" element={<PDFViewerScreen />} />
          </Routes>
        </Suspense>
      </Router>
      )}
    </div>
  );
};

export default App;
