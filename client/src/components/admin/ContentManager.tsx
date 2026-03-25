import React, { useState, useEffect, useMemo, useRef } from 'react';
import { videosAPI, pdfsAPI, testsAPI, coursesAPI, liveVideosAPI, subjectsAPI, uploadAPI } from '../../services/apiClient';
import { VideoDrawer, UploadDrawer } from './FeatureDrawers';
import {
    RightSideDrawer,
    DrawerBody,
    DrawerHeader,
    DrawerFooter,
    UploadArea,
    FilePreviewItem
} from './DrawerSystem';

const BigActionTile: React.FC<{ icon: string; label: string; desc?: string; onClick: () => void; color?: string }> = ({ icon, label, onClick, color = 'bg-blue-50 text-blue-600' }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center text-center p-6 rounded-[2.5rem] bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-300 group active:scale-[0.97] h-full min-h-[140px]"
    >
        <div className={`w-14 h-14 ${color.split(' ')[0]} rounded-2xl flex items-center justify-center mb-4 group-hover:-translate-y-1.5 transition-transform duration-500 shadow-sm relative overflow-hidden`}>
            <div className={`absolute inset-0 opacity-20 bg-white`}></div>
            <span className={`material-symbols-outlined text-[28px] ${color.split(' ')[1]} relative z-10 drop-shadow-sm`}>{icon}</span>
        </div>
        <h4 className="text-[12px] font-black text-slate-800 tracking-tight uppercase tracking-[0.1em]">{label}</h4>
    </button>
);

interface ContentItem {
    id: string;
    _id?: string;
    title: string;
    courseId: string;
    courseName?: string;
    type: string;
    createdAt: string;
    duration?: string;
    raw?: any;
}

interface Props {
    mode?: 'all' | 'free' | 'demo';
}

