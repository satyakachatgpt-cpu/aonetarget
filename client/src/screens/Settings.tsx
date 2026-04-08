
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';

interface SettingsProps {
  setAuth?: (auth: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  const { student, isAuthenticated, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    autoPlay: localStorage.getItem('autoPlay') !== 'false',
    downloadOverWifi: localStorage.getItem('downloadOverWifi') !== 'false',
    videoQuality: localStorage.getItem('videoQuality') || 'Auto'
  });

  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);



  useEffect(() => {
    localStorage.setItem('autoPlay', settings.autoPlay.toString());
    localStorage.setItem('downloadOverWifi', settings.downloadOverWifi.toString());
    localStorage.setItem('videoQuality', settings.videoQuality);
  }, [settings.autoPlay, settings.downloadOverWifi, settings.videoQuality]);

  useEffect(() => {
    const isModalOpen = showQualityModal;
    if (isModalOpen) {
      document.body.classList.add('modal-open-nav-hide');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-open-nav-hide');
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.classList.remove('modal-open-nav-hide');
      document.body.style.overflow = 'unset';
    };
  }, [showQualityModal, showPasswordModal]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/student-login');
    }
  }, [isAuthenticated, navigate]);

  const handleToggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast.error('All fields are required');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (err) {
      toast.error('Connection error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAction = (key: string) => {
    if (key === 'privacy') navigate('/privacy');
    if (key === 'terms') navigate('/terms');
    if (key === 'refund') navigate('/refund');
    if (key === 'videoQuality') setShowQualityModal(true);
    if (key === 'changePassword') setShowPasswordModal(true);
  };

  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        { key: 'notifications', label: 'Push Notifications', icon: 'notifications', toggle: true },
        { key: 'emailUpdates', label: 'Email Updates', icon: 'mail', toggle: true }
      ]
    },

    {
      title: 'Video',
      items: [
        { key: 'autoPlay', label: 'Auto-play Videos', icon: 'play_circle', toggle: true },
        { key: 'downloadOverWifi', label: 'Download over Wi-Fi only', icon: 'wifi', toggle: true },
        { key: 'videoQuality', label: 'Video Quality', icon: 'hd', value: settings.videoQuality }
      ]
    },
    {
      title: 'Account',
      items: [
        { key: 'privacy', label: 'Privacy Policy', icon: 'privacy_tip' },
        { key: 'changePassword', label: 'Change Password', icon: 'lock' },
        { key: 'terms', label: 'Terms of Service', icon: 'description' },
        { key: 'refund', label: 'Refund & Return Policy', icon: 'assignment_return' },
        { key: 'about', label: 'About App', icon: 'info', value: 'v1.0.0' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-surface-100 pb-2">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="sticky top-0 z-40 shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A237E 0%, #283593 40%, #303F9F 100%)' }}>
        <div className="px-4 pt-6 pb-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-white">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="p-4 space-y-5 animate-in slide-in-from-bottom duration-500">
        {settingsGroups.map((group, groupIdx) => (
          <section key={groupIdx} className="animate-fade-in-up" style={{ animationDelay: `${groupIdx * 100}ms` }}>
            <div className="flex items-center gap-2 mb-2.5 px-1">
              <div className="w-1 h-4 bg-brandBlue rounded-full" />
              <h3 className="font-bold text-[11px] text-gray-400 uppercase tracking-widest">
                {group.title}
              </h3>
            </div>
            <div className="card-premium overflow-hidden">
              {group.items.map((item, itemIdx) => (
                <div
                  key={item.key}
                  onClick={() => {
                    if (item.toggle) return;
                    handleAction(item.key);
                  }}
                  className={`flex items-center justify-between p-4 active:bg-surface-50 transition-all duration-200 ${itemIdx !== group.items.length - 1 ? 'border-b border-gray-100/50' : ''
                    } ${!item.toggle ? 'cursor-pointer hover:bg-surface-50/50' : ''}`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-rounded text-gray-500 text-[22px]">{item.icon}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.toggle ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(item.key); }}
                        className={`w-11 h-6 rounded-full transition-all duration-300 relative ${settings[item.key as keyof typeof settings] ? 'bg-primary-600 shadow-lg shadow-primary-500/30' : 'bg-gray-300'
                          }`}
                      >
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 shadow-sm transition-all duration-300 ${settings[item.key as keyof typeof settings] ? 'left-[22px]' : 'left-[2px]'
                          }`} />
                      </button>
                    ) : (
                      <>
                        {item.value && (
                          <span className="text-xs font-bold text-brandBlue bg-brandBlue/5 px-3 py-1 rounded-full">{item.value}</span>
                        )}
                        <span className="material-symbols-rounded text-gray-300 text-xl font-light">chevron_right</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <button
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 p-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-rounded">logout</span>
          Logout
        </button>

        <p className="text-center text-[10px] text-gray-300 mt-4">
          Aone Target Institute Pvt. Ltd. | Version 1.0.0
        </p>
      </div>



      {/* Video Quality Modal */}
      {showQualityModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQualityModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-4 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <h3 className="text-lg font-bold mb-4">Select Video Quality</h3>
            <div className="space-y-2">
              {['Auto', '1080p', '720p', '480p', '360p'].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setSettings(prev => ({ ...prev, videoQuality: q }));
                    setShowQualityModal(false);
                  }}
                  className={`w-full p-4 rounded-xl font-bold text-sm flex items-center justify-between transition-all ${settings.videoQuality === q
                    ? 'bg-brandBlue text-white shadow-lg shadow-brandBlue/30'
                    : 'bg-gray-50 text-gray-700 active:bg-gray-100'
                    }`}
                >
                  {q}
                  {settings.videoQuality === q && (
                    <span className="material-symbols-rounded text-white">check_circle</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowQualityModal(false)}
              className="mt-4 w-full py-2.5 font-bold text-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !passwordLoading && setShowPasswordModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-navy leading-none">Change Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-gray-400"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold"
                />
              </div>
              
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full h-14 bg-brandBlue text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-brandBlue/20 active:scale-[0.98] transition-all flex items-center justify-center mt-4"
              >
                {passwordLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
