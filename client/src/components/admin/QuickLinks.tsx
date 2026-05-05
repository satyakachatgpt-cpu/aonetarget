import React, { useState, useEffect } from 'react';
import { quickLinksAPI, videosAPI, coursesAPI } from '../../services/apiClient';
import {
    RightSideDrawer,
    DrawerBody,
    DrawerHeader,
    DrawerFooter
} from './DrawerSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuickLink {
    _id?: string;
    id: string;
    title: string;
    url: string;
    imageUrl: string;
    bgColor?: string;
    sortBy: number;
    description?: string;
    status: 'active' | 'inactive';
    type?: 'link' | 'yt';
    courseName?: string; // For YT Embeds from courses
}

interface Props {
    showToast: (m: string, type?: 'success' | 'error') => void;
}

const QuickLinks: React.FC<Props> = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState<'Links' | 'YT History'>('Links');
    const [links, setLinks] = useState<QuickLink[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDrawer, setShowAddDrawer] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        url: '',
        sortBy: 1,
        imageUrl: '',
        bgColor: '#0866FF',
        description: '',
        type: 'link' as 'link' | 'yt'
    });
    const [isReordering, setIsReordering] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Standardized Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchLinks = async () => {
        try {
            setIsLoading(true);
            const data = await quickLinksAPI.getAll();
            // Filter out YT types from regular links
            const regularLinks = (Array.isArray(data) ? data : []).filter(link => link.type !== 'yt');
            setLinks(regularLinks);
        } catch (error) {
            console.error('Failed to fetch links:', error);
            setLinks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchVideos = async () => {
        try {
            setIsLoading(true);
            const [vData, cData] = await Promise.all([
                videosAPI.getAll(),
                coursesAPI.getAll()
            ]);

            // Filter only course videos with YouTube links
            const ytVideos = (Array.isArray(vData) ? vData : []).filter(v => {
                const url = v.url || v.youtubeUrl || '';
                const isYT = url.includes('youtube.com') || url.includes('youtu.be');
                return v.courseId && isYT;
            });
            setVideos(ytVideos);
            setCourses(Array.isArray(cData) ? cData : []);
        } catch (error) {
            console.error('Failed to fetch videos/courses:', error);
            setVideos([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'Links') {
            fetchLinks();
        } else {
            fetchVideos();
        }
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.row-action-menu-container')) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const filteredCurrentData = activeTab === 'Links'
        ? links.filter(link =>
            (link.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : videos.filter(video =>
            (video.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Standardized Pagination Logic
    const totalItems = filteredCurrentData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = filteredCurrentData.slice(startIndex, endIndex);
    const showingStart = totalItems === 0 ? 0 : startIndex + 1;
    const showingEnd = endIndex;

    // Reset pagination when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, pageSize]);

    const handleOpenAdd = () => {
        if (activeTab === 'YT History') return;
        setEditingLink(null);
        setFormData({
            title: '',
            url: '',
            sortBy: (links.length + 1),
            imageUrl: '',
            bgColor: '#0866FF',
            description: '',
            type: 'link'
        });
        setShowAddDrawer(true);
    };

    const handleEdit = (item: any) => {
        setEditingLink(item);
        setFormData({
            title: item.title,
            url: item.url || item.youtubeUrl || '',
            sortBy: item.sortBy || item.order || 0,
            imageUrl: item.imageUrl || item.thumbnail || '',
            bgColor: item.bgColor || '#0866FF',
            description: item.description || '',
            type: activeTab === 'YT History' ? 'yt' : 'link'
        });
        setShowAddDrawer(true);
        setOpenActionMenuId(null);
    };


    const handleSubmit = async () => {
        if (!formData.title || !formData.url) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        try {
            if (activeTab === 'YT History') {
                if (editingLink) {
                    await videosAPI.update(editingLink._id || editingLink.id, {
                        title: formData.title,
                        youtubeUrl: formData.url,
                        order: formData.sortBy,
                        description: formData.description
                    });
                    showToast('Video updated successfully');
                }
            } else {
                if (editingLink) {
                    await quickLinksAPI.update(editingLink._id || editingLink.id, {
                        ...formData,
                        status: editingLink.status
                    });
                    showToast('Link updated successfully');
                } else {
                    await quickLinksAPI.create({
                        ...formData,
                        status: 'active'
                    });
                    showToast('Link added successfully');
                }
            }
            setShowAddDrawer(false);
            if (activeTab === 'YT History') fetchVideos();
            else fetchLinks();
        } catch (error) {
            console.error('Action failed:', error);
            showToast('Failed to save', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(`Are you sure you want to delete this ${activeTab === 'YT History' ? 'video' : 'link'}?`)) {
            try {
                if (activeTab === 'YT History') {
                    await videosAPI.delete(id);
                } else {
                    await quickLinksAPI.delete(id);
                }
                showToast('Deleted successfully');
                if (activeTab === 'YT History') fetchVideos();
                else fetchLinks();
            } catch (error) {
                showToast('Failed to delete', 'error');
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const getStableId = (item: any) => String(item?._id || item?.id || "");
        const oldIndex = links.findIndex((item) => getStableId(item) === active.id);
        const newIndex = links.findIndex((item) => getStableId(item) === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        const newOrderedLinks = arrayMove(links, oldIndex, newIndex);
        
        // Optimistic Update
        setLinks(newOrderedLinks);
        setIsReordering(true);

        try {
            const orderedIds = newOrderedLinks.map(item => getStableId(item));
            await quickLinksAPI.reorder(orderedIds);
            showToast('Order updated successfully');
        } catch (error) {
            console.error('Failed to reorder quick links:', error);
            showToast('Failed to update order. Rolling back...', 'error');
            fetchLinks(); // Rollback
        } finally {
            setIsReordering(false);
        }
    };

    const isSortingDisabled = searchQuery.length > 0 || currentPage !== 1 || isReordering || activeTab !== 'Links';

    return (
        <div className="bg-[#fafafa] min-h-screen">
            <div className="pt-0 px-6 pb-10 space-y-4">
                {/* Navigation Tabs Container */}
                <div className="bg-white px-8 py-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-10 overflow-x-auto scrollbar-hide">
                    {(['Links'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSearchQuery('');
                            }}
                            className={`py-4 text-[13px] font-bold transition-all relative shrink-0 ${activeTab === tab
                                ? 'text-gray-900 border-b-2 border-gray-900'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100">
                    {/* Header Section */}
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 bg-white">
                        <h1 className="text-[18px] font-bold text-gray-800 tracking-tight">
                            {activeTab === 'Links' ? ' Links' : 'YouTube Upload History'}
                        </h1>

                        <div className="flex items-center gap-3">
                            <div className="relative group flex-1 md:flex-none">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] group-focus-within:text-navy transition-colors">search</span>
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full md:w-[240px] pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all shadow-sm placeholder:text-gray-400"
                                />
                            </div>

                            {activeTab === 'Links' && (
                                <button
                                    onClick={handleOpenAdd}
                                    className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[24px]">add</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/10 border-b border-gray-100">
                                    <th className="pl-8 pr-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {!isSortingDisabled && <span className="material-symbols-outlined text-[14px] align-middle mr-1">drag_handle</span>}
                                            S. NO. <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            IMAGE <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            TITLE <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            SORT BY <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">ACTIONS</th>
                                </tr>
                            </thead>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <tbody className="divide-y divide-gray-50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-gray-400">Loading...</td>
                                        </tr>
                                    ) : paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-gray-400">No data found</td>
                                        </tr>
                                    ) : (
                                        <SortableContext
                                            items={paginatedData.map(item => item._id || item.id)}
                                            strategy={verticalListSortingStrategy}
                                            disabled={isSortingDisabled}
                                        >
                                            {paginatedData.map((item: any, idx) => (
                                                <SortableQuickLinkRow
                                                    key={item._id || item.id}
                                                    item={item}
                                                    idx={idx}
                                                    startIndex={startIndex}
                                                    activeTab={activeTab}
                                                    courses={courses}
                                                    openActionMenuId={openActionMenuId}
                                                    setOpenActionMenuId={setOpenActionMenuId}
                                                    handleEdit={handleEdit}
                                                    handleDelete={handleDelete}
                                                    isSortingDisabled={isSortingDisabled}
                                                />
                                            ))}
                                        </SortableContext>
                                    )}
                                </tbody>
                            </DndContext>
                        </table>
                    </div>
                </div>

                {/* Standardized Pagination Footer */}
                {!isLoading && filteredCurrentData.length > 0 && (
                    <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center group">
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">expand_more</span>
                            </div>
                            <span className="text-[13px] font-medium text-gray-400 italic">
                                Showing {showingStart} to {showingEnd} of {totalItems} entries
                            </span>
                        </div>

                        <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
                {/* Premium Add/Edit Link Drawer matches screenshots */}
                <RightSideDrawer isOpen={showAddDrawer} onClose={() => setShowAddDrawer(false)} width="480px">
                    <DrawerHeader
                        title={editingLink ? (formData.type === 'yt' ? 'Edit YT Link' : 'Edit Link') : (formData.type === 'yt' ? 'Add YT Link' : 'Add Link')}
                        onClose={() => setShowAddDrawer(false)}
                    />
                    <DrawerBody className="space-y-7 px-8 pt-8">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-[14px] font-bold text-gray-700 ml-1">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="Enter Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-300 bg-white"
                            />
                        </div>

                        {/* Image Section - Only for regular links */}
                        {formData.type === 'link' && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[14px] font-bold text-gray-700 ml-1">Image <span className="text-red-500">*</span></label>
                                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 200x200 px (1:1 Ratio)</span>
                                </div>
                                <div className="flex gap-4">
                                    {/* No Image Placeholder */}
                                    <div className="w-[140px] h-[105px] bg-[#f2f2f2] rounded-2xl flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden">
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} className="w-full h-full object-cover" alt="preview" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-gray-400 text-[32px]">image</span>
                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-tight">No Image</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Upload Area */}
                                    <div
                                        onClick={() => {
                                            const url = prompt('Enter Image URL:');
                                            if (url) setFormData({ ...formData, imageUrl: url });
                                        }}
                                        className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group text-center"
                                    >
                                        <h4 className="text-[16px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">Upload Image</h4>
                                        <p className="text-[11px] font-medium text-gray-300 leading-tight mt-1">Click or Drag & Drop your file here.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Link Field with Dynamic Labels */}
                        <div className="space-y-2">
                            <label className="text-[14px] font-bold text-gray-700 ml-1">
                                {formData.type === 'yt' ? 'YouTube Link * : Link' : 'Link *'}
                            </label>
                            <input
                                type="text"
                                placeholder={formData.type === 'yt' ? 'http://youtube.com/' : 'Enter Link'}
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-300 bg-white"
                            />
                        </div>

                        {/* Sorting Order */}
                        <div className="space-y-2">
                            <label className="text-[14px] font-bold text-gray-700 ml-1">Sorting Order</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder={formData.type === 'yt' ? '0.00' : 'Enter Sorting Order'}
                                value={formData.sortBy}
                                onChange={(e) => setFormData({ ...formData, sortBy: Number(e.target.value) })}
                                className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-300 bg-white"
                            />
                        </div>

                        {/* Description - Only for regular links */}
                        {formData.type === 'link' && (
                            <div className="space-y-2 pb-10">
                                <label className="text-[14px] font-bold text-gray-700 ml-1">Description</label>
                                <textarea
                                    placeholder="Enter Description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-300 bg-white resize-none"
                                />
                            </div>
                        )}
                    </DrawerBody>
                    <DrawerFooter className="p-0 border-none">
                        <button
                            onClick={handleSubmit}
                            className="w-full h-[64px] bg-black text-white font-bold text-[15px] tracking-tight transition-all hover:bg-[#1a1a1a] active:scale-[0.99]"
                        >
                            {editingLink ? 'Save changes' : 'Submit'}
                        </button>
                    </DrawerFooter>
                </RightSideDrawer>
            </div>
        </div >
    );
};

const SortableQuickLinkRow = ({
    item,
    idx,
    startIndex,
    activeTab,
    courses,
    openActionMenuId,
    setOpenActionMenuId,
    handleEdit,
    handleDelete,
    isSortingDisabled
}: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item._id || item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        position: 'relative' as 'relative',
        backgroundColor: isDragging ? '#f8fafc' : undefined,
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`hover:bg-gray-50/50 transition-colors group ${isDragging ? 'shadow-lg border-y border-gray-200' : ''}`}
        >
            <td className="pl-8 pr-4 py-6 text-[13px] font-medium text-gray-600 group-hover:text-black">
                {!isSortingDisabled && (
                    <span
                        {...attributes}
                        {...listeners}
                        className="material-symbols-outlined text-[18px] align-middle mr-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                    >
                        drag_indicator
                    </span>
                )}
                {startIndex + idx + 1}
            </td>
            <td className="px-6 py-6 font-bold">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center p-0.5 bg-white border border-gray-100 shadow-sm relative group/img">
                    {(() => {
                        const getYTThumb = (urlProp: string) => {
                            const url = urlProp || '';
                            if (!url) return null;
                            let vid = '';
                            if (url.includes('v=')) vid = url.split('v=')[1]?.split('&')[0];
                            else if (url.includes('youtu.be/')) vid = url.split('youtu.be/')[1]?.split('?')[0];
                            else vid = url.split('/').pop() || '';
                            return vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null;
                        };

                        const isVideo = activeTab === 'YT History';
                        const videoUrl = item.url || item.youtubeUrl || '';
                        const thumb = item.imageUrl || item.thumbnail || (isVideo ? getYTThumb(videoUrl) : null);

                        return thumb ? (
                            <img
                                src={thumb}
                                className="w-full h-full object-cover rounded-lg"
                                alt={item.title}
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${activeTab === 'Links' ? 'bg-blue-50 text-blue-400' : 'bg-red-50 text-red-400'}`}>
                                <span className="material-symbols-outlined text-[24px]">
                                    {activeTab === 'YT History' ? 'play_circle' : 'link'}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            </td>
            <td className="px-6 py-6">
                <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-gray-800">{item.title}</span>
                    {activeTab === 'YT History' && item.courseId && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            Course: {courses.find((c: any) => (c._id || c.id) === item.courseId)?.title || item.courseId}
                        </span>
                    )}
                </div>
            </td>
            <td className="px-6 py-6">
                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[12px] font-medium border border-gray-100">
                    {Number(item.sortBy || 0).toFixed(0)}
                </span>
            </td>
            <td className="px-6 py-6">
                <div className="relative row-action-menu-container">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(openActionMenuId === (item._id || item.id) ? null : (item._id || item.id));
                        }}
                        className={`px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 group shadow-sm`}
                    >
                        Actions
                        <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-gray-600">expand_more</span>
                    </button>

                    {openActionMenuId === (item._id || item.id) && (
                        <div className={`absolute right-0 ${idx === 0 ? 'top-full mt-2 origin-top-right' : 'bottom-full mb-2 origin-bottom-right'} w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[999] animate-in fade-in zoom-in duration-200`}>
                            {activeTab === 'Links' ? (
                                <>
                                    <button
                                        onClick={() => {
                                            const url = item.url.startsWith('http') ? item.url : `https://${item.url}`;
                                            window.open(url, '_blank');
                                            setOpenActionMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                        Open Link
                                    </button>
                                    <div className="h-[1px] bg-gray-50 mx-2 my-1"></div>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-amber-500">edit</span>
                                        Edit Link
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(item._id || item.id); setOpenActionMenuId(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-red-500">delete</span>
                                        Delete Link
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            const url = item.url || item.youtubeUrl || '';
                                            const finalUrl = url.startsWith('http') ? url : `https://${url}`;
                                            window.open(finalUrl, '_blank');
                                            setOpenActionMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                        Goto Link
                                    </button>
                                    <div className="h-[1px] bg-gray-50 mx-2 my-1"></div>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-amber-500">edit</span>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(item._id || item.id); setOpenActionMenuId(null); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-red-500">delete</span>
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default QuickLinks;