const ContentManager: React.FC<Props> = ({ mode = 'all' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [content, setContent] = useState<ContentItem[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editIsFree, setEditIsFree] = useState(false);
    const [editIsDemo, setEditIsDemo] = useState(false);
    const [editLink, setEditLink] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [selectedEditFile, setSelectedEditFile] = useState<File | null>(null);
    const [editCourseId, setEditCourseId] = useState('');
    const [editSubjectId, setEditSubjectId] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isVideoDrawerOpen, setIsVideoDrawerOpen] = useState(false);
    const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [isPDFDrawerOpen, setIsPDFDrawerOpen] = useState(false);
    const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
    const [showActionDrawer, setShowActionDrawer] = useState(false);
    const [selectedItemForAction, setSelectedItemForAction] = useState<ContentItem | null>(null);
    const [showOverviewDrawer, setShowOverviewDrawer] = useState(false);
    const bulkDropdownRef = useRef<HTMLDivElement>(null);

    const handleAddClick = () => {
        if (mode === 'demo') {
            setShowTypeSelector(true);
        } else if (mode === 'free') {
            setShowTypeSelector(true);
        } else {
            setIsVideoDrawerOpen(true);
        }
    };

    const handleBulkUploadClick = () => {
        setIsVideoDrawerOpen(true);
    };

    const handleAddVideoSubmit = async (data: any) => {
        if ((window as any)._addingLive) {
            await handleAddLive(data);
            (window as any)._addingLive = false;
        } else {
            await handleAddVideo(data);
        }
    };

    const handleAddVideo = async (data: any) => {
        try {
            if (Array.isArray(data)) {
                // Legacy bulk upload (just files)
                for (const file of data) {
                    const uploadRes = await uploadAPI.upload(file);
                    await videosAPI.create({
                        title: file.name,
                        url: uploadRes.url,
                        link: uploadRes.url,
                        isFree: mode === 'free' || mode === 'demo',
                        isDemo: mode === 'demo',
                        status: mode === 'free' || mode === 'demo' ? 'Free' : 'Paid',
                        courseId: courseFilter !== 'all' ? courseFilter : ''
                    });
                }
            } else if (data.files && Array.isArray(data.files)) {
                // Bulk upload with metadata from drawer
                for (const file of data.files) {
                    const uploadRes = await uploadAPI.upload(file);
                    await videosAPI.create({
                        title: file.name,
                        url: uploadRes.url,
                        link: uploadRes.url,
                        isFree: mode === 'free' || mode === 'demo' || data.status === 'Free',
                        isDemo: mode === 'demo' || data.isDemo,
                        status: data.status || (mode === 'free' || mode === 'demo' ? 'Free' : 'Paid'),
                        courseId: data.courseId || (courseFilter !== 'all' ? courseFilter : ''),
                        subjectId: data.subjectId || ''
                    });
                }
            } else {
                // Single video with metadata
                let finalUrl = data.url || data.link;
                if (data.file && data.file instanceof File) {
                    const uploadRes = await uploadAPI.upload(data.file);
                    finalUrl = uploadRes.url;
                }
                await videosAPI.create({
                    ...data,
                    url: finalUrl,
                    link: finalUrl,
                    isFree: mode === 'free' || mode === 'demo' || data.status === 'Free',
                    isDemo: mode === 'demo' || data.isDemo,
                    status: data.status || (mode === 'free' || mode === 'demo' ? 'Free' : 'Paid'),
                    courseId: data.courseId || (courseFilter !== 'all' ? courseFilter : ''),
                    subjectId: data.subjectId || ''
                });
            }
            fetchData();
            setIsVideoDrawerOpen(false);
        } catch (error) {
            console.error(error);
            alert('Video upload failed');
        }
    };

    const handleAddPDF = async (data: any) => {
        try {
            if (Array.isArray(data)) {
                for (const file of data) {
                    const uploadRes = await uploadAPI.upload(file);
                    await pdfsAPI.create({
                        title: file.name,
                        fileUrl: uploadRes.url,
                        isFree: mode === 'free',
                        isDemo: mode === 'demo',
                        courseId: courseFilter !== 'all' ? courseFilter : ''
                    });
                }
            } else if (data.file && data.file instanceof File) {
                const uploadRes = await uploadAPI.upload(data.file);
                await pdfsAPI.create({
                    ...data,
                    fileUrl: uploadRes.url,
                    isFree: mode === 'free' || data.isFree,
                    isDemo: mode === 'demo' || data.isDemo,
                    courseId: data.courseId || (courseFilter !== 'all' ? courseFilter : '')
                });
            }
            fetchData();
            setIsPDFDrawerOpen(false);
        } catch (error) {
            console.error(error);
            alert('PDF upload failed');
        }
    };

    const handleAddTest = async (testData: any) => {
        try {
            await testsAPI.create({
                ...testData,
                isFree: mode === 'free',
                isDemo: mode === 'demo',
                courseId: courseFilter !== 'all' ? courseFilter : ''
            });
            fetchData();
            setIsTestDrawerOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddLive = async (data: any) => {
        try {
            await liveVideosAPI.create({
                ...data,
                isFree: mode === 'free',
                isDemo: mode === 'demo',
                status: mode === 'free' ? 'Free' : (data.status || 'Paid'),
                courseId: data.courseId || (courseFilter !== 'all' ? courseFilter : ''),
                subjectId: data.subjectId || ''
            });
            fetchData();
            setIsVideoDrawerOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        setIsPlaying(false);
        setVideoError(null);
        if (selectedItem) {
            console.log('--- CONTENT DEBUG ---');
            console.log('Item:', selectedItem.title);
            console.log('Type:', selectedItem.type);
            console.log('Raw Data:', selectedItem.raw);
            console.log('---------------------');
        }
    }, [selectedItem]);

    useEffect(() => {
        const init = async () => {
            await fetchCourses();
            await fetchSubjects();
            await fetchData();
        };
        init();
    }, []);

    const fetchSubjects = async () => {
        try {
            const data = await subjectsAPI.getAll();
            setSubjects(Array.isArray(data) ? data : (data?.data || []));
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCourses = async () => {
        try {
            const data = await coursesAPI.getAll();
            setCourses(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [videosData, pdfsData, testsData, coursesData, liveVideosData] = await Promise.all([
                videosAPI.getAll(),
                pdfsAPI.getAll(),
                testsAPI.getAll(),
                coursesAPI.getAll(),
                liveVideosAPI.getAll()
            ]);

            const flatContent: ContentItem[] = [];

            const getCourseName = (courseId: string) => {
                const course = coursesData.find((c: any) => (c.id === courseId || c._id === courseId));
                return course?.name || course?.title || 'General';
            };

            if (Array.isArray(videosData)) {
                videosData.forEach((v: any) => {
                    flatContent.push({
                        id: v.id || v._id || 'V' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                        title: v.title || v.name || 'Untitled Video',
                        courseId: v.courseId || '',
                        courseName: getCourseName(v.courseId),
                        type: 'Recorded',
                        createdAt: v.createdAt || new Date().toISOString(),
                        duration: v.duration ? (v.duration + ' mins') : undefined,
                        raw: v
                    });
                });
            }

            if (Array.isArray(liveVideosData)) {
                liveVideosData.forEach((lv: any) => {
                    flatContent.push({
                        id: lv.id || lv._id || 'L' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                        title: lv.title || lv.name || 'Live Session',
                        courseId: lv.courseId || '',
                        courseName: getCourseName(lv.courseId),
                        type: 'Live',
                        createdAt: lv.createdAt || new Date().toISOString(),
                        duration: 'Live Now',
                        raw: lv
                    });
                });
            }

            if (Array.isArray(pdfsData)) {
                pdfsData.forEach((p: any) => {
                    flatContent.push({
                        id: p.id || p._id || 'P' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                        title: p.title || p.name || 'Untitled Document',
                        courseId: p.courseId || '',
                        courseName: getCourseName(p.courseId),
                        type: 'PDF',
                        createdAt: p.createdAt || new Date().toISOString(),
                        duration: p.pages ? (p.pages + ' pages') : undefined,
                        raw: p
                    });
                });
            }

            if (Array.isArray(testsData)) {
                testsData.forEach((t: any) => {
                    flatContent.push({
                        id: t.id || t._id || 'T' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                        title: t.title || t.name || 'Untitled Test',
                        courseId: t.courseId || '',
                        courseName: getCourseName(t.courseId),
                        type: 'Test',
                        createdAt: t.createdAt || new Date().toISOString(),
                        duration: t.duration ? (t.duration + ' mins') : (t.questions?.length ? (t.questions.length + ' Qs') : undefined),
                        raw: t
                    });
                });
            }

            flatContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setContent(flatContent);
        } catch (error) {
            console.error('Failed to fetch content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteItem = async (item: ContentItem) => {
        if (!confirm(`Are you sure you want to delete "${item.title}"? This cannot be undone.`)) return;
        setActionLoading(item.id);
        try {
            if (item.type === 'PDF') await pdfsAPI.delete(item.id);
            else if (item.type === 'Test') await testsAPI.delete(item.id);
            else if (item.type === 'Live') await liveVideosAPI.delete(item.id);
            else await videosAPI.delete(item.id);
            setContent(prev => prev.filter(c => c.id !== item.id));
        } catch (error) {
            alert('Failed to delete item. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditSave = async () => {
        if (!editingItem) return;
        setActionLoading(editingItem.id);
        try {
            let finalUrl = editLink;

            if (selectedEditFile) {
                const uploadRes = await uploadAPI.upload(selectedEditFile);
                finalUrl = uploadRes.url;
            }

            const updated = {
                ...editingItem.raw,
                title: editTitle,
                isFree: editIsFree,
                isDemo: editIsDemo,
                courseId: editCourseId,
                subjectId: editSubjectId,
                description: editDescription,
                duration: editDuration,
                pages: editDuration // PDF uses pages, others use duration
            };

            if (editingItem.type === 'PDF') updated.fileUrl = finalUrl;
            else updated.url = finalUrl;

            if (editingItem.type === 'PDF') await pdfsAPI.update(editingItem.id, updated);
            else if (editingItem.type === 'Test') await testsAPI.update(editingItem.id, updated);
            else if (editingItem.type === 'Live') await liveVideosAPI.update(editingItem.id, updated);
            else await videosAPI.update(editingItem.id, updated);

            setContent(prev => prev.map(c => c.id === editingItem.id ? {
                ...c,
                title: editTitle,
                courseId: editCourseId,
                duration: editingItem.type === 'PDF' ? `${editDuration} pages` : `${editDuration} mins`,
                courseName: courses.find(cr => (cr.id === editCourseId || cr._id === editCourseId))?.name || 'General',
                raw: updated
            } : c));
            setEditingItem(null);
            setSelectedEditFile(null);
        } catch (error) {
            console.error(error);
            alert('Failed to update item. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
            if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target as Node)) {
                setIsBulkDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredContent = useMemo(() => {
        return content.filter(item => {
            const matchesSearch = !searchTerm ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id.toString().toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'all' || item.type === typeFilter;

            const matchesCourse = courseFilter === 'all' ||
                item.courseId === courseFilter ||
                item.courseName === courseFilter;

            const isActuallyFree = item.raw?.status === 'Free' || item.raw?.isFree === true || item.raw?.isFree === 'true' || item.raw?.isFree === 1;
            const isActuallyDemo = item.raw?.isDemo === true || item.raw?.isDemo === 'true' || item.raw?.isDemo === 1;

            const matchesMode = mode === 'all' ||
                (mode === 'free' && isActuallyFree && !isActuallyDemo) ||
                (mode === 'demo' && isActuallyDemo);

            const isVideo = item.type === 'Recorded' || item.type === 'Live';
            const matchesStrictType = mode === 'demo' ? isVideo : true;

            return matchesSearch && matchesType && matchesCourse && matchesMode && matchesStrictType;
        });
    }, [searchTerm, typeFilter, courseFilter, content, mode]);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).replace(',', ' at');
        } catch (e) {
            return dateStr;
        }
    };

    const handleDuplicate = async (item: ContentItem) => {
        setActionLoading(item.id);
        try {
            const duplicateData = {
                ...item.raw,
                title: `${item.title} (Copy)`,
                id: undefined,
                _id: undefined
            };
            if (item.type === 'PDF') await pdfsAPI.create(duplicateData);
            else if (item.type === 'Test') await testsAPI.create(duplicateData);
            else if (item.type === 'Live') await liveVideosAPI.create(duplicateData);
            else await videosAPI.create(duplicateData);
            fetchData();
        } catch (error) {
            alert('Failed to duplicate item.');
        } finally {
            setActionLoading(null);
        }
    };

    const getTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'Recorded': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'Live': return 'bg-red-50 text-red-600 border-red-100';
            case 'PDF': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Test': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    if (showOverviewDrawer && selectedItem) {
        return (
            <RightSideDrawer isOpen={showOverviewDrawer} onClose={() => { setShowOverviewDrawer(false); setSelectedItem(null); }}>
                <DrawerHeader
                    title="Content Overview"
                    onClose={() => { setShowOverviewDrawer(false); setSelectedItem(null); }}
                />
                <DrawerBody className="pb-10 bg-[#f8fafc]/50">
                    <div className="space-y-6 pt-2">
                        {/* Banner Card - Pixel UI Style */}
                        <div className="relative group overflow-hidden">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-[#0f172a] p-8 rounded-[2.5rem] text-white shadow-2xl transition-all duration-300">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-white/5 rounded-[1.25rem] flex items-center justify-center mb-6 backdrop-blur-xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-white text-[32px] drop-shadow-lg">
                                            {selectedItem.type === 'Recorded' ? 'videocam' :
                                                selectedItem.type === 'PDF' ? 'description' :
                                                    selectedItem.type === 'Test' ? 'quiz' : 'sensors'}
                                        </span>
                                    </div>
                                    <h2 className="text-[26px] font-black text-white leading-[1.1] tracking-tight mb-4">{selectedItem.title}</h2>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.15em] bg-white/10 border border-white/10 backdrop-blur-md">
                                            {selectedItem.type}
                                        </span>
                                        {selectedItem.raw?.isFree && (
                                            <span className="text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.15em] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                                                Free Access
                                            </span>
                                        )}
                                        {selectedItem.raw?.isDemo && (
                                            <span className="text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.15em] bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                                                Demo Stream
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Widgets */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px] text-indigo-500">schedule</span>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 font-black uppercase tracking-[0.1em]">Duration</p>
                                </div>
                                <p className="text-[20px] font-black text-slate-900 leading-none">{selectedItem.duration || 'N/A'}</p>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px] text-blue-500">category</span>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 font-black uppercase tracking-[0.1em]">Product</p>
                                </div>
                                <p className="text-[16px] font-black text-slate-900 leading-tight line-clamp-1">{selectedItem.courseName}</p>
                            </div>
                        </div>

                        {/* Preview Section - Pixel UI Style */}
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Resource Preview</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-300">HD QUALITY</span>
                            </div>
                            <div className="rounded-[1.5rem] overflow-hidden bg-[#0f172a] aspect-video flex items-center justify-center relative group cursor-pointer shadow-inner">
                                {isPlaying ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                                        <div className="w-12 h-12 border-4 border-white/10 border-t-white/60 rounded-full animate-spin mb-4"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Connecting Stream...</p>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                        <div className="absolute inset-0 bg-slate-400/5 mix-blend-overlay"></div>

                                        <button
                                            onClick={() => setIsPlaying(true)}
                                            className="w-16 h-16 bg-white text-slate-950 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_70px_rgba(255,255,255,0.5)] z-10"
                                        >
                                            <span className="material-symbols-outlined text-[32px] fill-current">play_arrow</span>
                                        </button>

                                        <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Source Ready</p>
                                                <p className="text-[12px] font-bold text-white leading-none">Content_Stream_{selectedItem.id.slice(-4)}.mp4</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-white/40">00:00 / --:--</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Info & Actions */}
                        <div className="pt-2 px-2 flex flex-col gap-4">
                            <div className="flex items-center justify-center gap-8 py-4 bg-slate-50 border border-slate-100 rounded-3xl">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created</p>
                                    <p className="text-[12px] font-black text-slate-600">{formatDate(selectedItem.createdAt).split(' at ')[0]}</p>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-[12px] font-black text-emerald-500">ACTIVE</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const url = selectedItem.raw?.url || selectedItem.raw?.fileUrl || selectedItem.raw?.link;
                                    if (url) window.open(url, '_blank')
                                }}
                                className="group relative w-full h-16 bg-slate-900 overflow-hidden rounded-[2rem] transition-all hover:bg-black active:scale-[0.98] shadow-xl shadow-slate-200"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative flex items-center justify-center gap-3 text-white">
                                    <span className="text-[11px] font-black uppercase tracking-[0.25em]">Launch Resource</span>
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </RightSideDrawer>
        );
    }

    return (
        <div className="bg-[#fafafa] min-h-screen">
            <div className="pt-0 px-6 pb-10 space-y-4">
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section Matches Packages.tsx */}
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 bg-white">
                        <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">
                            {mode === 'demo' ? 'Demo Content' : mode === 'free' ? 'Free Content' : 'Content Explorer'}
                        </h1>

                        <div className="flex items-center gap-3">
                            <div className="relative group flex-1 md:flex-none">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-navy transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Search title or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full md:w-[280px] pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy focus:ring-4 focus:ring-navy/5 transition-all shadow-sm placeholder:text-gray-400"
                                />
                            </div>

                            <div className="relative" ref={filterDropdownRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterOpen || typeFilter !== 'all' || courseFilter !== 'all' ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">tune</span>
                                    {typeFilter === 'all' && courseFilter === 'all' ? 'Advanced Filters' : 'Filters Active'}
                                    {(typeFilter !== 'all' || courseFilter !== 'all') && (
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                    )}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-6 animate-in fade-in zoom-in duration-200">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Content</h4>
                                            <button onClick={() => { setTypeFilter('all'); setCourseFilter('all'); }} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Type</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['all', 'Recorded', 'Live', 'PDF', 'Test'].map((type) => (
                                                        <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${typeFilter === type ? 'bg-navy text-white' : 'bg-gray-50 text-gray-500'}`}>{type}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Course</label>
                                                <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold">
                                                    <option value="all">All Products</option>
                                                    {courses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name || c.title}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {mode !== 'all' && (
                                <button
                                    onClick={() => handleAddClick()}
                                    className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[24px]">add</span>
                                </button>
                            )}

                            <div className="relative" ref={bulkDropdownRef}>
                                <button
                                    onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-transparent hover:border-gray-200 transition-all"
                                >
                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                </button>

                                {isBulkDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={() => { setIsBulkDropdownOpen(false); handleBulkUploadClick(); }}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all line-clamp-1"
                                        >
                                            <span className="material-symbols-outlined text-[20px] opacity-70">upload_file</span>
                                            Bulk Upload
                                        </button>
                                        <button
                                            onClick={() => { setIsBulkDropdownOpen(false); fetchData(); }}
                                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[20px] opacity-70">refresh</span>
                                            Refresh List
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 border-4 border-gray-100 border-t-navy rounded-full animate-spin"></div>
                                <p className="text-[12px] font-black text-gray-300 uppercase tracking-[0.2em]">Synchronizing Data...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/10 border-b border-gray-100">
                                        <th className="pl-8 pr-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">S. NO.</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">TITLE</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">PRODUCT</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">DATE</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContent.length > 0 ? (
                                        filteredContent.map((item, idx) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-blue-50/5 transition-colors group border-b border-gray-50 last:border-0"
                                            >
                                                <td className="pl-8 pr-4 py-8 text-[13px] font-bold text-gray-400">{filteredContent.length - idx}</td>
                                                <td className="px-6 py-8">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[14px] font-bold text-gray-900 group-hover:text-black transition-colors uppercase tracking-tight">{item.title}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${getTypeBadgeColor(item.type)}`}>
                                                                {item.type}
                                                            </span>
                                                            {(() => {
                                                                const itIsFree = item.raw?.status === 'Free' || item.raw?.isFree === true || item.raw?.isFree === 'true' || item.raw?.isFree === 1;
                                                                const itIsDemo = item.raw?.isDemo === true || item.raw?.isDemo === 'true' || item.raw?.isDemo === 1;

                                                                return (
                                                                    <div className="flex gap-2">
                                                                        {itIsDemo && (
                                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                                                                DEMO
                                                                            </span>
                                                                        )}
                                                                        {itIsFree && (
                                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                                                                FREE
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-8 text-[13px] font-semibold text-gray-500/80">{item.courseName}</td>
                                                <td className="px-6 py-8 text-[13px] font-medium text-gray-400">{formatDate(item.createdAt)}</td>
                                                <td className="px-6 py-8 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItemForAction(item);
                                                            setShowActionDrawer(true);
                                                        }}
                                                        className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all inline-flex items-center gap-2 shadow-sm"
                                                    >
                                                        Actions
                                                        <span className="material-symbols-outlined text-[18px] text-gray-400">expand_more</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-32 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-gray-200 text-4xl">folder_off</span>
                                                    </div>
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[12px]">No matching content found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Action Drawer */}
            <RightSideDrawer isOpen={showActionDrawer} onClose={() => setShowActionDrawer(false)}>
                {selectedItemForAction && (
                    <>
                        <DrawerHeader title="Content Actions" onClose={() => setShowActionDrawer(false)} />
                        <DrawerBody className="pb-10 bg-[#f8fafc]/50">
                            <div className="space-y-4 pt-2">
                                {/* Simplified Identity Card */}
                                <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 mb-4">
                                    <h3 className="text-[16px] font-black text-slate-800 truncate mb-1">{selectedItemForAction.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md uppercase tracking-wider">{selectedItemForAction.type}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Resource</span>
                                    </div>
                                </div>

                                {/* Minimalist Action List */}
                                <div className="space-y-2">
                                    {[
                                        {
                                            icon: 'edit_square',
                                            label: 'Edit Content',
                                            color: 'text-blue-600',
                                            bg: 'hover:bg-blue-50/50',
                                            onClick: () => {
                                                setShowActionDrawer(false);
                                                setEditingItem(selectedItemForAction);
                                                setEditTitle(selectedItemForAction.title);
                                                setEditIsFree(selectedItemForAction.raw?.isFree === true || selectedItemForAction.raw?.isFree === 'true' || selectedItemForAction.raw?.isFree === 1);
                                                setEditIsDemo(selectedItemForAction.raw?.isDemo === true || selectedItemForAction.raw?.isDemo === 'true' || selectedItemForAction.raw?.isDemo === 1);
                                                setEditLink(selectedItemForAction.raw?.url || selectedItemForAction.raw?.fileUrl || selectedItemForAction.raw?.link || '');
                                                setEditCourseId(selectedItemForAction.raw?.courseId || '');
                                                setEditSubjectId(selectedItemForAction.raw?.subjectId || '');
                                                setEditDescription(selectedItemForAction.raw?.description || '');
                                                setEditDuration(selectedItemForAction.raw?.duration || selectedItemForAction.raw?.pages || '');
                                                setSelectedEditFile(null);
                                            }
                                        },
                                        { icon: 'delete_outline', label: 'Delete Forever', color: 'text-red-600', bg: 'hover:bg-red-50/50', onClick: () => { setShowActionDrawer(false); handleDeleteItem(selectedItemForAction); } },
                                    ].map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={action.onClick}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border border-transparent ${action.bg} active:scale-[0.99] group`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                                                <span className={`material-symbols-outlined text-[20px] ${action.color}`}>{action.icon}</span>
                                            </div>
                                            <span className="text-[13px] font-bold text-slate-700">{action.label}</span>
                                            <span className="material-symbols-outlined ml-auto text-[18px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={() => setShowActionDrawer(false)}
                                        className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </DrawerBody>
                    </>
                )}
            </RightSideDrawer>

            {/* Edit Drawer Integration */}
            <RightSideDrawer isOpen={!!editingItem} onClose={() => setEditingItem(null)}>
                {editingItem && (
                    <>
                        <DrawerHeader title="Edit Content" onClose={() => setEditingItem(null)} />
                        <DrawerBody className="pb-10">
                            <div className="space-y-6 pt-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Content Title</label>
                                    <input
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-50 transition-all shadow-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Content Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Enter content details..."
                                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-50 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Source Material Section - Now shown for all types including Tests */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Source Material</label>
                                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase">Change Link or Upload File</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">link</span>
                                            <input
                                                value={editLink}
                                                onChange={(e) => setEditLink(e.target.value)}
                                                placeholder="Existing URL / Cloud Link"
                                                className="w-full bg-gray-50 border border-gray-100 pl-11 pr-4 py-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="py-2">
                                            <div className="relative border-2 border-dashed border-gray-100 rounded-3xl p-6 bg-[#fafafa]/50 hover:bg-gray-50 hover:border-blue-200 transition-all cursor-pointer">
                                                {!selectedEditFile ? (
                                                    <UploadArea
                                                        title="Replace File"
                                                        subtitle={`Select new file (${editingItem.type === 'Recorded' || editingItem.type === 'Live' ? 'Video' : 'PDF/DOC/Table'})`}
                                                        onFileSelect={(file) => setSelectedEditFile(file)}
                                                        accept={editingItem.type === 'Recorded' || editingItem.type === 'Live' ? "video/*" : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"}
                                                        className="!h-[140px] border-none bg-transparent !p-0"
                                                    />
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider">File Selected</span>
                                                            <button onClick={() => setSelectedEditFile(null)} className="text-[10px] font-bold text-red-500 hover:underline">Remove</button>
                                                        </div>
                                                        <FilePreviewItem file={selectedEditFile} onRemove={() => setSelectedEditFile(null)} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product</label>
                                        <select
                                            value={editCourseId}
                                            onChange={(e) => setEditCourseId(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all shadow-sm appearance-none"
                                        >
                                            <option value="">Select Product</option>
                                            {courses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name || c.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{editingItem.type === 'PDF' ? 'Total Pages' : 'Duration (Mins)'}</label>
                                        <input
                                            type="text"
                                            value={editDuration}
                                            onChange={(e) => setEditDuration(e.target.value)}
                                            placeholder={editingItem.type === 'PDF' ? "e.g. 12" : "e.g. 45"}
                                            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                                    <select
                                        value={editSubjectId}
                                        onChange={(e) => setEditSubjectId(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name || s.title}</option>)}
                                    </select>
                                </div>

                                <div className="pt-2">
                                    {mode === 'demo' ? (
                                        <button
                                            onClick={() => setEditIsDemo(!editIsDemo)}
                                            className={`w-full p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${editIsDemo ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{editIsDemo ? 'check_circle' : 'circle'}</span>
                                            <span className="text-[12px] font-black uppercase tracking-wider">Demo Lesson Enabled</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setEditIsFree(!editIsFree)}
                                            className={`w-full p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${editIsFree ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{editIsFree ? 'check_circle' : 'circle'}</span>
                                            <span className="text-[12px] font-black uppercase tracking-wider">Free Access Enabled</span>
                                        </button>
                                    )}
                                </div>
                                <div className="pt-10 flex gap-4 w-full">
                                    <button
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 h-[62px] bg-white border border-gray-100 text-[#94a3b8] rounded-full font-[900] uppercase text-[11px] tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleEditSave}
                                        disabled={actionLoading === editingItem.id}
                                        className="flex-[1.8] h-[62px] bg-[#0f1521] text-white rounded-full font-[900] uppercase text-[11px] tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {actionLoading === editingItem.id ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </DrawerBody>
                    </>
                )}
            </RightSideDrawer>
            <VideoDrawer contentMode={mode} isOpen={isVideoDrawerOpen} onClose={() => setIsVideoDrawerOpen(false)} onSubmit={handleAddVideoSubmit} />

            {/* Type Selector Drawer */}
            <RightSideDrawer isOpen={showTypeSelector} onClose={() => setShowTypeSelector(false)}>
                <DrawerHeader title={`Add ${mode === 'demo' ? 'Demo' : 'Free'} Content`} onClose={() => setShowTypeSelector(false)} />
                <DrawerBody>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <BigActionTile
                            icon="videocam"
                            label="Video"
                            desc="Recorded Lesson"
                            color="bg-purple-50 text-purple-600"
                            onClick={() => { setShowTypeSelector(false); setIsVideoDrawerOpen(true); }}
                        />
                        <BigActionTile
                            icon="sensors"
                            label="Live"
                            desc="Live Class"
                            color="bg-red-50 text-red-600"
                            onClick={() => {
                                setShowTypeSelector(false);
                                // For live, we can use the same video drawer but change the submit handler temporarily or add a flag
                                setIsVideoDrawerOpen(true);
                                (window as any)._addingLive = true;
                            }}
                        />
                        {mode === 'free' && (
                            <>
                                <BigActionTile
                                    icon="description"
                                    label="PDF / Notes"
                                    desc="Study Material"
                                    color="bg-teal-50 text-teal-600"
                                    onClick={() => { setShowTypeSelector(false); setIsPDFDrawerOpen(true); }}
                                />
                                <BigActionTile
                                    icon="quiz"
                                    label="Test"
                                    desc="Mock Practice"
                                    color="bg-orange-50 text-orange-600"
                                    onClick={() => {
                                        setShowTypeSelector(false);
                                        // For now just alert or open a simplified test drawer if available
                                        alert('Please use the Test management section to create tests and mark them as free.');
                                    }}
                                />
                            </>
                        )}
                    </div>
                </DrawerBody>
            </RightSideDrawer>

            <UploadDrawer
                isOpen={isPDFDrawerOpen}
                onClose={() => setIsPDFDrawerOpen(false)}
                title="Upload PDF / Notes"
                subtitle="Select study documents"
                onSubmit={handleAddPDF}
                accept=".pdf,.doc,.docx"
            />
        </div>
    );
};

export default ContentManager;

