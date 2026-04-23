import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../services/apiClient';

interface Stats {
  referralCode: string;
  invitedCount: number;
  lifetimeCoins: number;
  pendingCoins: number;
  availableCoins: number;
  usedCoins: number;
  stats?: {
    totalInvited: number;
    pendingInvites: number;
    unlockedInvites: number;
    conversionRate: number;
  };
}

const ReferEarn: React.FC = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<Stats>({ 
    referralCode: '',
    invitedCount: 0, 
    lifetimeCoins: 0, 
    pendingCoins: 0, 
    availableCoins: 0,
    usedCoins: 0,
    stats: {
      totalInvited: 0,
      pendingInvites: 0,
      unlockedInvites: 0,
      conversionRate: 0
    }
  });
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    const studentData = localStorage.getItem('studentData');
    if (studentData) {
      const student = JSON.parse(studentData);
      setStudentId(student.id);
      loadReferralData(student.id);
    }
  }, []);

  const loadReferralData = async (sid: string) => {
    try {
      const statsRes = await fetch(`/api/referrals/${sid}`, { headers: getAuthHeaders() });
      const statsData = await statsRes.json();

      // Set stats regardless of whether referralCode exists yet
      if (!statsData.error) {
        setStats({
          referralCode: statsData.referralCode || '',
          invitedCount: statsData.invitedCount || 0,
          lifetimeCoins: statsData.lifetimeCoins || 0,
          pendingCoins: statsData.pendingCoins || 0,
          availableCoins: statsData.availableCoins || 0,
          usedCoins: statsData.usedCoins || 0,
          stats: statsData.stats
        });
        if (statsData.referralCode) {
          setReferralCode(statsData.referralCode);
        }
      }

      // If no referral code, generate one
      if (!statsData.referralCode) {
        const genRes = await fetch('/api/referrals/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ studentId: sid })
        });
        const genData = await genRes.json();
        if (genData.referralCode) {
          setReferralCode(genData.referralCode);
          setStats(prev => ({ ...prev, referralCode: genData.referralCode }));
        }
      }

      // Always try to fetch history
      const historyRes = await fetch(`/api/referrals/${sid}/history`, { headers: getAuthHeaders() });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
      }
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `${window.location.origin}/#/?ref=${referralCode}`;
  const shareMessage = `Join Aone Target Institute and get amazing courses for NEET & IIT-JEE preparation! Use my referral code: ${referralCode} or click here: ${shareUrl}`;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="material-symbols-rounded animate-spin text-4xl text-[#303F9F]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#1A237E] to-[#303F9F] p-4 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white">Refer & Earn</h1>
        </div>

        {/* Coins Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-rounded text-amber-400 text-lg">payments</span>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Usable Now</span>
            </div>
            <p className="text-2xl font-black text-white">{stats.availableCoins}</p>
            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Available Coins</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-rounded text-blue-300 text-lg">lock</span>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Locked Rewards</span>
            </div>
            <p className="text-2xl font-black text-white">{stats.pendingCoins}</p>
            <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Wait for Friend Purchase</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-[#0D47A1] rounded-[2rem] p-6 mb-10 shadow-2xl shadow-black/20 border border-white/5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Friends Joined</p>
              <p className="text-xl font-black text-white">{stats.invitedCount}</p>
              <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Total Invited</p>
            </div>
            <div className="w-px h-full bg-white/10 mx-auto"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Earned</p>
              <p className="text-xl font-black text-white">{stats.lifetimeCoins}</p>
              <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Lifetime</p>
            </div>
            <div className="w-px h-full bg-white/10 mx-auto"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Success</p>
              <p className="text-xl font-black text-green-400">{stats.stats?.conversionRate || 0}%</p>
              <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Conversion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gradient-to-r from-[#1A237E]/5 to-[#303F9F]/10 rounded-xl p-4 border-2 border-dashed border-[#303F9F]/30">
              <p className="text-2xl font-black text-[#1A237E] tracking-[0.2em] text-center">{referralCode}</p>
            </div>
            <button
              onClick={copyCode}
              className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500' : 'bg-[#303F9F]'} text-white shadow-lg`}
            >
              <span className="material-symbols-rounded">{copied ? 'check' : 'content_copy'}</span>
            </button>
          </div>
          {copied && <p className="text-green-600 text-xs mt-2 text-center font-medium">Copied to clipboard!</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Share Via</p>
          <div className="flex gap-3">
            <button
              onClick={shareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span className="material-symbols-rounded text-lg">chat</span>
              WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0088cc] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span className="material-symbols-rounded text-lg">send</span>
              Telegram
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <span className="material-symbols-rounded text-lg">link</span>
              Copy
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
              <h3 className="text-lg font-black text-navy mb-4">Referral Progress</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Invites</p>
                  <p className="text-lg font-black text-amber-600">
                    {history.filter(h => h.status?.toLowerCase() === 'pending').length}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Successful</p>
                  <p className="text-lg font-black text-green-600">
                    {history.filter(h => ['unlocked', 'confirmed'].includes(h.status?.toLowerCase())).length}
                  </p>
                </div>
              </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
              <h3 className="text-lg font-black text-navy mb-2">How it works</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-black text-sm">1</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Share your link</p>
                    <p className="text-xs text-gray-500">Friends get 100 coins instantly when they signup</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-black text-sm">2</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Earn 500 Coins (Pending)</p>
                    <p className="text-xs text-gray-500">Reward is locked until their first successful purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600 font-black text-sm">3</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Unlock & Use</p>
                    <p className="text-xs text-gray-500">Use unlocked coins for massive discounts! 10 Coins = ₹1</p>
                  </div>
                </div>
                

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-2xl">
                    <span className="material-symbols-rounded text-indigo-600">info</span>
                    <p className="text-[11px] font-bold text-indigo-900 leading-tight">
                      Earn coins and redeem them during checkout for instant discounts. Help your friends start their journey with Aone!
                    </p>
                  </div>
                </div>
              </div>
        </div>


        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Referral History</p>
          {history.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-rounded text-4xl text-gray-300">person_add</span>
              <p className="text-sm text-gray-400 mt-2">No referrals yet</p>
              <p className="text-xs text-gray-400">Start sharing your code to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#303F9F]/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-[#303F9F]">
                        {item.studentName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.studentName || 'Student'}</p>
                      <p className="text-[10px] text-gray-400">
                        {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">+{item.coins || 500} Coins</p>
                    <p className={`text-[10px] font-black uppercase tracking-tight ${['unlocked', 'confirmed'].includes(item.status?.toLowerCase()) ? 'text-green-500' : 'text-amber-500'}`}>
                      {['unlocked', 'confirmed'].includes(item.status?.toLowerCase()) ? 'Unlocked' : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferEarn;
