import React, { useState, useEffect } from 'react';
import { instituteAPI } from '../../services/apiClient';
import FileUploadButton from '../shared/FileUploadButton';

interface InstituteSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Institute: React.FC<Props> = ({ showToast }) => {
  const [settings, setSettings] = useState<InstituteSettings>({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await instituteAPI.get();
      setSettings(data);
    } catch (error) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await instituteAPI.update(settings);
      showToast('Profile settings saved successfully!');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
          <span className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Loading Settings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Institute Profile</h2>
        <p className="text-sm text-gray-400 font-medium">Manage your institution's public information and identity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Logo & Hero */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-50 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden transition-all group hover:scale-105">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-gray-300 text-[48px]">account_balance</span>
                )}
              </div>
              <div className="absolute bottom-1 right-1">
                <FileUploadButton
                  onUpload={(url) => setSettings({ ...settings, logo: url })}
                  icon="edit"
                  className="w-9 h-9 bg-[#1A237E] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                  hideLabel={true}
                />
              </div>
            </div>
            <h3 className="text-lg font-black text-[#1A237E] truncate w-full px-2">{settings.name || 'New Institute'}</h3>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">{settings.email || 'No email set'}</span>

            <div className="w-full h-[1px] bg-gray-50 my-6"></div>

            <div className="space-y-4 w-full">
              <div className="flex items-center gap-3 text-left p-3 rounded-2xl bg-gray-50/50">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-[20px]">verified</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Verification</p>
                  <p className="text-[13px] font-bold text-gray-700">Fully Verified</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left p-3 rounded-2xl bg-gray-50/50">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-orange-600 text-[20px]">star</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tier</p>
                  <p className="text-[13px] font-bold text-gray-700">Premium Partner</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#E8EAF6] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1A237E]">info</span>
              </div>
              <h4 className="text-[14px] font-black text-[#1e293b] uppercase tracking-widest">Business Information</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Institute Display Name</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-[#1A237E] transition-colors font-light">home</span>
                  <input
                    className="w-full bg-[#F8FAFC] border border-gray-100 pl-11 pr-4 py-4 rounded-2xl text-[14px] font-bold text-[#1e293b] outline-none focus:border-[#1A237E] focus:bg-white transition-all shadow-sm"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="e.g. Aone Target Coaching"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Support Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-[#1A237E] transition-colors font-light">mail</span>
                  <input
                    className="w-full bg-[#F8FAFC] border border-gray-100 pl-11 pr-4 py-4 rounded-2xl text-[14px] font-bold text-[#1e293b] outline-none focus:border-[#1A237E] focus:bg-white transition-all shadow-sm"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="contact@institute.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Contact Phone</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-[#1A237E] transition-colors font-light">call</span>
                  <input
                    className="w-full bg-[#F8FAFC] border border-gray-100 pl-11 pr-4 py-4 rounded-2xl text-[14px] font-bold text-[#1e293b] outline-none focus:border-[#1A237E] focus:bg-white transition-all shadow-sm"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#E8EAF6] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1A237E]">location_on</span>
              </div>
              <h4 className="text-[14px] font-black text-[#1e293b] uppercase tracking-widest">Office Address</h4>
            </div>

            <div className="space-y-1.5">
              <textarea
                className="w-full bg-[#F8FAFC] border border-gray-100 p-5 rounded-2xl text-[14px] font-bold text-[#1e293b] outline-none focus:border-[#1A237E] focus:bg-white transition-all resize-none shadow-sm h-[120px]"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Full institute address..."
                rows={3}
              />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#E8EAF6] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#1A237E]">brush</span>
              </div>
              <h4 className="text-[14px] font-black text-[#1e293b] uppercase tracking-widest">Branding</h4>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Logo Asset URL</label>
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mb-1">Recommended: 512x512 px (1:1 Ratio)</span>
              </div>
              <div className="flex gap-4 items-center">
                <div className="relative group flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-[#1A237E] transition-colors font-light">link</span>
                  <input
                    className="w-full bg-[#F8FAFC] border border-gray-100 pl-11 pr-4 py-4 rounded-2xl text-[14px] font-bold text-[#1e293b] outline-none focus:border-[#1A237E] focus:bg-white transition-all shadow-sm"
                    value={settings.logo}
                    onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                    placeholder="https://assets.yoursite.com/logo.png"
                  />
                </div>
                <FileUploadButton
                  onUpload={(url) => setSettings({ ...settings, logo: url })}
                  label="Upload"
                  icon="cloud_upload"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={loadSettings}
              className="px-8 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest text-[#1e293b] border border-gray-100 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1A237E] text-white px-10 py-4 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-100 hover:bg-[#151b60] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 group disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">save</span>
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Institute;

