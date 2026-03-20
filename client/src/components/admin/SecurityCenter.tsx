import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Session {
  _id: string;
  userId: string;
  studentName?: string;
  studentPhone?: string;
  token: string;
  deviceFingerprint: string;
  IP: string;
  country: string;
  lastActiveAt: string;
  createdAt: string;
}

interface AuditLog {
  _id: string;
  studentPhone?: string;
  action: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  IP: string;
  details: any;
  createdAt: string;
}

const SecurityCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs' | 'suspicious'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-admin/sessions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(data);
    } catch (err: any) {
      toast.error('Failed to load sessions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-admin/logs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data);
    } catch (err: any) {
      toast.error('Failed to load logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchSessions, fetchLogs]);

  const handleLogout = async (userId: string) => {
    try {
      const res = await fetch('/api/security-admin/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: 'ADMIN_MANUAL' })
      });
      if (res.ok) {
        toast.success('User session revoked successfully');
        fetchSessions();
      }
    } catch (err) {
      toast.error('Failed to logout user');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Security Control Center</h2>
          <p className="text-slate-500 text-sm font-medium">Monitor active sessions, audit logs, and system integrity.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          {(['sessions', 'logs', 'suspicious'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            {[
                { label: 'Active Sessions', value: sessions.length, icon: 'devices', color: 'bg-blue-500' },
                { label: 'High Severity Logs', value: logs.filter(l => l.severity === 'HIGH' || l.severity === 'CRITICAL').length, icon: 'warning', color: 'bg-red-500' },
                { label: 'System Health', value: 'OPTIMAL', icon: 'shield_check', color: 'bg-emerald-500' },
                { label: 'IP Restrictions', value: 'ACTIVE', icon: 'public', color: 'bg-amber-500' },
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                        <span className="material-symbols-rounded">{stat.icon}</span>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{stat.label}</p>
                        <p className="text-xl font-black text-slate-800">{stat.value}</p>
                    </div>
                </div>
            ))}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[500px]">
        {activeTab === 'sessions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Device</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP / Country</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map(session => (
                  <tr key={session._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{session.studentName || 'Unknown'}</span>
                        <span className="text-xs font-medium text-slate-400">{session.studentPhone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-slate-300 text-lg">fingerprint</span>
                            <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{session.deviceFingerprint?.slice(0, 12)}...</span>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-600">{session.IP}</span>
                        <span className="text-[10px] font-black text-indigo-500 uppercase">{session.country}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-slate-500">{new Date(session.lastActiveAt).toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-5">
                      <button 
                        onClick={() => handleLogout(session.userId)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-rounded text-lg">logout</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
                    <span className="material-symbols-rounded text-6xl">devices_off</span>
                    <p className="text-sm font-black uppercase tracking-widest">No active sessions</p>
                </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{log.action}</span>
                        <span className="text-[10px] font-bold text-slate-400 max-w-xs truncate">{JSON.stringify(log.details)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                        log.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                        log.severity === 'HIGH' ? 'bg-amber-500 text-white' :
                        log.severity === 'MEDIUM' ? 'bg-blue-500 text-white' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-600">{log.studentPhone || 'GUEST'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-slate-500">{log.IP}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SecurityCenter;
