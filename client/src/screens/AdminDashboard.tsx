import React, { useState, useEffect, lazy, Suspense, useCallback, useTransition } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminUIContext } from '../context/AdminUIContext';

// --- Eager Load Core Components for INSTANT navigation ---
import Dashboard from '../components/admin/Dashboard';
import Students from '../components/admin/Students';
import Packages from '../components/admin/Packages';
import Categories from '../components/admin/Categories';
import Courses from '../components/admin/misc/Courses';

// --- Keep Rare/Heavy Components as Lazy (with pre-fetching) ---
const MiscSection = lazy(() => import('../components/admin/MiscSection'));
const Store = lazy(() => import('../components/admin/store/StoreManagement'));
const Institute = lazy(() => import('../components/admin/Institute'));
const Questions = lazy(() => import('../components/admin/Questions'));
const Passages = lazy(() => import('../components/admin/Passages'));
const Tests = lazy(() => import('../components/admin/Tests'));
const SubjectiveTest = lazy(() => import('../components/admin/SubjectiveTest'));
const TestSeries = lazy(() => import('../components/admin/TestSeries'));
const AllReports = lazy(() => import('../components/admin/AllReports'));
const Videos = lazy(() => import('../components/admin/Videos'));
const VideoSeries = lazy(() => import('../components/admin/VideoSeries'));
const LiveVideos = lazy(() => import('../components/admin/LiveVideos'));
const PDFs = lazy(() => import('../components/admin/PDFs'));
const ExamDocuments = lazy(() => import('../components/admin/ExamDocuments'));
const Messages = lazy(() => import('../components/admin/Messages'));
const Blog = lazy(() => import('../components/admin/Blog'));
const Settings = lazy(() => import('../components/admin/Settings'));
const SecurityCenter = lazy(() => import('../components/admin/SecurityCenter'));
const Banners = lazy(() => import('../components/admin/Banners'));
const Buyers = lazy(() => import('../components/admin/shopping/Buyers'));
const Tokens = lazy(() => import('../components/admin/shopping/Tokens'));
const Coupons = lazy(() => import('../components/admin/shopping/Coupons'));
const QuickLinks = lazy(() => import('../components/admin/QuickLinks'));
const CourseContentManager = lazy(() => import('../components/admin/CourseContentManager'));
const LiveClassScheduler = lazy(() => import('../components/admin/LiveClassScheduler'));
const SubCourses = lazy(() => import('../components/admin/misc/SubCourses'));
const Subjects = lazy(() => import('../components/admin/misc/Subjects'));
const Topics = lazy(() => import('../components/admin/misc/Topics'));
const Instructions = lazy(() => import('../components/admin/misc/Instructions'));
const GlobalNews = lazy(() => import('../components/admin/misc/GlobalNews'));
const PushNotifications = lazy(() => import('../components/admin/misc/PushNotifications'));
const Referrals = lazy(() => import('../components/admin/Referrals'));
const ChatSupport = lazy(() => import('../components/admin/ChatSupport'));
const LiveSessions = lazy(() => import('../components/admin/LiveSessions'));
const ContentManager = lazy(() => import('../components/admin/ContentManager'));
const ViewFormatPage = lazy(() => import('../components/admin/ViewFormatPage'));
const SalesReport = lazy(() => import('../components/admin/reports/SalesReport'));
const NoPurchaseReport = lazy(() => import('../components/admin/reports/NoPurchaseReport'));

export type AdminView = 'dashboard' | 'students' | 'buyers' | 'tokens' | 'coupons' | 'store' | 'institute' | 'questions' | 'question-bank' | 'passages' | 'tests' | 'subjective-test' | 'test-series' | 'all-reports' | 'videos' | 'video-series' | 'live-videos' | 'live-sessions' | 'pdfs' | 'exam-documents' | 'packages' | 'messages' | 'blog' | 'settings' | 'banners' | 'courses' | 'course-content' | 'live-class-scheduler' | 'subcourses' | 'subjects' | 'topics' | 'instructions' | 'global-news' | 'quick-links' | 'push-notifications' | 'categories' | 'misc' | 'referrals' | 'chat-support' | 'free-content' | 'blocked-users' | 'security-center' | 'sales-report' | 'no-purchase-report';

