import React, { useState, useEffect } from 'react';
import { settingsAPI, splashScreenAPI } from '../../services/apiClient';

interface Settings {
  paymentGateway: string;
  systemStatus: string;
  maintenanceMode: boolean;
  razorpayKeyId?: string;
  contactEmail?: string;
  supportPhone?: string;
}

interface SplashSettings {
  imageUrl: string;
  isActive: boolean;
  duration: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SettingsComponent: React.FC<Props> = ({ showToast }) => {
  const [settings, setSettings] = useState<Settings>({
    paymentGateway: 'razorpay',
    systemStatus: 'online',
    maintenanceMode: false,
    razorpayKeyId: '',
    contactEmail: '',
    supportPhone: ''
  });
  const [splash, setSplash] = useState<SplashSettings>({
    imageUrl: '/attached_assets/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
    isActive: true,
    duration: 3000
  });
  const [activeTab, setActiveTab] = useState<'global' | 'splash'>('splash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSplash, setSavingSplash] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSplash();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.get();
      setSettings({ ...settings, ...data });
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSplash = async () => {
    try {
      const data = await splashScreenAPI.get();
      if (data) {
        setSplash({
          imageUrl: data.imageUrl || '',
          isActive: data.isActive !== false,
          duration: data.duration || 3000
        });
      }
    } catch (error) {
      console.error('Failed to load splash settings');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      showToast('Settings updated successfully!');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSplash = async () => {
    setSavingSplash(true);
    try {
      await splashScreenAPI.update(splash);
      showToast('Splash screen settings updated!');
    } catch (error) {
      showToast('Failed to save splash screen settings', 'error');
    } finally {
      setSavingSplash(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      {/* Premium UI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configurations</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">System & Visual Controls</p>
        </div>

        {/* Action Tabs Removed as per request */}
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === 'splash' && (
          <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Visual Onboarding</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Splash screen dynamics & branding</p>
              </div>

            </div>

            <div className="p-8 space-y-8">
              <div className="p-6 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Show Splash Experience</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Display branding screen on initial student login</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-110">
                  <input
                    type="checkbox"
                    checked={splash.isActive}
                    onChange={(e) => setSplash({ ...splash, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-slate-900 shadow-inner"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source Image URI</label>
                    <input
                      type="text"
                      value={splash.imageUrl}
                      onChange={(e) => setSplash({ ...splash, imageUrl: e.target.value })}
                      placeholder="https://content.cdn/splash.png"
                      className="w-full h-14 bg-slate-50/50 border border-slate-100 rounded-[1.2rem] px-5 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-50 focus:border-slate-200 transition-all placeholder:text-slate-200 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">On-Screen Duration</label>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{splash.duration / 1000} seconds</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={splash.duration / 1000}
                      onChange={(e) => setSplash({ ...splash, duration: Number(e.target.value) * 1000 })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                      <span>1s</span>
                      <span>5s</span>
                      <span>10s</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interactive Preview</label>
                  <div className="relative aspect-[9/16] bg-slate-50 rounded-[2.5rem] border-8 border-slate-900 shadow-2xl overflow-hidden max-w-[240px] mx-auto group">
                    {splash.imageUrl ? (
                      <img src={splash.imageUrl} alt="Splash Content" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-300">
                        <span className="material-icons-outlined text-4xl">broken_image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveSplash}
                  disabled={savingSplash}
                  className="w-full md:w-auto px-12 py-4 bg-slate-900 text-white rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {savingSplash ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-icons-outlined text-base">auto_awesome</span>
                  )}
                  {savingSplash ? 'Publishing...' : 'Update Branding Experience'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );


};

export default SettingsComponent;

