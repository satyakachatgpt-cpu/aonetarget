import React, { useState, useEffect } from 'react';

interface ReferralRecord {
  _id?: string;
  studentId: string;
  studentName?: string;
  referralCode: string;
  referredStudents: {
    studentId: string;
    studentName: string;
    date: string;
    earning: number;
    status: string;
  }[];
  totalEarnings: number;
  pendingEarnings: number;
}

interface ReferralSettings {
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Referrals: React.FC<Props> = ({ showToast }) => {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [settings, setSettings] = useState<ReferralSettings>({ commissionType: 'fixed', commissionValue: 50 });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'settings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [referralsRes, settingsRes, studentsRes] = await Promise.all([
        fetch('/api/admin/referrals'),
        fetch('/api/admin/referral-settings'),
        fetch('/api/students')
      ]);
      const referralsData = await referralsRes.json();
      const settingsData = await settingsRes.json();
      const studentsData = await studentsRes.json();
      setReferrals(referralsData);
      if (settingsData && settingsData.commissionType) {
        setSettings(settingsData);
      }
      setStudents(studentsData);
    } catch (error) {
      showToast('Failed to load referral data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || studentId;
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast('Commission settings saved!');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateReferralStatus = async (referralCode: string, referredStudentId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/referrals/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode, referredStudentId, status: newStatus })
      });
      if (res.ok) {
        showToast(`Referral ${newStatus}!`);
        loadData();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const totalReferrals = referrals.reduce((sum, r) => sum + (r.referredStudents?.length || 0), 0);
  const totalCommissionsPaid = referrals.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
  const pendingCommissions = referrals.reduce((sum, r) => sum + (r.pendingEarnings || 0), 0);

  const allReferredEntries = referrals.flatMap(r =>
    (r.referredStudents || []).map(rs => ({
      referrerName: getStudentName(r.studentId),
      referrerId: r.studentId,
      referralCode: r.referralCode,
      ...rs
    }))
  ).filter(entry => {
    const matchesSearch = !searchQuery ||
      (entry.referrerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.referrerId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (entry.status || 'pending') === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A237E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-[17px] font-bold text-gray-800 tracking-tight text-left uppercase">REFERRAL MANAGEMENT</h3>
        <p className="text-[12px] text-gray-400 font-medium text-left">Manage referrals & commissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-[24px]">group</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalReferrals}</p>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Total Referrals</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-[24px]">
            <span className="material-symbols-outlined text-green-600">payments</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 text-left">₹{totalCommissionsPaid}</p>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Commissions Paid</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-600 text-[24px]">schedule</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 text-left">₹{pendingCommissions}</p>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider text-left">Pending Commissions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Modern Tabs */}
        <div className="flex bg-gray-100/50 p-1 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'all' ? 'bg-[#1a237e] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All Referrals
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-[#1a237e] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Commission Settings
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-4 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 outline-none focus:border-navy transition-all cursor-pointer h-10 shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="relative flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search referrer or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 h-10 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-400 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 mb-6 text-left">
            <span className="material-symbols-outlined text-[#1a237e]">settings</span>
            <h4 className="text-[14px] font-bold text-gray-800 uppercase tracking-widest">Commission Configuration</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block ml-1">Commission Type</label>
              <select
                value={settings.commissionType}
                onChange={(e) => setSettings({ ...settings, commissionType: e.target.value as 'percentage' | 'fixed' })}
                className="w-full h-[54px] px-5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-bold outline-none focus:border-[#1a237e] transition-all cursor-pointer shadow-sm"
              >
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block ml-1">
                {settings.commissionType === 'fixed' ? 'Amount (₹)' : 'Percentage (%)'}
              </label>
              <input
                type="number"
                value={settings.commissionValue}
                onChange={(e) => setSettings({ ...settings, commissionValue: Number(e.target.value) })}
                className="w-full h-[54px] px-5 bg-gray-50 border border-gray-200 rounded-2xl text-[14px] font-bold outline-none focus:border-[#1a237e] transition-all shadow-sm"
                min={0}
              />
            </div>
          </div>

          <div className="mt-8 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <span className="material-symbols-outlined text-indigo-600 text-[20px] mt-0.5">info</span>
            <p className="text-[13px] text-indigo-800 font-medium leading-relaxed text-left">
              {settings.commissionType === 'fixed'
                ? `Referrers will earn a flat reward of ₹${settings.commissionValue} for every student who joins using their referral code.`
                : `Referrers will receive ${settings.commissionValue}% of the total purchase amount made by students who use their referral code.`
              }
            </p>
          </div>

          <div className="flex justify-start">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="mt-8 bg-[#1a237e] text-white px-10 py-4 rounded-2xl font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-indigo-900/20 hover:bg-indigo-900 transition-all disabled:opacity-50 active:scale-95"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
          <div className="overflow-x-auto min-w-full pb-32 -mb-32">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                      Referrer
                      <span className="material-symbols-outlined text-sm">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                      Referred Student
                      <span className="material-symbols-outlined text-sm">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                      Date
                      <span className="material-symbols-outlined text-sm">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allReferredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">loyalty</span>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[12px]">No referrals yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allReferredEntries.map((entry, idx) => {
                    const isLastFew = allReferredEntries.length > 3 ? idx >= allReferredEntries.length - 2 : idx >= allReferredEntries.length - 1;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-[13px] font-bold text-[#1a237e] border border-indigo-100 uppercase">
                              {entry.referrerName?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-gray-800">{entry.referrerName}</p>
                              <p className="text-[11px] text-blue-600 font-medium">#{entry.referrerId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-[13px] font-bold text-gray-800 text-left">{entry.studentName || 'Unknown'}</p>
                            <p className="text-[11px] text-gray-400 font-medium text-left">ID: {entry.studentId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
                          {entry.date ? new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '-'}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[13px] font-black text-green-600">₹{entry.earning || 0}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${entry.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                            {entry.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right overflow-visible">
                          <div className="relative inline-block text-left group/menu">
                            <button className="flex items-center gap-1 px-4 py-1.5 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all">
                              Actions
                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </button>

                            <div className={`absolute right-0 ${isLastFew ? 'bottom-full mb-1' : 'top-full mt-1'} w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] py-1 opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all`}>
                              {(entry.status === 'pending' || !entry.status) ? (
                                <>
                                  <button
                                    onClick={() => updateReferralStatus(entry.referralCode, entry.studentId, 'confirmed')}
                                    className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-green-50 flex items-center gap-2 group/item"
                                  >
                                    <span className="material-symbols-outlined text-sm text-green-500">check_circle</span> Approve
                                  </button>
                                  <button
                                    onClick={() => updateReferralStatus(entry.referralCode, entry.studentId, 'rejected')}
                                    className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2 group/item"
                                  >
                                    <span className="material-symbols-outlined text-sm text-red-500">cancel</span> Reject
                                  </button>
                                </>
                              ) : (
                                <div className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase italic">
                                  No Actions
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
