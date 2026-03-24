import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from '../components/admin/Dashboard';
import MiscSection from '../components/admin/MiscSection';
import Students from '../components/admin/Students';
import Store from '../components/admin/store/StoreManagement';
import Institute from '../components/admin/Institute';
import Questions from '../components/admin/Questions';
import Passages from '../components/admin/Passages';
import Tests from '../components/admin/Tests';
import SubjectiveTest from '../components/admin/SubjectiveTest';
import TestSeries from '../components/admin/TestSeries';
import AllReports from '../components/admin/AllReports';
import Videos from '../components/admin/Videos';
import VideoSeries from '../components/admin/VideoSeries';
import LiveVideos from '../components/admin/LiveVideos';
import PDFs from '../components/admin/PDFs';
import Packages from '../components/admin/Packages';
import Messages from '../components/admin/Messages';
import Blog from '../components/admin/Blog';
import Settings from '../components/admin/Settings';
import SecurityCenter from '../components/admin/SecurityCenter';
import Banners from '../components/admin/Banners';
import Buyers from '../components/admin/shopping/Buyers';
import Tokens from '../components/admin/shopping/Tokens';
import Coupons from '../components/admin/shopping/Coupons';
import Courses from '../components/admin/misc/Courses';
import QuickLinks from '../components/admin/QuickLinks';
import CourseContentManager from '../components/admin/CourseContentManager';
import LiveClassScheduler from '../components/admin/LiveClassScheduler';
import SubCourses from '../components/admin/misc/SubCourses';
import Subjects from '../components/admin/misc/Subjects';
import Topics from '../components/admin/misc/Topics';
import Instructions from '../components/admin/misc/Instructions';
import ExamDocuments from '../components/admin/misc/ExamDocuments';
import GlobalNews from '../components/admin/misc/GlobalNews';
import PushNotifications from '../components/admin/misc/PushNotifications';
import Categories from '../components/admin/Categories';
import Referrals from '../components/admin/Referrals';
import ChatSupport from '../components/admin/ChatSupport';
import LiveSessions from '../components/admin/LiveSessions';
import ContentManager from '../components/admin/ContentManager';
import ViewFormatPage from '../components/admin/ViewFormatPage';

