import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

interface BottomNavProps {
  isLoggedIn?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ isLoggedIn = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isGlobalHidden = useUIStore(s => s.isBottomNavHidden);

  const hideOnPaths = ['/news/', '/test/', '/checkout/', '/video-player', '/test-series/', '/live-session/'];
  const shouldHide = isGlobalHidden || hideOnPaths.some(path => currentPath.startsWith(path));

  if (shouldHide) return null;

  const tabs = [
    { name: 'Home', icon: 'home', path: '/' },
    { name: 'Courses', icon: 'menu_book', path: '/explore' },
    { name: 'Free Content', icon: 'play_circle', path: '/free-content' },
    { name: 'My Courses', icon: 'school', path: isLoggedIn ? '/my-courses' : '/student-login' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
      <div className="glass rounded-t-[20px] shadow-nav border-t border-white/40 overflow-hidden">
        <div className="flex justify-around items-center py-1 px-1">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-0.5 py-1 px-1 min-w-[64px] transition-all duration-200 group"
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-gradient-to-br from-primary-800/10 to-primary-600/5 scale-105'
                  : 'group-hover:bg-gray-100/80 group-active:scale-90'
                  }`}>
                  <span className={`material-symbols-outlined text-[19px] transition-all duration-200 ${isActive ? 'text-primary-800 fill-1' : 'text-gray-400 group-hover:text-primary-800'
                    }`}>
                    {tab.icon}
                  </span>
                </div>
                <span className={`text-[9px] font-bold transition-all duration-200 ${isActive ? 'text-primary-800' : 'text-gray-400 group-hover:text-primary-800'
                  }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
