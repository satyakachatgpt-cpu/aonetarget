import React, { useState, useMemo, useEffect } from 'react';
import { liveVideosAPI, coursesAPI } from '../../services/apiClient';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormLabel,
    FormInput
} from './DrawerSystem';

interface LiveSessionReal {
    id: string;
    title: string;
    courseId: string;
    courseName?: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
}

interface Props {
    showHeader?: boolean;
}

const LiveSessions: React.FC<Props> = ({ showHeader = true }) => {
    const [activeTab, setActiveTab] = useState('Live & Upcoming');
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);
    const [sessions, setSessions] = useState<LiveSessionReal[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = React.useRef<HTMLDivElement>(null);
    const [editingSession, setEditingSession] = useState<LiveSessionReal | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const tabs = ['Courses', 'Live & Upcoming', 'Forum', 'Content'];

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sessionsData, coursesData] = await Promise.all([liveVideosAPI.getAll(), coursesAPI.getAll()]);
            const enriched = sessionsData.map((session: any) => {
                const course = coursesData.find((c: any) => (c.id === session.courseId || c._id === session.courseId));
                return { ...session, courseName: course?.name || course?.title || 'General' };
            });
            setSessions(enriched);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
        setActionLoading(id);
        try {
            await liveVideosAPI.delete(id);
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            alert('Failed to delete session. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingSession) return;
        setActionLoading(editingSession.id);
        try {
            await liveVideosAPI.update(editingSession.id, editingSession);
            setSessions(prev => prev.map(s => s.id === editingSession.id ? editingSession : s));
            setEditingSession(null);
        } catch (error) {
            alert('Failed to update session. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            const matchesSearch =
                session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.id.includes(searchTerm) ||
                (session.courseName && session.courseName.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'live' ? session.status === 'live' : session.status !== 'live');
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, sessions, statusFilter]);

    return (
        <div className={`${showHeader ? 'min-h-screen' : ''} bg-[#fafafa]`}>
            {showHeader && (
                <div className="bg-white border-b border-gray-100 flex items-center px-8 relative z-50">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-6 py-[18px] text-[14.5px] font-bold transition-all relative ${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}>
                            {tab}
                            {activeTab === tab && <div className="absolute bottom-0 left-6 right-6 h-[2.5px] bg-black rounded-t-full" />}
                        </button>
                    ))}
                </div>
            )}

            <div className={`${showHeader ? 'p-6' : 'p-0'} space-y-7`}>
                {/* Header */}
                <div className="flex justify-between items-center px-1">
                    <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Live & Upcoming Sessions</h1>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                            <input type="text" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="pl-11 pr-5 py-2.5 w-[250px] bg-white border border-[#e5e7eb] rounded-full text-[14px] font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-gray-400 shadow-sm" />
                        </div>
                        <div className="relative" ref={filterDropdownRef}>
                            <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                className={`flex items-center gap-2.5 px-5 py-2.5 border rounded-xl text-[14px] font-bold transition-all shadow-sm ${statusFilter !== 'all' ? 'bg-black text-white border-black' : 'bg-white border-[#e5e7eb] text-gray-600 hover:bg-gray-50'}`}>
                                <span className="material-symbols-outlined text-[19px]">filter_list</span>
                                {statusFilter === 'all' ? 'Filters' : statusFilter === 'live' ? 'Live' : 'Upcoming'}
                            </button>
                            {isFilterDropdownOpen && (
                                <div className="absolute right-0 top-[52px] w-[200px] bg-white rounded-2xl shadow-xl z-[200] border border-gray-100 py-3">
                                    {[['all', 'All Sessions'], ['live', 'Live Now'], ['upcoming', 'Upcoming/Other']].map(([val, label]) => (
                                        <button key={val} onClick={() => { setStatusFilter(val); setIsFilterDropdownOpen(false); }}
                                            className={`w-full text-left px-5 py-2.5 text-[13px] font-bold hover:bg-gray-50 ${statusFilter === val ? 'text-black bg-gray-50' : 'text-gray-500'}`}>{label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-all shadow-md active:scale-95">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[16px] border border-[#f3f4f6] shadow-[0_4px_25px_rgba(0,0,0,0.03)] overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
                            <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Loading sessions...</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f9fafb] border-b border-[#f1f2f4]">
                                        {['CONTENT ID', 'TITLE', 'COURSE', 'LIVE ON', 'GO LIVE', 'ACTIONS'].map(h => (
                                            <th key={h} className="px-6 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-[0.12em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.length > 0 ? filteredSessions.map((session, idx) => (
                                        <tr key={session.id || idx} className="border-b border-[#f9fafb] last:border-0 hover:bg-[#fafafa] transition-colors">
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">{session.id.slice(-6).toUpperCase()}</td>
                                            <td className="px-6 py-5 text-[14px] font-bold text-[#111827]">{session.title}</td>
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">{session.courseName}</td>
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">{session.scheduledDate} at {session.scheduledTime}</td>
                                            <td className="px-6 py-5">
                                                <button className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${session.status === 'live' ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' : 'bg-[#dcfce7] hover:bg-[#bbf7d0] text-[#166534]'}`}>
                                                    {session.status === 'live' ? 'Live Now' : 'Go Live'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    {/* ✏️ Edit */}
                                                    <button title="Edit" onClick={() => setEditingSession({ ...session })} disabled={!!actionLoading}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all active:scale-90 disabled:opacity-50">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    {/* 🗑️ Delete */}
                                                    <button title="Delete" onClick={() => handleDelete(session.id)} disabled={actionLoading === session.id}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all active:scale-90 disabled:opacity-50">
                                                        {actionLoading === session.id
                                                            ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                            : <span className="material-symbols-outlined text-[18px]">delete</span>}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="px-7 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-[48px] text-[#f3f4f6]">event_busy</span>
                                                <p className="text-[14px] font-bold text-gray-400">No sessions found</p>
                                            </div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Footer */}
                            <div className="px-7 py-7 flex items-center justify-between bg-white border-t border-[#f9fafb]">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <button onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
                                            className="flex items-center gap-2 px-3.5 py-1.5 border border-[#e5e7eb] rounded-xl text-[12.5px] font-bold text-[#4b5563] hover:bg-gray-50 bg-white shadow-sm transition-all">
                                            {entriesPerPage}
                                            <span className={`material-symbols-outlined text-[18px] text-[#9ca3af] transition-transform ${showEntriesDropdown ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {showEntriesDropdown && (
                                            <div className="absolute bottom-full left-0 mb-2 w-20 bg-white border border-[#e5e7eb] rounded-xl shadow-xl z-[60] overflow-hidden">
                                                {[10, 25, 50, 100].map(val => (
                                                    <button key={val} onClick={() => { setEntriesPerPage(val); setShowEntriesDropdown(false); }}
                                                        className="w-full px-4 py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">{val}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[13px] font-bold text-[#9ca3af]">Showing 1 to {filteredSessions.length} of {filteredSessions.length} entries</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="px-4 py-2 text-[13px] font-bold text-[#9ca3af] hover:text-[#4b5563] transition-colors">Previous</button>
                                    <button className="w-9 h-11 bg-black text-white rounded-lg text-[13.5px] font-black flex items-center justify-center mx-1 shadow-md">1</button>
                                    <button className="px-4 py-2 text-[13px] font-bold text-[#9ca3af] hover:text-[#4b5563] transition-colors">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ✏️ Edit Drawer */}
            <RightSideDrawer isOpen={!!editingSession} onClose={() => setEditingSession(null)}>
                {editingSession && (
                    <>
                        <DrawerHeader title="Edit Session" onClose={() => setEditingSession(null)} />
                        <DrawerBody className="hide-scrollbar">
                            <div className="flex flex-col min-h-full">
                                <div className="flex-1 space-y-7 py-2">
                                    <div className="space-y-7">
                                        {/* Session Title */}
                                        <div className="space-y-2">
                                            <FormLabel label="Session Title" required />
                                            <FormInput
                                                value={editingSession.title}
                                                onChange={e => setEditingSession({ ...editingSession, title: e.target.value })}
                                                placeholder="Enter session title"
                                                className="h-[46px] shadow-sm"
                                            />
                                        </div>

                                        {/* Grid for Date and Time */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <FormLabel label="Scheduled Date" required />
                                                <FormInput
                                                    value={editingSession.scheduledDate}
                                                    onChange={e => setEditingSession({ ...editingSession, scheduledDate: e.target.value })}
                                                    placeholder="YYYY-MM-DD"
                                                    className="h-[46px] shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <FormLabel label="Scheduled Time" required />
                                                <FormInput
                                                    value={editingSession.scheduledTime}
                                                    onChange={e => setEditingSession({ ...editingSession, scheduledTime: e.target.value })}
                                                    placeholder="HH:MM"
                                                    className="h-[46px] shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Status Segmented Toggle (Optional but matches Screenshot 3) */}
                                        <div className="space-y-2">
                                            <FormLabel label="Status" />
                                            <div className="flex bg-[#f8fafc] p-1.5 rounded-[18px] w-full border border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSession({ ...editingSession, status: 'live' })}
                                                    className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${editingSession.status === 'live' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Live
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSession({ ...editingSession, status: 'upcoming' })}
                                                    className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${editingSession.status !== 'live' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Upcoming/Other
                                                </button>
                                            </div>
                                        </div>

                                        {/* Advanced Settings */}
                                        <div className="pt-2">
                                            <button
                                                onClick={() => setShowAdvanced(!showAdvanced)}
                                                className="flex items-center gap-1.5 text-[#6366f1] text-[13px] font-bold hover:text-[#4f46e5] transition-all"
                                            >
                                                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`}>arrow_right</span>
                                                Advanced Settings
                                            </button>

                                            {showAdvanced && (
                                                <div className="mt-5 space-y-6 animate-in slide-in-from-top-3 duration-300">
                                                    <div className="border-t border-gray-50 pt-5">
                                                        <h4 className="text-[15px] font-bold text-gray-800 mb-5">Additional Info</h4>
                                                        <p className="text-[12px] text-gray-400 font-medium">Session ID: <span className="font-bold text-gray-600 uppercase tracking-wider">{editingSession.id}</span></p>
                                                        <p className="text-[12px] text-gray-400 font-medium mt-1">Course: <span className="font-bold text-gray-600">{editingSession.courseName}</span></p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-8 flex gap-4 border-t border-gray-100">
                                        <button
                                            onClick={() => setEditingSession(null)}
                                            className="flex-1 py-4 bg-white border border-gray-100 text-gray-400 font-black rounded-full uppercase tracking-[0.2em] text-[10px] hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleEditSave}
                                            disabled={actionLoading === editingSession.id}
                                            className="flex-1 py-4 bg-[#121826] text-white font-black rounded-full uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-gray-300/40 hover:bg-black transition-all active:scale-[0.99] disabled:opacity-30 flex items-center justify-center"
                                        >
                                            {actionLoading === editingSession.id ? (
                                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                "Save Changes"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </DrawerBody>
                    </>
                )}
            </RightSideDrawer>

            <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24; }`}</style>
        </div>
    );
};

export default LiveSessions;

