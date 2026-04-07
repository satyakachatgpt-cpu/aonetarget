import React, { useState, useMemo, useEffect } from 'react';
import { liveVideosAPI, coursesAPI, uploadAPI, subjectsAPI } from '../../services/apiClient';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormLabel,
    FormInput,
    FormSelect
} from './DrawerSystem';
import { LiveStreamDrawer } from './FeatureDrawers';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);
    const [sessions, setSessions] = useState<LiveSessionReal[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = React.useRef<HTMLDivElement>(null);
    const [editingSession, setEditingSession] = useState<LiveSessionReal | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    const tabs = ['Courses', 'Live & Upcoming', 'Forum', 'Content'];

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [showLiveStreamDrawer, setShowLiveStreamDrawer] = useState(false);

    useEffect(() => { fetchData(); }, []);

    // ⏱ Auto-promote upcoming → live every 60 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            const now = new Date();
            const toPromote = sessions.filter(s => {
                if (s.status === 'live' || s.status === 'ended') return false;
                if (!s.scheduledTime) return false;
                const scheduled = new Date(s.scheduledTime.replace(' ', 'T'));
                return !isNaN(scheduled.getTime()) && scheduled <= now;
            });
            if (toPromote.length === 0) return;
            await Promise.all(toPromote.map(s =>
                liveVideosAPI.update(s.id, { ...s, status: 'live' }).catch(() => null)
            ));
            if (toPromote.length > 0) fetchData();
        }, 60000);
        return () => clearInterval(interval);
    }, [sessions]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sessionsDataRaw, coursesData, subjectsData] = await Promise.all([
                liveVideosAPI.getAll(),
                coursesAPI.getAll(),
                subjectsAPI.getAll()
            ]);

            const sessionsData = Array.isArray(sessionsDataRaw) ? sessionsDataRaw : (sessionsDataRaw?.data || []);
            const normalizedCourses = Array.isArray(coursesData) ? coursesData : (coursesData?.data || []);
            const normalizedSubjects = Array.isArray(subjectsData) ? subjectsData : (subjectsData?.data || []);

            setCourses(normalizedCourses);
            setSubjects(normalizedSubjects);

            const enriched = sessionsData.map((session: any) => {
                const course = normalizedCourses.find((c: any) => (c.id === session.courseId || c._id === session.courseId));

                let sTime = session.scheduledTime || '';

                // If it's old format 'YYYY-MM-DD HH:MM', convert to 'YYYY-MM-DDTHH:MM' for HTML inputs
                if (sTime.includes(' ')) {
                    sTime = sTime.replace(' ', 'T');
                }

                return {
                    ...session,
                    id: session.id || session._id || '',
                    courseName: course?.name || course?.title || 'General',
                    scheduledTime: sTime
                };
            });
            setSessions(enriched);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async (session: LiveSessionReal) => {
        if (!confirm(`Are you sure you want to end "${session.title}"?`)) return;
        setActionLoading(session.id);
        try {
            await liveVideosAPI.update(session.id, {
                ...session,
                status: 'ended',
                endTime: new Date().toISOString()
            });
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: 'ended' } : s));
        } catch (error: any) {
            console.error('End session error:', error);
            alert(error.message || 'Failed to end session. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleGoLive = async (session: LiveSessionReal) => {
        setActionLoading(session.id);
        const newStatus = session.status === 'live' ? 'upcoming' : 'live';
        try {
            await liveVideosAPI.update(session.id, {
                ...session,
                status: newStatus
            });
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: newStatus } : s));
        } catch (error: any) {
            console.error('Status toggle error:', error);
            alert(error.message || 'Failed to update session status.');
        } finally {
            setActionLoading(null);
            setOpenDropdownId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) return;
        setActionLoading(id);
        try {
            await liveVideosAPI.delete(id);
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (error: any) {
            console.error('Delete error:', error);
            alert(error.message || 'Failed to delete session. Please try again.');
        } finally {
            setActionLoading(null);
            setOpenDropdownId(null);
        }
    };

    const handleDuplicate = async (session: LiveSessionReal) => {
        setActionLoading(session.id);
        try {
            const { id, ...rest } = session as any;
            await liveVideosAPI.create({ ...rest, title: `${rest.title} (Copy)`, status: 'upcoming' });
            fetchData();
        } catch (error: any) {
            alert(error.message || 'Failed to duplicate session');
        } finally {
            setActionLoading(null);
            setOpenDropdownId(null);
        }
    };


    const handleEditSave = async () => {
        if (!editingSession) return;
        setActionLoading(editingSession.id);
        try {
            const uploadData = { ...editingSession };

            // Handle new file uploads
            const fileFields = ['pdf1', 'pdf2', 'studyMaterial'];
            for (const field of fileFields) {
                // @ts-ignore
                if (editingSession[field] instanceof File) {
                    // @ts-ignore
                    const result = await uploadAPI.uploadPDF(editingSession[field]);
                    // @ts-ignore
                    uploadData[`${field}Url`] = result.url;
                }
            }

            // Clean up raw files
            fileFields.forEach(f => delete (uploadData as any)[f]);

            // Resolve course name for the session
            const course = courses.find((c: any) => (c.id === editingSession.courseId || c._id === editingSession.courseId));
            if (course) {
                (uploadData as any).courseName = course.name || course.title;
            }

            await liveVideosAPI.update(editingSession.id, uploadData);
            await fetchData();
            setEditingSession(null);
        } catch (error: any) {
            alert(error.message || 'Failed to update session. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddLiveStream = async (data: any) => {
        try {
            const uploadData = { ...data };

            // Handle file uploads sequentially
            const fileFields = ['pdf1', 'pdf2', 'studyMaterial'];
            for (const field of fileFields) {
                if (data[field]) {
                    const result = await uploadAPI.uploadPDF(data[field]);
                    uploadData[`${field}Url`] = result.url;
                }
            }

            // Remove raw file objects before sending to metadata API
            fileFields.forEach(f => delete uploadData[f]);

            // Resolve course name for the new session
            const course = courses.find((c: any) => (c.id === data.courseId || c._id === data.courseId));

            // Mirror streamId → videoUrl so student player can resolve the stream URL
            if (uploadData.streamId && !uploadData.videoUrl) {
                uploadData.videoUrl = uploadData.streamId;
                uploadData.url = uploadData.streamId;
            }

            // Determine initial status based on scheduled time
            let initialStatus = 'upcoming';
            if (uploadData.scheduledTime) {
                const scheduled = new Date(uploadData.scheduledTime.replace(' ', 'T'));
                if (!isNaN(scheduled.getTime()) && scheduled <= new Date()) {
                    initialStatus = 'live';
                }
            }

            await liveVideosAPI.create({
                ...uploadData,
                courseName: course?.name || course?.title || 'General',
                status: initialStatus
            });
            setShowLiveStreamDrawer(false);
            fetchData();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to schedule live stream');
        }
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            const titleMatch = (session?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
            const idMatch = (session?.id || '').toLowerCase().includes(searchTerm.toLowerCase());
            const courseMatch = (session?.courseName || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesSearch = titleMatch || idMatch || courseMatch;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'live' ? session.status === 'live' : session.status !== 'live');
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, sessions, statusFilter]);

    const totalPages = Math.ceil(filteredSessions.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, filteredSessions.length);
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

    // Reset page when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, entriesPerPage]);

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
                        <button
                            onClick={() => setShowLiveStreamDrawer(true)}
                            className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-all shadow-md active:scale-95"
                        >
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
                                        {['CONTENT ID', 'TITLE', 'COURSE', 'LIVE ON', 'STATUS', 'ACTIONS'].map(h => (
                                            <th key={h} className="px-6 py-4 text-[11px] font-black text-[#9ca3af] uppercase tracking-[0.12em]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSessions.length > 0 ? paginatedSessions.map((session, idx) => (
                                        <tr key={session.id || idx} className="border-b border-[#f9fafb] last:border-0 hover:bg-[#fafafa] transition-colors">
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">{session.id.slice(-6).toUpperCase()}</td>
                                            <td className="px-6 py-5 text-[14px] font-bold text-[#111827]">{session.title}</td>
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">{session.courseName}</td>
                                            <td className="px-6 py-5 text-[14px] font-medium text-[#6b7280]">
                                                {session.scheduledTime ? session.scheduledTime.replace('T', ' ') : 'TBD'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${session.status === 'live' ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'live' ? 'bg-red-500' : 'bg-gray-400'}`} />
                                                    {session.status === 'live' ? 'Live Now' : 'Upcoming'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 relative">
                                                {/* Single Actions dropdown button */}
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdownId(openDropdownId === session.id ? null : session.id)}
                                                        disabled={!!actionLoading}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        Actions
                                                        <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                                    </button>
                                                    {openDropdownId === session.id && (
                                                        <div className="absolute right-0 top-[calc(100%+4px)] w-[180px] bg-white rounded-xl shadow-xl z-[300] border border-gray-100 py-1 animate-fade-in">
                                                            {/* Enable / Disable */}
                                                            <button
                                                                onClick={() => { handleGoLive(session); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-green-600">{session.status === 'live' ? 'pause_circle' : 'play_circle'}</span>
                                                                {session.status === 'live' ? 'Disable' : 'Enable'}
                                                            </button>
                                                            {/* Edit */}
                                                            <button
                                                                onClick={() => { setEditingSession({ ...session }); setOpenDropdownId(null); }}
                                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-indigo-600">edit</span>
                                                                Edit
                                                            </button>
                                                            {/* Duplicate */}
                                                            <button
                                                                onClick={() => handleDuplicate(session)}
                                                                disabled={actionLoading === session.id}
                                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 disabled:opacity-50"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-blue-600">content_copy</span>
                                                                Duplicate
                                                            </button>
                                                            {/* End Live Stream */}
                                                            {session.status === 'live' && (
                                                                <button
                                                                    onClick={() => { handleEndSession(session); setOpenDropdownId(null); }}
                                                                    disabled={actionLoading === session.id}
                                                                    className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2.5 disabled:opacity-50"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                                                                    End Live Stream
                                                                </button>
                                                            )}
                                                            <div className="h-px bg-gray-100 my-1" />
                                                            {/* Delete */}
                                                            <button
                                                                onClick={() => handleDelete(session.id)}
                                                                disabled={actionLoading === session.id}
                                                                className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50"
                                                            >
                                                                {actionLoading === session.id
                                                                    ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                                    : <span className="material-symbols-outlined text-[16px]">delete</span>}
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
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

                            {/* Standardized Pagination Footer */}
                            {!loading && filteredSessions.length > 0 && (
                                <div className="p-7 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex items-center group">
                                            <select
                                                value={entriesPerPage}
                                                onChange={(e) => {
                                                    setEntriesPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                                                expand_more
                                            </span>
                                        </div>
                                        <span className="text-[13px] font-medium text-gray-400 italic">
                                            Showing {startIndex + 1} to {endIndex} of {filteredSessions.length} entries
                                        </span>
                                    </div>

                                    <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                                        <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                                            {currentPage}
                                        </button>
                                        <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                            <FormLabel label="Stream Title" required />
                                            <FormInput
                                                value={editingSession.title}
                                                onChange={e => setEditingSession({ ...editingSession, title: e.target.value })}
                                                placeholder="Enter title"
                                            />
                                        </div>

                                        {/* Scheduled For */}
                                        <div className="space-y-2">
                                            <FormLabel label="Scheduled For" required />
                                            <FormInput
                                                type="datetime-local"
                                                value={editingSession.scheduledTime}
                                                onChange={e => setEditingSession({ ...editingSession, scheduledTime: e.target.value })}
                                            />
                                        </div>

                                        {/* Select Batch */}
                                        <div className="space-y-2">
                                            <FormLabel label="Select Batch" required />
                                            <FormSelect
                                                value={editingSession.courseId}
                                                onChange={val => setEditingSession({ ...editingSession, courseId: val })}
                                                options={[
                                                    { value: '', label: 'Select Batch' },
                                                    ...courses.map(c => ({ value: c.id || c._id, label: c.name || c.title }))
                                                ]}
                                            />
                                        </div>

                                        {/* Status Segmented Toggle */}
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

                                        {/* Additional Content / Files */}
                                        <div className="pt-2">
                                            <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-tight mb-6">Additional Content</h3>
                                            <div className="space-y-8">
                                                {['pdf1', 'pdf2', 'studyMaterial'].map((field) => {
                                                    const label = field === 'studyMaterial' ? 'Study Material' : 'Attach PDF';
                                                    const icon = field === 'studyMaterial' ? 'article' : 'picture_as_pdf';
                                                    // @ts-ignore
                                                    const file = editingSession[field];
                                                    // @ts-ignore
                                                    const existingUrl = editingSession[`${field}Url`];

                                                    return (
                                                        <div key={field} className="space-y-3">
                                                            <FormLabel label={label} />
                                                            <div className="grid grid-cols-[130px_1fr] gap-4 items-start">
                                                                <div className="h-[130px] bg-[#ececec] rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all">
                                                                    <span className={`material-symbols-outlined text-[36px] mb-3 ${(file || existingUrl) ? 'text-blue-600' : 'text-gray-500'}`}>
                                                                        {file ? 'description' : 'unknown_document'}
                                                                    </span>
                                                                    <span className="text-[14px] font-bold text-gray-700 truncate w-full">
                                                                        {file ? file.name : existingUrl ? 'Existing File' : field === 'studyMaterial' ? 'No File' : 'No PDF'}
                                                                    </span>
                                                                    {existingUrl && !file && (
                                                                        <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-bold mt-1.5 hover:underline decoration-2">View File</a>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    onClick={() => {
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.accept = '.pdf';
                                                                        input.onchange = (e) => {
                                                                            const f = (e.target as HTMLInputElement).files?.[0];
                                                                            if (f) setEditingSession({ ...editingSession, [field]: f });
                                                                        };
                                                                        input.click();
                                                                    }}
                                                                    className="h-[130px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group"
                                                                >
                                                                    <div className="w-10 h-10 bg-[#f8fafc] rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                                        <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-blue-600">upload_file</span>
                                                                    </div>
                                                                    <h4 className="text-[13px] font-bold text-gray-400 group-hover:text-gray-900 tracking-tight">
                                                                        {field === 'studyMaterial' ? 'Upload File' : 'Upload PDF'}
                                                                    </h4>
                                                                    <span className="text-[9px] font-medium text-gray-300 text-center leading-tight mt-0.5">Click or Drag & Drop your file here.</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-10 flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setEditingSession(null)}
                                                className="flex-1 h-[56px] bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-100 transition-all active:scale-[0.98]"
                                            >
                                                DISCARD
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleEditSave}
                                                disabled={actionLoading === editingSession.id}
                                                className={`flex-[1.8] h-[56px] rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-lg shadow-gray-200 ${actionLoading === editingSession.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                                            >
                                                {actionLoading === editingSession.id ? (
                                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                                                ) : "SAVE CHANGES"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DrawerBody>
                    </>
                )}
            </RightSideDrawer>

            <LiveStreamDrawer
                isOpen={showLiveStreamDrawer}
                onClose={() => setShowLiveStreamDrawer(false)}
                onSubmit={handleAddLiveStream}
                courses={courses}
                subjects={subjects}
            />

            <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24; }`}</style>
        </div>
    );
};

export default LiveSessions;

