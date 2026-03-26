import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavProps {
  isLoggedIn?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ isLoggedIn = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const hideOnPaths = ['/news/', '/test/', '/checkout/', '/video-player', '/test-series/', '/live-session/'];
  const shouldHide = hideOnPaths.some(path => currentPath.startsWith(path));

  if (shouldHide) return null;

  const tabs = [
    { name: 'Home', icon: 'home', path: '/' },
    { name: 'Courses', icon: 'menu_book', path: '/explore' },
    { name: 'Free Content', icon: 'play_circle', path: '/free-content' },
    { name: 'My Courses', icon: 'school', path: isLoggedIn ? '/my-courses' : '/student-login' },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-md z-50 px-4 pb-3">
      <div className="glass rounded-3xl shadow-nav border border-white/40">
        <div className="flex justify-around items-center py-2 px-1">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path;
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-200 group"
              >
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 bg-gradient-to-r from-primary-800 to-primary-600 rounded-full" />
                )}
                <div className={`relative p-2 rounded-2xl transition-all duration-200 ${isActive
                  ? 'bg-gradient-to-br from-primary-800 to-primary-600 shadow-button scale-105'
                  : 'group-hover:bg-gray-100/80 group-active:scale-90'
                  }`}>
                  <span className={`material-symbols-outlined text-[20px] transition-all duration-200 ${isActive ? 'text-white fill-1' : 'text-gray-400 group-hover:text-primary-800'
                    }`}>
                    {tab.icon}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold transition-all duration-200 ${isActive ? 'text-primary-800' : 'text-gray-400 group-hover:text-primary-800'
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
