
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { useAuthStore } from '../store/authStore';

interface SettingsProps {
  setAuth?: (auth: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  const { student, isAuthenticated, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<{ type: 'privacy' | 'terms' | 'refund' | null }>({ type: null });

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    darkMode: localStorage.getItem('darkMode') === 'true',
    autoPlay: localStorage.getItem('autoPlay') !== 'false',
    downloadOverWifi: localStorage.getItem('downloadOverWifi') !== 'false',
    videoQuality: localStorage.getItem('videoQuality') || 'Auto'
  });

  const [showQualityModal, setShowQualityModal] = useState(false);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', settings.darkMode.toString());
  }, [settings.darkMode]);

  useEffect(() => {
    localStorage.setItem('autoPlay', settings.autoPlay.toString());
    localStorage.setItem('downloadOverWifi', settings.downloadOverWifi.toString());
    localStorage.setItem('videoQuality', settings.videoQuality);
  }, [settings.autoPlay, settings.downloadOverWifi, settings.videoQuality]);

  useEffect(() => {
    const isModalOpen = !!showLegalModal.type || showQualityModal;
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
  }, [showLegalModal, showQualityModal]);

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

  const handleAction = (key: string) => {
    if (key === 'privacy') setShowLegalModal({ type: 'privacy' });
    if (key === 'terms') setShowLegalModal({ type: 'terms' });
    if (key === 'refund') setShowLegalModal({ type: 'refund' });
    if (key === 'videoQuality') setShowQualityModal(true);
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
      title: 'Appearance',
      items: [
        { key: 'darkMode', label: 'Dark Mode', icon: 'dark_mode', toggle: true }
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

      {/* Legal Content Modal */}
      {showLegalModal.type && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLegalModal({ type: null })}></div>
          <div className="relative bg-white w-full max-w-lg max-h-[85vh] rounded-t-[2.5rem] sm:rounded-2xl p-5 pb-4 shadow-2xl animate-in slide-in-from-bottom duration-500 overflow-y-auto">
            <h3 className="text-xl font-bold mb-3 capitalize">
              {showLegalModal.type === 'refund' ? 'Refund & Return Policy' : `${showLegalModal.type.replace('_', ' ')} Policy`}
            </h3>
            {showLegalModal.type === 'refund' && (
              <div className="prose prose-sm text-gray-600">
                <p className="font-bold">Last Updated: February 2026</p>
                <p>Welcome to Aone Target Institute's Refund and Return Policy. Please read this carefully before purchasing any of our courses or digital materials.</p>

                <h4 className="font-bold text-gray-800 mt-4">1. Digital Products and Services</h4>
                <p>All our products, including course enrollments, test series, and e-books, are digital in nature. Once access is granted to these resources, they are considered "used" or "consumed."</p>

                <h4 className="font-bold text-gray-800 mt-4">2. Non-Refundable Purchases</h4>
                <p>Due to the digital nature of our educational content, all sales are final. We do not offer refunds, returns, or exchanges for any courses, test series, or PDF materials once the purchase is complete and access has been provided.</p>

                <h4 className="font-bold text-gray-800 mt-4">3. Exceptional Circumstances</h4>
                <p>Refunds may only be considered under exceptional circumstances, such as duplicate payments for the exact same course/product due to a technical error on our platform. In such cases, you must contact our support team within 48 hours of the transaction.</p>

                <h4 className="font-bold text-gray-800 mt-4">4. Course Cancellation by Institute</h4>
                <p>If Aone Target Institute cancels a live batch or course before its scheduled start date, enrolled students will be eligible for a full refund or can opt to transfer the amount to another available course.</p>

                <h4 className="font-bold text-gray-800 mt-4">5. Contact Support</h4>
                <p>If you experience any technical issues accessing your purchased content, please contact our support team immediately so we can assist you in resolving the issue.</p>
              </div>
            )}

            {showLegalModal.type === 'privacy' && (
              <div className="prose prose-sm text-gray-600">
                <p className="font-bold">Last Updated: February 2026</p>
                <p>Welcome to Aone Target Institute. Your privacy and trust are our most important assets.</p>

                <h4 className="font-bold text-gray-800 mt-4">1. Information Collection</h4>
                <p>We collect information that you provide directly to us when you create an account, such as your name, email, and phone number.</p>

                <h4 className="font-bold text-gray-800 mt-4">2. Usage</h4>
                <p>The information we collect is used to provide, maintain, and improve our educational services, process transactions, and send related information.</p>

                <h4 className="font-bold text-gray-800 mt-4">3. Data Security</h4>
                <p>We implement a variety of security measures to maintain the safety of your personal information when you access our platform.</p>

                <h4 className="font-bold text-gray-800 mt-4">4. Cookie Policy</h4>
                <p>We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.</p>
              </div>
            )}

            {showLegalModal.type === 'terms' && (
              <div className="prose prose-sm text-gray-600">
                <p className="font-bold">Last Updated: February 2026</p>
                <p>These Terms of Service govern your use of the Aone Target Institute platform and services.</p>

                <h4 className="font-bold text-gray-800 mt-4">1. Acceptance of Terms</h4>
                <p>By accessing or using our application, you agree to be bound by these Terms. If you do not agree to all the terms, you may not access the services.</p>

                <h4 className="font-bold text-gray-800 mt-4">2. User Accounts</h4>
                <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>

                <h4 className="font-bold text-gray-800 mt-4">3. Intellectual Property</h4>
                <p>The service and its original content, features, and functionality are and will remain the exclusive property of Aone Target Institute and its licensors. Course materials may not be distributed or shared without permission.</p>

                <h4 className="font-bold text-gray-800 mt-4">4. Code of Conduct</h4>
                <p>Users must maintain respectful behavior during live classes, in chat sections, and forums. Any form of harassment or disruption may result in account termination.</p>
              </div>
            )}
            <button
              onClick={() => setShowLegalModal({ type: null })}
              className="mt-2 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
