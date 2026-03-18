import React, { useState, useMemo, useEffect, useRef } from 'react';
import { studentsAPI } from '../../services/apiClient';

interface ForumEntry {
    id: string;
    user: string;
    email: string;
    postedOn: string;
    avatarBg: string;
    status: string;
}

interface ForumManagerProps {
    courseId?: string;
    showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const ForumManager: React.FC<ForumManagerProps> = ({ courseId, showToast }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [discussions, setDiscussions] = useState<ForumEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const menuRef = useRef<HTMLDivElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    const colors = [
        'bg-blue-400', 'bg-purple-400', 'bg-orange-200',
        'bg-red-300', 'bg-blue-300', 'bg-purple-200',
        'bg-green-300', 'bg-yellow-400', 'bg-pink-300'
    ];

    useEffect(() => {
        fetchData();
    }, [courseId]);

    // Close menu and filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(null);
            }
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const students = await studentsAPI.getAll();

            const filteredByCourse = courseId
                ? students.filter((s: any) => s.enrolledCourses && s.enrolledCourses.includes(courseId))
                : students;

            const mapped: ForumEntry[] = filteredByCourse.map((student: any, idx: number) => ({
                id: student.id || student._id,
                user: student.name || student.email || 'Unknown User',
                email: student.email || '',
                status: student.status || 'active',
                postedOn: student.createdAt ? new Date(student.createdAt).toLocaleString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }) : 'Recently',
                avatarBg: colors[idx % colors.length]
            }));

            setDiscussions(mapped);
        } catch (error) {
            console.error('Failed to fetch forum data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ✉️ Email button - opens Gmail compose with user's email
    const handleEmailUser = (entry: ForumEntry) => {
        if (!entry.email) {
            showToast?.('No email found for this user.', 'error');
            return;
        }
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(entry.email)}`;
        window.open(gmailUrl, '_blank');
    };

    // 🚫 Block/Unblock button - updates student status in DB (inactive = can't login)
    const handleBlockUser = async (entry: ForumEntry) => {
        setActionLoading(entry.id);
        try {
            const isBlocked = entry.status === 'inactive';
            const newStatus = isBlocked ? 'active' : 'inactive';

            // Fetch full student data first, then update status
            const fullStudent = await studentsAPI.getById(entry.id);
            await studentsAPI.update(entry.id, { ...fullStudent, status: newStatus });

            // Update local state
            setDiscussions(prev => prev.map(d =>
                d.id === entry.id ? { ...d, status: newStatus } : d
            ));

            showToast?.(
                isBlocked
                    ? `${entry.user} has been unblocked. Login access restored.`
                    : `${entry.user} has been blocked. Login access revoked.`,
                'success'
            );
        } catch (error) {
            console.error('Block/unblock error:', error);
            showToast?.('Action failed. Please try again.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // 🗑️ Delete button - permanently deletes user from database
    const handleDeleteUser = async (entry: ForumEntry) => {
        setMenuOpen(null);
        if (!confirm(`Are you sure you want to delete "${entry.user}"?\nThis action cannot be undone.`)) return;

        setActionLoading(entry.id);
        try {
            await studentsAPI.delete(entry.id);
            setDiscussions(prev => prev.filter(d => d.id !== entry.id));
            showToast?.(`${entry.user} has been deleted successfully.`, 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showToast?.('Delete failed. Please try again.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredDiscussions = useMemo(() => {
        return discussions.filter(d => {
            const matchesSearch = d.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, filterStatus, discussions]);

    return (
        <div className="bg-[#fafafa] min-h-screen" onClick={() => setMenuOpen(null)}>
            <div className="pt-2 px-6 pb-6 space-y-6">
                {/* HEADER & CONTROLS */}
                <div className="flex justify-between items-center px-1">
                    <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Forum</h1>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] font-medium group-focus-within:text-gray-600">search</span>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-5 py-2.5 w-[280px] bg-white border border-[#e5e7eb] rounded-full text-[14px] font-medium outline-none focus:border-indigo-400 focus:ring-0 transition-all placeholder:text-gray-400 shadow-sm"
                            />
                        </div>

                        <div className="relative" ref={filterDropdownRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-[14px] font-bold transition-all shadow-sm ${isFilterOpen || filterStatus !== 'all'
                                        ? 'bg-navy text-white border-navy'
                                        : 'bg-white text-gray-600 border-[#e5e7eb] hover:bg-gray-50'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[19px]">filter_list</span>
                                Filters
                                {filterStatus !== 'all' && (
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                )}
                            </button>

                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Users</h4>
                                        <button
                                            onClick={() => setFilterStatus('all')}
                                            className="text-[10px] font-bold text-blue-600 hover:underline"
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Account Status</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['all', 'active', 'inactive'].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => { setFilterStatus(s); setIsFilterOpen(false); }}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterStatus === s ? 'bg-navy text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-50">
                                        <p className="text-[10px] text-gray-400 text-center">{filteredDiscussions.length} users found</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* DISCUSSIONS LIST */}
                <div className="bg-white rounded-[16px] border border-[#f3f4f6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
                            <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Loading discussions...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#f9fafb]">
                            {filteredDiscussions.map((discussion) => {
                                const isBlocked = discussion.status === 'inactive';
                                const isLoading = actionLoading === discussion.id;

                                return (
                                    <div
                                        key={discussion.id}
                                        className={`p-6 flex items-center justify-between hover:bg-[#fafafa] transition-colors group ${isBlocked ? 'opacity-60' : ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-5">
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 rounded-full ${discussion.avatarBg} flex items-center justify-center text-white shadow-inner relative`}>
                                                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                                {isBlocked && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[12px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[15px] font-bold text-[#111827]">{discussion.user}</h3>
                                                    {isBlocked && (
                                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Blocked</span>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-gray-400 font-medium">{discussion.email}</p>
                                                <div className="flex items-center gap-2 text-[#9ca3af] text-[12px] font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        <span>Posted on {discussion.postedOn}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>

                                            {/* ✉️ Email Button - Opens Gmail with user's email */}
                                            <button
                                                title={`Send email to: ${discussion.email || 'No email available'}`}
                                                onClick={() => handleEmailUser(discussion)}
                                                disabled={!discussion.email || isLoading}
                                                className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                                            </button>

                                            {/* 🚫 Block/Unblock Button - Updates status in DB */}
                                            <button
                                                title={isBlocked ? `Unblock ${discussion.user} (Restore login access)` : `Block ${discussion.user} (Revoke login access)`}
                                                onClick={() => handleBlockUser(discussion)}
                                                disabled={isLoading}
                                                className={`p-2.5 rounded-xl transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${isBlocked
                                                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                                                    }`}
                                            >
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>do_not_disturb_on</span>
                                                )}
                                            </button>

                                            {/* ⋮ Three Dot Menu */}
                                            <div className="relative" ref={menuOpen === discussion.id ? menuRef : null}>
                                                <button
                                                    title="More options"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpen(menuOpen === discussion.id ? null : discussion.id);
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-all ${menuOpen === discussion.id
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[22px]">more_vert</span>
                                                </button>

                                                {/* Dropdown Menu */}
                                                {menuOpen === discussion.id && (
                                                    <div
                                                        className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="p-2">
                                                            {/* Delete option only */}
                                                            <button
                                                                onClick={() => handleDeleteUser(discussion)}
                                                                disabled={isLoading}
                                                                className="w-full px-3 py-2.5 text-left text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors disabled:opacity-50"
                                                            >
                                                                <span className="w-8 h-8 bg-red-100 text-red-500 rounded-lg flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
                                                                </span>
                                                                Delete User
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredDiscussions.length === 0 && !loading && (
                                <div className="py-20 text-center">
                                    <span className="material-symbols-outlined text-[48px] text-gray-200 mb-2 font-thin">forum</span>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">No discussions found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .material-symbols-outlined {
                    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
                }
            `}</style>
        </div>
    );
};

export default ForumManager;

