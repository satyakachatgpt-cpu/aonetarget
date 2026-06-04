import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { useAuthStore } from './store/authStore';
import { clearAdminSession } from './services/apiClient';
import FreeContent from './screens/FreeContent';
import FreeVideosList from './screens/FreeVideosList';
import StudyDashboard from './screens/StudyDashboard';

const Home = lazy(() => import('./screens/Home'));
const CourseDetails = lazy(() => import('./screens/CourseDetails'));
const Checkout = lazy(() => import('./screens/Checkout'));
const Success = lazy(() => import('./screens/Success'));
const VideoPlayer = lazy(() => import('./screens/VideoPlayer'));
const AdminDashboard = lazy(() => import('./screens/AdminDashboard'));
const AdminLogin = lazy(() => import('./screens/AdminLogin'));
const StudentLogin = lazy(() => import('./screens/StudentLogin'));
const StudentProfile = lazy(() => import('./screens/StudentProfile'));
const StudentDashboard = lazy(() => import('./screens/StudentDashboard'));
const CoursesScreen = lazy(() => import('./screens/CoursesScreen'));
const ExploreCourses = lazy(() => import('./screens/ExploreCourses'));
const CategoryPage = lazy(() => import('./screens/CategoryPage'));
const SubCategoryDetail = lazy(() => import('./screens/SubCategoryDetail'));
const ChatsScreen = lazy(() => import('./screens/ChatsScreen'));
const MyCourses = lazy(() => import('./screens/MyCourses'));
const LiveClasses = lazy(() => import('./screens/LiveClasses'));
const MockTests = lazy(() => import('./screens/MockTests'));
const TestTaking = lazy(() => import('./screens/TestTaking'));
const EbookNotes = lazy(() => import('./screens/EbookNotes'));

const Notifications = lazy(() => import('./screens/Notifications'));
const WatchHistory = lazy(() => import('./screens/WatchHistory'));
const HelpSupport = lazy(() => import('./screens/HelpSupport'));
const Settings = lazy(() => import('./screens/Settings'));
const ReferEarn = lazy(() => import('./screens/ReferEarn'));
const PurchaseSuccess = lazy(() => import('./screens/PurchaseSuccess'));
const ContentTypeDetail = lazy(() => import('./screens/ContentTypeDetail'));
const NewsArticle = lazy(() => import('./screens/NewsArticle'));
const AllNews = lazy(() => import('./screens/AllNews'));
const Batches = lazy(() => import('./screens/Batches'));
const TermsOfService = lazy(() => import('./screens/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./screens/PrivacyPolicy'));
const RefundPolicy = lazy(() => import('./screens/RefundPolicy'));
const PDFViewerScreen = lazy(() => import('./screens/PDFViewerScreen'));
const WatchPage = lazy(() => import('./screens/WatchPage'));
const MyTests = lazy(() => import('./screens/MyTests'));

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
  const hideOnPaths = ['/news/', '/test/', '/checkout/', '/video-player', '/test-series/', '/live-session/'];
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

const App: React.FC = () => {
  // Force logout on app update
  useEffect(() => {
    const currentVersion = localStorage.getItem('app_version');
    if (currentVersion !== APP_VERSION) {
      const savedDeviceId = localStorage.getItem('deviceId');
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
      if (savedDeviceId) localStorage.setItem('deviceId', savedDeviceId);
      window.location.href = '/'; // Reload completely
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
    checkAuth();
  }, [checkAuth]);

  const [showSplash, setShowSplash] = useState(() => {
    // Do not show splash screen on admin routes
    if (window.location.hash.startsWith('#/admin')) {
      return false;
    }
    // Do not show splash screen on desktop/laptop
    if (window.innerWidth >= 768) {
      return false;
    }
    return true;
  });

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
    const isAdmin = () => window.location.hash.startsWith('#/admin');

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
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin-login" element={isAdminLoggedIn ? <Navigate to="/admin" replace /> : <AdminLogin setAuth={setIsAdminLoggedIn} />} />
            <Route
              path="/admin/*"
              element={isAdminLoggedIn ? <AdminDashboard setAuth={setIsAdminLoggedIn} /> : <Navigate to="/admin-login" />}
            />

            <Route path="/student-login" element={<div className="font-outfit"><StudentLogin setAuth={setIsStudentLoggedIn} /></div>} />

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