export type AdminView = 'dashboard' | 'students' | 'buyers' | 'tokens' | 'coupons' | 'store' | 'institute' | 'questions' | 'question-bank' | 'passages' | 'tests' | 'subjective-test' | 'test-series' | 'all-reports' | 'videos' | 'video-series' | 'live-videos' | 'live-sessions' | 'pdfs' | 'packages' | 'messages' | 'blog' | 'settings' | 'banners' | 'courses' | 'course-content' | 'live-class-scheduler' | 'subcourses' | 'subjects' | 'topics' | 'instructions' | 'exam-documents' | 'global-news' | 'quick-links' | 'push-notifications' | 'categories' | 'misc' | 'referrals' | 'chat-support' | 'free-content' | 'demo-content' | 'blocked-users' | 'security-center';

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

  // Restore last active view from localStorage on mount (persists across refreshes)
  const [activeView, setActiveViewState] = useState<AdminView>(() => {
    // Check URL first
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const secondToLastPart = pathParts[pathParts.length - 2];

    if (secondToLastPart === 'tests') return 'tests';
    if (lastPart && lastPart !== 'admin' && lastPart !== '') return lastPart as AdminView;

    const saved = localStorage.getItem('admin_active_view');
    if (!saved) return 'dashboard';
    // For course-content, only restore if we also have the course data saved
    if (saved === 'course-content') {
      const savedCourse = localStorage.getItem('admin_selected_course');
      if (savedCourse) return 'course-content';
      return 'dashboard';
    }
    return saved as AdminView;
  });

  // Sync state with URL
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

  // Wrapper that also persists to localStorage
  const setActiveView = (view: AdminView) => {
    localStorage.setItem('admin_active_view', view);
    setActiveViewState(view);
    navigate(`/admin/${view}`);
  };

  const [isSidebarOpen, setSidebarOpen] = useState(false);
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

  const handleSelectCourseForContent = (course: any, tab: string = 'Content') => {
    localStorage.setItem('admin_selected_course', JSON.stringify(course));
    localStorage.setItem('admin_content_tab', tab);
    setSelectedCourseForContent(course);
    setInitialContentTab(tab);
    setActiveView('course-content');
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view', color: 'text-gray-700' },
    { id: 'students', label: 'Students', icon: 'group', color: 'text-gray-700' },
    {
      id: 'offerings',
      label: 'Offerings',
      icon: 'inventory_2',
      color: 'text-gray-700',
      submenu: [
        { id: 'packages', label: 'Batches', icon: 'category' },
        { id: 'free-content', label: 'Free Content', icon: 'auto_awesome' },
        { id: 'demo-content', label: 'Demo Content', icon: 'play_lesson' },
        { id: 'quick-links', label: ' Quick Links', icon: 'public' },
        { id: 'pdfs', label: 'E-Books', icon: 'book' }
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
        { id: 'buyers', label: 'Payment Pages', icon: 'payments' },
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
      id: 'settings',
      label: 'Settings',
      icon: 'settings',
      color: 'text-gray-700',
      submenu: [
        { id: 'institute', label: 'Profile', icon: 'person' },
        { id: 'categories', label: 'Categories', icon: 'category' },
        { id: 'settings', label: 'Configurations', icon: 'admin_panel_settings' },
        { id: 'security-center', label: 'Security Center', icon: 'shield' },
        { id: 'blocked-users', label: 'Blocked Users', icon: 'block' }
      ]
    },
    {
      id: 'custom-sections',
      label: 'Custom Sections',
      icon: 'build',
      color: 'text-gray-700',
      submenu: [
        { id: 'exam-documents', label: 'Documents', icon: 'folder' }
      ]
    },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  const filteredMenuItems = menuItems.map(item => {
    if (item.label.toLowerCase().includes(searchQuery.toLowerCase())) return item;
    if (item.submenu) {
      const filteredSub = item.submenu.filter(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase()));
      if (filteredSub.length > 0) return { ...item, submenu: filteredSub };
    }
    return null;
  }).filter(Boolean) as MenuItem[];

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('admin_active_view');
    localStorage.removeItem('admin_selected_course');
    localStorage.removeItem('admin_content_tab');
    setAuth(false);
    navigate('/admin-login');
  };

  const renderContent = () => {
    const props = { showToast };
    return (
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard {...props} />} />
        <Route path="categories" element={<Categories {...props} />} />
        <Route path="misc" element={<MiscSection {...props} />} />
        <Route path="students" element={<Students {...props} />} />
        <Route path="blocked-users" element={<Students {...props} initialStatus="inactive" viewMode="blocked" />} />
        <Route path="buyers" element={<Buyers {...props} />} />
        <Route path="tokens" element={<Tokens {...props} />} />
        <Route path="coupons" element={<Coupons {...props} />} />
        <Route path="store" element={<Store {...props} />} />
        <Route path="institute" element={<Institute {...props} />} />
        <Route path="questions" element={<Questions {...props} />} />
        <Route path="question-bank" element={<Questions {...props} view="bank" />} />
        <Route path="passages" element={<Passages {...props} />} />
        <Route path="tests" element={<Tests {...props} />} />
        <Route path="tests/:id" element={<Tests {...props} />} />
        <Route path="subjective-test" element={<SubjectiveTest {...props} />} />
        <Route path="test-series" element={<TestSeries {...props} />} />
        <Route path="all-reports" element={<AllReports {...props} />} />
        <Route path="videos" element={<Videos {...props} />} />
        <Route path="video-series" element={<VideoSeries {...props} />} />
        <Route path="live-videos" element={<LiveVideos {...props} />} />
        <Route path="live-sessions" element={<LiveSessions />} />
        <Route path="pdfs" element={<PDFs {...props} />} />
        <Route path="packages" element={<Packages {...props} onCourseSelect={handleSelectCourseForContent} />} />
        <Route path="free-content" element={<ContentManager mode="free" />} />
        <Route path="demo-content" element={<ContentManager mode="demo" />} />
        <Route path="chat-support" element={<ChatSupport {...props} />} />
        <Route path="messages" element={<Messages {...props} />} />
        <Route path="blog" element={<Blog {...props} />} />
        <Route path="settings" element={<Settings {...props} />} />
        <Route path="security-center" element={<SecurityCenter />} />
        <Route path="banners" element={<Banners {...props} />} />
        <Route path="referrals" element={<Referrals {...props} />} />
        <Route path="courses" element={<Courses {...props} />} />
        <Route path="course-content" element={<CourseContentManager {...props} setActiveView={setActiveView} initialCourse={selectedCourseForContent} initialMainTab={initialContentTab} onClearInitialCourse={() => { setSelectedCourseForContent(null); localStorage.removeItem('admin_selected_course'); }} onBack={() => { navigate('/admin/packages'); localStorage.removeItem('admin_selected_course'); localStorage.removeItem('admin_content_tab'); }} />} />
        <Route path="live-class-scheduler" element={<LiveClassScheduler {...props} />} />
        <Route path="subcourses" element={<SubCourses {...props} />} />
        <Route path="subjects" element={<Subjects {...props} />} />
        <Route path="topics" element={<Topics {...props} />} />
        <Route path="instructions" element={<Instructions {...props} />} />
        <Route path="exam-documents" element={<ExamDocuments {...props} />} />
        <Route path="global-news" element={<GlobalNews {...props} />} />
        <Route path="quick-links" element={<QuickLinks {...props} />} />
        <Route path="push-notifications" element={<PushNotifications {...props} />} />
        <Route path="view-format/:formatId" element={<ViewFormatPage />} />
      </Routes>
    );
  };


  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden font-sans text-gray-800">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[999999] px-6 py-4 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-green-100 text-green-600' : 'bg-white border-red-100 text-red-600'}`}>
          <span className="material-icons-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="text-sm font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => {
          setSidebarOpen(false);
          setExpandedMenu(null); // Reset submenus when sidebar closes
        }}
        className="bg-white border-r border-gray-100 flex flex-col z-50 shrink-0 relative will-change-[width,transform] transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{
          width: isSidebarOpen ? '280px' : '80px',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        {/* Logo Section */}
        <div className={`p-6 flex items-center bg-white shrink-0 transition-all duration-300 ${isSidebarOpen ? 'gap-3 px-8' : 'justify-center px-4'}`}>
          <div className="w-11 h-11 bg-[#1A237E] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer">
            <span className="text-white font-black italic text-xl tracking-tighter">A1</span>
          </div>
          <div className={`flex items-center gap-2 whitespace-nowrap transition-all duration-500 origin-left ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}`}>
            <span className="font-black text-xl tracking-tighter text-[#1A237E]">AONE</span>
            <span className="text-xl font-medium text-[#1A237E]/80 tracking-tight">ADMIN</span>
          </div>
        </div>

        {/* Search Section */}
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

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-0.5">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className="mb-0.5"
            >
              <button
                onClick={() => {
                  if (item.submenu) {
                    setExpandedMenu(expandedMenu === item.id ? null : item.id);
                    // Special case for Test Portal: clicking it navigates to Tests
                    if (item.id === 'test-portal') {
                      setActiveView('tests');
                    }
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

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-40">
          <div className="flex flex-col">
            <h1 className="text-[14px] font-black text-[#1e293b] tracking-widest uppercase">
              {activeView === 'dashboard' ? 'Dashboard' :
                activeView === 'course-content' ? 'Batches' :
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#fcfcfc] min-h-0 custom-scrollbar">
          <div className="h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
