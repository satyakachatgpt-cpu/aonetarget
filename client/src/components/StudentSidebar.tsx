import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface StudentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    name: string;
    email: string;
  } | null;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ isOpen, onClose, student }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, clearAuth } = useAuthStore();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      clearAuth();
      onClose();
      navigate('/');
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    };
  }, [isOpen]);

  const menuItems = [
    { icon: 'home', label: 'Home', path: '/' },
    { icon: 'dashboard', label: 'Dashboard', path: '/student-dashboard' },
    { icon: 'videocam', label: 'Live Classes', path: '/live-classes' },
    { icon: 'school', label: 'Featured Batches', path: '/batches' },
    { icon: 'quiz', label: 'Mock Tests', path: '/mock-tests' },
    { icon: 'menu_book', label: 'E-Book Notes', path: '/ebook-notes' },
    { icon: 'notifications', label: 'Notifications', path: '/notifications' },
    { icon: 'history', label: 'Watch History', path: '/watch-history' },
    { icon: 'redeem', label: 'Refer & Earn', path: '/refer-earn' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className="absolute inset-0 bg-black/50 z-[100] animate-backdrop"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-[85%] max-w-[300px] bg-white z-[101] shadow-2xl animate-slide-in-left overflow-hidden flex flex-col smooth-scroll">
        <div className="bg-gradient-to-r from-brandBlue to-[#1A237E] p-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <img
              src="/attach-assist/alonelogo_1770810181717.jpg"
              alt="Aone Target"
              className="h-10 rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <button onClick={onClose} className="text-white p-1">
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          {isAuthenticated ? (
            <div
              className="flex items-center gap-3 bg-white/20 rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => handleNavigation('/profile')}
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-xl font-semibold text-brandBlue">
                  {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
              <div className="flex-1 text-white">
                <p className="font-semibold text-sm">{student?.name || 'Student'}</p>
                <p className="text-[11px] opacity-80">{student?.email || 'student@email.com'}</p>
              </div>
              <span className="material-symbols-rounded text-white">chevron_right</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 bg-white/20 rounded-xl p-3 cursor-pointer hover:bg-white/30 transition-all"
              onClick={() => handleNavigation('/student-login')}
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="material-symbols-rounded text-xl font-semibold text-brandBlue">person</span>
              </div>
              <div className="flex-1 text-white">
                <p className="font-semibold text-sm">Login / Sign Up</p>
                <p className="text-[11px] opacity-80">Access your courses</p>
              </div>
              <span className="material-symbols-rounded text-white">chevron_right</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${isActive
                  ? 'bg-brandBlue/10 text-brandBlue border-r-4 border-brandBlue'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <span className={`material-symbols-rounded ${isActive ? 'text-brandBlue' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-600 p-3 mb-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all outline-none"
            >
              <span className="material-symbols-rounded">logout</span>
              Logout
            </button>
          )}
          <p className="text-[11px] text-gray-400 text-center">
            Aone Target Institute Pvt. Ltd.
          </p>
        </div>
      </div>
    </>,
    document.getElementById('sidebar-root') || document.body
  );
};

export default StudentSidebar;