interface Props {
  setAuth: (val: boolean) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  submenu?: { id: AdminView; label: string; icon: string }[];
}

const AdminDashboard: React.FC<Props> = ({ setAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();

  // Background pre-fetcher for remaining lazy components to ensure "instant" feel later
  useEffect(() => {
    const prefetch = async () => {
      try {
        const components = [
          () => import('../components/admin/Tests'),
          () => import('../components/admin/MiscSection'),
          () => import('../components/admin/store/StoreManagement'),
          () => import('../components/admin/Institute'),
          () => import('../components/admin/AllReports'),
          () => import('../components/admin/Videos'),
          () => import('../components/admin/LiveSessions'),
          () => import('../components/admin/PDFs'),
          () => import('../components/admin/ExamDocuments'),
          () => import('../components/admin/CourseContentManager')
        ];
        // Low priority pre-fetching
        for (const comp of components) {
          setTimeout(() => comp(), 2000); 
        }
      } catch (err) { /* silent */ }
    };
    prefetch();
  }, []);

  const [activeView, setActiveViewState] = useState<AdminView>(() => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const secondToLastPart = pathParts[pathParts.length - 2];

    if (secondToLastPart === 'tests') return 'tests';
    if (lastPart && lastPart !== 'admin' && lastPart !== '') return lastPart as AdminView;

    const saved = localStorage.getItem('admin_active_view');
    if (!saved) return 'dashboard';
    if (saved === 'course-content') {
      const savedCourse = localStorage.getItem('admin_selected_course');
      if (savedCourse) return 'course-content';
      return 'dashboard';
    }
    return saved as AdminView;
  });

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const secondToLastPart = pathParts[pathParts.length - 2];

    if (secondToLastPart === 'tests') {
      setActiveViewState('tests');
    } else if (lastPart && lastPart !== 'admin' && lastPart !== '') {
      setActiveViewState(lastPart as AdminView);
    }
  }, [location.pathname]);

  const setActiveView = (view: AdminView) => {
    localStorage.setItem('admin_active_view', view);
    // Use transition to prioritize UI reactivity (like the sidebar click) over the full view render
    startTransition(() => {
      setActiveViewState(view);
      navigate(`/admin/${view}`);
    });
  };

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [selectedCourseForContent, setSelectedCourseForContent] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('admin_selected_course');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [initialContentTab, setInitialContentTab] = useState<string>(() => {
    return localStorage.getItem('admin_content_tab') || 'Content';
  });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSelectCourseForContent = useCallback((course: any, tab: string = 'Content') => {
    localStorage.setItem('admin_selected_course', JSON.stringify(course));
    localStorage.setItem('admin_content_tab', tab);
    setSelectedCourseForContent(course);
    setInitialContentTab(tab);
    setActiveView('course-content');
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view', color: 'text-gray-700' },
    { id: 'students', label: 'Students', icon: 'group', color: 'text-gray-700' },
    {
      id: 'offerings',
      label: 'Offerings',
      icon: 'inventory_2',
      color: 'text-gray-700',
      submenu: [
        { id: 'packages', label: 'Featured Batches', icon: 'category' },
        { id: 'free-content', label: 'Free Content', icon: 'auto_awesome' },
        { id: 'quick-links', label: ' Quick Links', icon: 'public' },
        { id: 'pdfs', label: 'E-Books', icon: 'book' },
        { id: 'exam-documents', label: 'Exam Docs', icon: 'description' }
      ]
    },
    {
      id: 'test-portal',
      label: 'Test Portal',
      icon: 'assignment',
      color: 'text-gray-700',
        submenu: [
          { id: 'tests', label: 'Tests', icon: 'quiz' }
        ]
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: 'campaign',
      color: 'text-gray-700',
      submenu: [
        { id: 'banners', label: 'Graphics', icon: 'image' },
        { id: 'push-notifications', label: 'Notifications', icon: 'notifications_active' },
        { id: 'referrals', label: 'Referral', icon: 'leaderboard' },
        { id: 'coupons', label: 'Coupons', icon: 'confirmation_number' },
        { id: 'blog', label: 'News', icon: 'newspaper' }
      ]
    },
    {
      id: 'support',
      label: 'Support',
      icon: 'help_outline',
      color: 'text-gray-700',
      submenu: [
        { id: 'chat-support', label: 'Chat', icon: 'forum' }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'bar_chart',
      color: 'text-gray-700',
      submenu: [
        { id: 'sales-report', label: 'Sales Report', icon: 'payments' },
        { id: 'no-purchase-report', label: 'Registered (No Purchase)', icon: 'person_off' }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      color: 'text-gray-700',
      submenu: [
        { id: 'institute', label: 'Profile', icon: 'person' },
        { id: 'categories', label: 'Categories', icon: 'category' },
        { id: 'settings', label: 'Configurations', icon: 'admin_panel_settings' },
        { id: 'blocked-users', label: 'Blocked Users', icon: 'block' }
      ]
    },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenuItems = React.useMemo(() => (
    menuItems.map(item => {
      if (item.label.toLowerCase().includes(searchQuery.toLowerCase())) return item;
      if (item.submenu) {
        const filteredSub = item.submenu.filter(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filteredSub.length > 0) return { ...item, submenu: filteredSub };
      }
      return null;
    }).filter(Boolean) as MenuItem[]
  ), [menuItems, searchQuery]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminName');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_active_view');
    localStorage.removeItem('admin_selected_course');
    localStorage.removeItem('admin_content_tab');
    setAuth(false);
    navigate('/admin-login');
  }, [navigate]);

  const renderContent = () => {
    const props = { showToast };
    return (
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard {...props} />} />
        <Route path="categories" element={<Categories {...props} />} />
        <Route path="misc" element={<MiscSection {...props} />} />
        <Route path="students" element={<Students key="students" {...props} />} />
        <Route path="blocked-users" element={<Students key="blocked-users" {...props} initialStatus="inactive" viewMode="blocked" />} />
        <Route path="tokens" element={<Tokens {...props} />} />
        <Route path="coupons" element={<Coupons {...props} />} />
        <Route path="store" element={<Store {...props} />} />
        <Route path="institute" element={<Institute {...props} />} />
        <Route path="questions" element={<Questions {...props} />} />
        <Route path="question-bank" element={<Questions {...props} view="bank" />} />
        <Route path="passages" element={<Passages {...props} />} />
        <Route path="tests/*" element={<Tests {...props} />} />
        <Route path="subjective-test" element={<SubjectiveTest {...props} />} />
        <Route path="test-series" element={<TestSeries {...props} />} />
        <Route path="all-reports" element={<AllReports {...props} />} />
        <Route path="videos" element={<Videos {...props} />} />
        <Route path="video-series" element={<VideoSeries {...props} />} />
        <Route path="live-videos" element={<LiveVideos {...props} />} />
        <Route path="live-sessions" element={<LiveSessions />} />
        <Route path="pdfs" element={<PDFs {...props} />} />
        <Route path="exam-documents" element={<ExamDocuments {...props} />} />
        <Route path="packages" element={<Packages {...props} onCourseSelect={handleSelectCourseForContent} />} />
        <Route path="free-content" element={<ContentManager mode="free" />} />
        <Route path="demo-content" element={<ContentManager mode="demo" />} />
        <Route path="chat-support" element={<ChatSupport {...props} />} />
        <Route path="messages" element={<Messages {...props} />} />
        <Route path="blog" element={<Blog {...props} />} />
        <Route path="settings" element={<Settings {...props} />} />
        <Route path="security-center" element={<SecurityCenter {...props} />} />
        <Route path="banners" element={<Banners {...props} />} />
        <Route path="referrals" element={<Referrals {...props} />} />
        <Route path="courses" element={<Courses {...props} />} />
        <Route path="course-content" element={<CourseContentManager {...props} setActiveView={setActiveView} initialCourse={selectedCourseForContent} initialMainTab={initialContentTab} onClearInitialCourse={() => { setSelectedCourseForContent(null); localStorage.removeItem('admin_selected_course'); }} onBack={() => { navigate('/admin/packages'); localStorage.removeItem('admin_selected_course'); localStorage.removeItem('admin_content_tab'); }} />} />
        <Route path="live-class-scheduler" element={<LiveClassScheduler {...props} />} />
        <Route path="subcourses" element={<SubCourses {...props} />} />
        <Route path="subjects" element={<Subjects {...props} />} />
        <Route path="topics" element={<Topics {...props} />} />
        <Route path="instructions" element={<Instructions {...props} />} />
        <Route path="global-news" element={<GlobalNews {...props} />} />
        <Route path="quick-links" element={<QuickLinks {...props} />} />
        <Route path="push-notifications" element={<PushNotifications {...props} />} />
        <Route path="sales-report" element={<SalesReport {...props} />} />
        <Route path="no-purchase-report" element={<NoPurchaseReport {...props} />} />
        <Route path="view-format/:formatId" element={<ViewFormatPage />} />
      </Routes>
    );
  };

  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden font-sans text-gray-800">
      {toast && (
        <div className={`fixed top-6 right-6 z-[999999] px-6 py-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-green-100 text-green-600' : 'bg-white border-red-100 text-red-600'}`}>
          <span className="material-icons-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Sidebar */}
      {!sidebarHidden && (
        <aside
          onMouseEnter={() => setSidebarOpen(true)}
          onMouseLeave={() => {
            setSidebarOpen(false);
            setExpandedMenu(null);
          }}
          className="bg-white border-r border-gray-100 flex flex-col z-50 shrink-0 relative transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{
            width: isSidebarOpen ? '280px' : '80px',
            willChange: 'width'
          }}
        >
          <div className={`p-6 flex items-center bg-white shrink-0 transition-all duration-300 ${isSidebarOpen ? 'gap-3 px-8' : 'justify-center px-4'}`}>
            <div className="w-11 h-11 bg-[#1A237E] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer">
              <span className="text-white font-black italic text-xl tracking-tighter">A1</span>
            </div>
            <div className={`flex items-center gap-2 whitespace-nowrap transition-all duration-500 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
              <span className="font-black text-xl tracking-tighter text-[#1A237E]">AONE</span>
              <span className="text-xl font-medium text-[#1A237E]/80 tracking-tight">ADMIN</span>
            </div>
          </div>

          <div className={`px-5 mb-4 transition-all duration-500 ease-in-out ${isSidebarOpen ? 'opacity-100 max-h-20 translate-y-0' : 'opacity-0 max-h-0 -translate-y-4 overflow-hidden'}`}>
            <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 transition-all group focus-within:ring-1 focus-within:ring-gray-200 focus-within:bg-white shadow-sm">
              <span className="material-symbols-outlined text-gray-400 text-[18px] mr-2">search</span>
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[14px] font-medium outline-none border-none p-0 w-full placeholder:text-gray-400 focus:ring-0 shadow-none"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-0.5">
            {filteredMenuItems.map((item) => (
              <div key={item.id} className="mb-0.5">
                <button
                  onClick={() => {
                    if (item.submenu) {
                      setExpandedMenu(expandedMenu === item.id ? null : item.id);
                      if (item.id === 'test-portal') setActiveView('tests');
                    } else {
                      setActiveView(item.id as AdminView);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group relative active:scale-95 ${expandedMenu === item.id || (activeView === item.id && !item.submenu) || (item.id === 'test-portal' && activeView === 'tests') ? 'text-gray-950 bg-gray-50/50 shadow-sm' : 'text-gray-400 hover:bg-gray-50/80 hover:text-gray-900'
                    }`}
                >
                  <div className={`flex items-center justify-center transition-all duration-500 ${isSidebarOpen ? '' : 'w-full'} ${expandedMenu === item.id || activeView === item.id ? 'text-gray-950 scale-110' : 'group-hover:text-gray-700'}`}>
                    <span className="material-symbols-outlined text-[20px] font-light">{item.icon}</span>
                  </div>
                  <div className={`flex items-center flex-1 transition-all duration-500 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
                    <span className={`text-[14px] tracking-tight truncate transition-all duration-500 ${expandedMenu === item.id || (activeView === item.id && !item.submenu) ? 'font-semibold text-gray-900' : 'font-medium group-hover:translate-x-1'
                      }`}>{item.label}</span>
                    {item.submenu && (
                      <span className={`material-symbols-outlined text-gray-300 text-[18px] ml-auto transition-all duration-500 ${expandedMenu === item.id ? 'rotate-180 text-gray-800' : 'rotate-0 group-hover:text-gray-500'}`}>
                        expand_more
                      </span>
                    )}
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${item.submenu && expandedMenu === item.id && isSidebarOpen ? 'max-h-96 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-6 border-l border-gray-100 flex flex-col pl-2 space-y-0.5">
                    {item.submenu?.map((subitem) => (
                      <button
                        key={subitem.id}
                        onClick={() => setActiveView(subitem.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-300 text-left hover:translate-x-1 ${activeView === subitem.id
                          ? 'text-gray-950 font-bold bg-gray-50/30'
                          : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50/50'
                          }`}
                      >
                        <span className="truncate">{subitem.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 shrink-0">
            <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-gray-950 hover:bg-gray-50/50 rounded-2xl transition-all duration-300 group overflow-hidden">
              <div className={`flex items-center justify-center transition-all duration-300 ${isSidebarOpen ? '' : 'w-full'}`}>
                <span className="material-symbols-outlined text-[20px] font-light">logout</span>
              </div>
              <span className={`text-[14px] font-bold transition-all duration-500 origin-left whitespace-nowrap ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0'}`}>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {!sidebarHidden && (
          <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-40">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-black text-[#1e293b] tracking-widest uppercase">
                {activeView === 'dashboard' ? 'Dashboard' :
                  activeView === 'course-content' ? 'Featured Batches' :
                    menuItems.find(m => m.id === activeView)?.label ||
                    menuItems.flatMap(m => m.submenu || []).find(s => s.id === activeView)?.label ||
                    'Admin'}
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 cursor-pointer group px-2 py-1.5 rounded-2xl transition-all">
                <div className="flex flex-col items-end">
                  <span className="text-[13px] font-black text-[#1e293b] leading-none mb-1">Er. Deepak Sir</span>
                  <span className="text-[10px] font-black text-green-500 uppercase tracking-widest leading-none">Master Admin</span>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shadow-sm group-hover:border-gray-200 transition-all">
                    <span className="material-symbols-outlined text-gray-400 text-[22px]">person</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[18px] transition-transform group-hover:translate-y-0.5">expand_more</span>
              </div>
            </div>
          </header>
        )}

        <div className={`flex-1 overflow-y-auto ${sidebarHidden ? 'p-0' : 'p-4 lg:p-6'} bg-[#fcfcfc] min-h-0 custom-scrollbar`}>
          <div className="h-full">
            <AdminUIContext.Provider value={{ sidebarHidden, setSidebarHidden }}>
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div></div>}>
                {renderContent()}
              </Suspense>
            </AdminUIContext.Provider>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
