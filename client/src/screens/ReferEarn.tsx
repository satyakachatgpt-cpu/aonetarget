import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ReferEarn: React.FC = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({ totalReferrals: 0, totalEarnings: 0, pendingEarnings: 0 });
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
      const statsRes = await fetch(`/api/referrals/${sid}`);
      const statsData = await statsRes.json();

      if (statsData.referralCode) {
        setReferralCode(statsData.referralCode);
        setStats({
          totalReferrals: statsData.totalReferrals || 0,
          totalEarnings: statsData.totalEarnings || 0,
          pendingEarnings: statsData.pendingEarnings || 0
        });

        const historyRes = await fetch(`/api/referrals/${sid}/history`);
        const historyData = await historyRes.json();
        setHistory(historyData);
      } else {
        const genRes = await fetch('/api/referrals/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: sid })
        });
        const genData = await genRes.json();
        if (genData.referralCode) {
          setReferralCode(genData.referralCode);
        }
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

  const shareMessage = `Join Aone Target Institute and get amazing courses for NEET & IIT-JEE preparation! Use my referral code: ${referralCode} while registering. Download now!`;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://aonetarget.com')}&text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareMessage);
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
        <p className="text-blue-200 text-sm">Share your code and earn rewards!</p>
      </div>

      <div className="px-4 -mt-2">
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

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-gray-100">
            <div className="w-10 h-10 bg-[#303F9F]/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-rounded text-[#303F9F]">group</span>
            </div>
            <p className="text-2xl font-black text-[#1A237E]">{stats.totalReferrals}</p>
            <p className="text-[10px] text-gray-500 font-medium">Total Referrals</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-rounded text-green-600">payments</span>
            </div>
            <p className="text-2xl font-black text-green-600">₹{stats.totalEarnings}</p>
            <p className="text-[10px] text-gray-500 font-medium">Total Earnings</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-4 text-center border border-gray-100">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-rounded text-amber-600">schedule</span>
            </div>
            <p className="text-2xl font-black text-amber-600">₹{stats.pendingEarnings}</p>
            <p className="text-[10px] text-gray-500 font-medium">Pending</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 mb-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">How It Works</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#1A237E] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-black">1</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Share Your Code</p>
                <p className="text-xs text-gray-500">Share your unique referral code with friends</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#303F9F] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-black">2</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Friend Joins</p>
                <p className="text-xs text-gray-500">Your friend registers using your referral code</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#D32F2F] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-black">3</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">You Earn</p>
                <p className="text-xs text-gray-500">Get rewarded for every successful referral</p>
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
                    <p className="text-sm font-bold text-green-600">+₹{item.earning || 0}</p>
                    <p className={`text-[10px] font-medium ${item.status === 'confirmed' ? 'text-green-500' : 'text-amber-500'}`}>
                      {item.status === 'confirmed' ? 'Confirmed' : 'Pending'}
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
