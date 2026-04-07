import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { useAuthStore } from './store/authStore';
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
const Downloads = lazy(() => import('./screens/Downloads'));
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
  <div className="flex items-center justify-center min-h-[60vh] w-full animate-in fade-in duration-300">
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute w-full h-full border-4 border-gray-100 rounded-full"></div>
        <div className="absolute w-full h-full border-4 border-[#283593] rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-400 font-medium text-sm animate-pulse">Loading content...</p>
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
    <div className="max-w-md mx-auto h-screen bg-white shadow-xl relative overflow-hidden flex flex-col">
      <div id="sidebar-root" />
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar relative smooth-scroll">
        <div className={`${shouldHide ? '' : 'pb-16'} font-outfit`}>
          {children}
        </div>
      </div>
      <BottomNav isLoggedIn={isLoggedIn} />
    </div>
  );
};

const App: React.FC = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const isAuth = localStorage.getItem('isAdminAuthenticated') === 'true';
    if (!isAuth) return false;
    
    // Validate session duration (18 hours)
    const loginTime = localStorage.getItem('adminLoginTimestamp');
    if (loginTime) {
      const elapsed = Date.now() - parseInt(loginTime, 10);
      if (elapsed > 18 * 60 * 60 * 1000) {
        // Session expired - clear all admin keys
        localStorage.removeItem('isAdminAuthenticated');
        localStorage.removeItem('adminId');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminLoginTimestamp');
        return false;
      }
    }
    return true;
  });
  const { isAuthenticated: isStudentLoggedIn, isLoading, checkAuth, setAuth: setIsStudentLoggedIn } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const [showSplash, setShowSplash] = useState(false);

  // Proactive Admin Session Monitor
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const checkSession = () => {
      const loginTime = localStorage.getItem('adminLoginTimestamp');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        if (elapsed > 18 * 60 * 60 * 1000) {
          localStorage.removeItem('isAdminAuthenticated');
          localStorage.removeItem('adminId');
          localStorage.removeItem('adminName');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminLoginTimestamp');
          setIsAdminLoggedIn(false);
          window.location.href = '#/admin-login';
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, [isAdminLoggedIn]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    try {
      localStorage.setItem('splashShown', 'true');
    } catch (e) {
      // ignore
    }
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Toaster position="top-center" richColors />


      {showSplash && <div className="font-outfit"><SplashScreen onComplete={handleSplashComplete} /></div>}
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin-login" element={isAdminLoggedIn ? <Navigate to="/admin" replace /> : <AdminLogin setAuth={setIsAdminLoggedIn} />} />
            <Route
              path="/admin/*"
              element={isAdminLoggedIn ? <AdminDashboard setAuth={setIsAdminLoggedIn} /> : <Navigate to="/admin-login" />}
            />

            <Route path="/student-login" element={isStudentLoggedIn ? <Navigate to="/" replace /> : <div className="font-outfit"><StudentLogin setAuth={setIsStudentLoggedIn} /></div>} />

            <Route path="/news" element={<AllNews />} />
            <Route path="/news/:id" element={<NewsArticle />} />
            <Route path="/watch/:batchId/:videoId" element={<WatchPage />} />

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
                    <Route path="/pdf-viewer" element={<PDFViewerScreen />} />
                    <Route path="/success" element={<Success />} />
                    <Route path="/purchase-success" element={<PurchaseSuccess />} />

                    <Route path="/student-dashboard" element={
                      isStudentLoggedIn ? <StudentDashboard /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/my-courses" element={
                      isStudentLoggedIn ? <MyCourses /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/live-classes" element={
                      isStudentLoggedIn ? <LiveClasses /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/mock-tests" element={
                      isStudentLoggedIn ? <MockTests /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/my-tests" element={
                      isStudentLoggedIn ? <MyTests /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/test/:testId" element={
                      isStudentLoggedIn ? <TestTaking /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/ebook-notes" element={
                      isStudentLoggedIn ? <EbookNotes /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/downloads" element={
                      isStudentLoggedIn ? <Downloads /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/notifications" element={
                      isStudentLoggedIn ? <Notifications /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/watch-history" element={
                      isStudentLoggedIn ? <WatchHistory /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/help-support" element={
                      isStudentLoggedIn ? <HelpSupport /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/settings" element={
                      isStudentLoggedIn ? <Settings setAuth={setIsStudentLoggedIn} /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/refer-earn" element={
                      isStudentLoggedIn ? <ReferEarn /> : <Navigate to="/student-login" />
                    } />

                    <Route path="/chats" element={
                      isStudentLoggedIn ? <ChatsScreen /> : <Navigate to="/student-login" />
                    } />
                    <Route path="/profile" element={
                      isStudentLoggedIn ? <StudentProfile setAuth={setIsStudentLoggedIn} /> : <Navigate to="/student-login" />
                    } />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            } />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
};

export default App;
