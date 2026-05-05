import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { uploadAPI, bannersAPI, coursesAPI } from '../../services/apiClient';
import { getImageUrl, validateImage } from '../../lib/utils';
import FileUploadButton from '../shared/FileUploadButton';
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

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  courseId?: string;
  order: number;
  active: boolean;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Banners: React.FC<Props> = ({ showToast }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    imageUrl: '', 
    linkUrl: '', 
    courseId: '',
    active: true, 
    order: 1 
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const loadCourses = async () => {
    setIsCoursesLoading(true);
    try {
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsCoursesLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setActiveActionMenuId(null);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsCourseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadBanners();
    loadCourses();
  }, []);

  const loadBanners = async () => {
    try {
      const data = await bannersAPI.getAll();
      setBanners(data.sort((a: Banner, b: Banner) => a.order - b.order));
    } catch (error) {
      showToast('Failed to load banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const bannerData = {
        id: editingBanner?.id || `banner_${Date.now()}`,
        title: formData.title,
        imageUrl: formData.imageUrl,
        linkUrl: formData.linkUrl,
        courseId: formData.courseId,
        order: formData.order,
        active: formData.active
      };

      if (editingBanner) {
        await bannersAPI.update(editingBanner.id, bannerData);
        showToast('Banner updated successfully!');
      } else {
        await bannersAPI.create(bannerData);
        showToast('Banner created successfully!');
      }

      setShowModal(false);
      setEditingBanner(null);
      setFormData({ title: '', imageUrl: '', linkUrl: '', courseId: '', active: true, order: banners.length + 1 });
      loadBanners();
    } catch (error) {
      showToast('Failed to save banner', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await bannersAPI.delete(id);
        showToast('Banner deleted successfully!');
        loadBanners();
      } catch (error) {
        showToast('Failed to delete banner', 'error');
      }
    }
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      courseId: banner.courseId || '',
      active: banner.active,
      order: banner.order || 1
    });
    setShowModal(true);
  };

  const filteredBanners = banners.filter(b => {
    const matchesSearch = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && b.active) ||
      (statusFilter === 'inactive' && !b.active);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBanners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBanners.length);
  const paginatedBanners = filteredBanners.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const toggleActive = async (banner: Banner) => {
    try {
      await bannersAPI.update(banner.id, { ...banner, active: !banner.active });
      loadBanners();
      showToast(`Banner ${!banner.active ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      showToast('Failed to update banner', 'error');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedBanners = arrayMove(banners, oldIndex, newIndex);
    
    // Optimistic Update
    setBanners(newOrderedBanners);
    setIsReordering(true);

    try {
      await bannersAPI.reorder(newOrderedBanners.map(b => b.id));
      showToast('Order updated successfully');
    } catch (error) {
      console.error('Failed to reorder banners:', error);
      showToast('Failed to update order. Rolling back...', 'error');
      loadBanners(); // Rollback
    } finally {
      setIsReordering(false);
    }
  };

  // Sorting is only safe when not filtered and on page 1
  const isSortingDisabled = searchQuery.length > 0 || statusFilter !== 'all' || currentPage !== 1 || isReordering;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen animate-fade-in">
      {/* Table Container Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

        {/* Internal Header: Title & Controls */}
        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50">
          <h2 className="text-[16px] font-bold text-gray-800">App Banners</h2>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-gray-300 transition-all"
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
            </button>

            <button
              onClick={() => { setEditingBanner(null); setFormData({ title: '', imageUrl: '', linkUrl: '', courseId: '', active: true, order: banners.length + 1 }); setShowModal(true); }}
              className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Data Table */}
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {!isSortingDisabled && <span className="material-symbols-outlined text-[14px] align-middle mr-1">drag_handle</span>}
                    S. NO.
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Linked To</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Sort By</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <SortableContext
                  items={paginatedBanners.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={isSortingDisabled}
                >
                  {paginatedBanners.map((banner, index) => (
                    <SortableBannerRow
                      key={banner.id}
                      banner={banner}
                      index={startIndex + index}
                      activeActionMenuId={activeActionMenuId}
                      setActiveActionMenuId={setActiveActionMenuId}
                      openEditModal={openEditModal}
                      handleDelete={handleDelete}
                      setPreviewImage={setPreviewImage}
                      banners={banners}
                      setBanners={setBanners}
                      showToast={showToast}
                      isSortingDisabled={isSortingDisabled}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>
        </DndContext>

        {/* Standardized Pagination Footer */}
        {!loading && filteredBanners.length > 0 && (
          <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
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
                Showing {startIndex + 1} to {endIndex} of {filteredBanners.length} entries
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
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100000] flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/5 animate-in fade-in duration-300"
            onClick={() => setShowModal(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-[500px] bg-white h-full shadow-[-40px_0_100px_rgba(0,0,0,0.05)] animate-in slide-in-from-right duration-500 flex flex-col z-[100001] font-sans">
            {/* Header (Match New Presentation Design) */}
            <div className="p-10 pb-6 flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-[24px] font-black text-[#1A2138] tracking-wider uppercase">
                  New Presentation
                </h3>
                <p className="text-[12px] font-extrabold text-[#AAB4C8] uppercase tracking-widest">
                  Adjust Visual Parameters
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-[#111] hover:border-gray-300 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-10 py-6 space-y-8 custom-scrollbar">
              {/* Slide Title */}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-[#AAB4C8] uppercase tracking-widest">Slide Title</label>
                <input
                  type="text"
                  placeholder="Identify this banner..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-[70px] px-8 bg-[#F9FBFF] border border-transparent rounded-[1.2rem] text-[15px] font-bold text-[#1A2138] outline-none focus:border-[#E1E8F5] transition-all placeholder:text-[#AAB4C8]"
                />
              </div>

              {/* Asset Source (URL or File) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-[#AAB4C8] uppercase tracking-widest">Asset Source</label>
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1200x600 (2:1 ratio). Keep text in center to avoid cropping.</span>
                </div>

                <div className="space-y-4">
                  {/* URL Input Area - Hidden if file is uploaded */}
                  {(!formData.imageUrl || !formData.imageUrl.startsWith('data:')) && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#AAB4C8] uppercase tracking-wider ml-1">Asset URL</label>
                      <input
                        type="text"
                        placeholder="https://cloud.storage/asset.jpg"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full h-[70px] px-8 bg-[#F9FBFF] border border-transparent rounded-[1.2rem] text-[15px] font-bold text-[#1A2138] outline-none focus:border-[#E1E8F5] transition-all placeholder:text-[#AAB4C8]"
                      />
                    </div>
                  )}

                  {!formData.imageUrl && (
                    <div className="flex items-center gap-4 px-4 overflow-hidden">
                      <div className="h-[1px] flex-1 bg-gray-50"></div>
                      <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest">OR</span>
                      <div className="h-[1px] flex-1 bg-gray-50"></div>
                    </div>
                  )}

                  {/* File Upload Area - Hidden if URL is entered */}
                  {(formData.imageUrl === '' || formData.imageUrl.startsWith('data:')) && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#AAB4C8] uppercase tracking-wider ml-1">Upload from Files</label>
                      <div
                        onClick={() => document.getElementById('banner-upload')?.click()}
                        className="w-full h-[100px] border-2 border-dashed border-[#F3F6FF] bg-[#F9FBFF] rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#E1E8F5] transition-all group relative overflow-hidden"
                      >
                         {isUploading ? (
                           <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                         ) : formData.imageUrl && (formData.imageUrl.startsWith('data:') || formData.imageUrl.startsWith('/uploads/') || formData.imageUrl.startsWith('https://aonetarget.in/uploads/')) ? (
                           <>
                             <img src={getImageUrl(formData.imageUrl)} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="Preview" />
                             <span className="relative text-[12px] font-black text-[#1D2B64] uppercase tracking-widest">Image Selected</span>
                             <span className="relative text-[9px] font-bold text-[#1D2B64]/60 uppercase mt-1">Click to Replace</span>
                           </>
                         ) : (
                           <>
                             <span className="material-symbols-outlined text-[#AAB4C8] text-[24px] mb-1 group-hover:text-[#1D2B64]">upload_file</span>
                             <span className="text-[12px] font-black text-[#AAB4C8] uppercase tracking-widest group-hover:text-[#1D2B64]">Choose File</span>
                           </>
                         )}
                        <input
                          id="banner-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const result = await validateImage(file, {
                                minWidth: 1200,
                                minHeight: 600,
                                aspectRatio: 2,
                                tolerance: 0.10,
                                label: 'Banner'
                              });

                              if (!result.valid) {
                                showToast(result.message || 'Invalid image', 'error');
                                e.target.value = '';
                                return;
                              }
                              
                              setIsUploading(true);
                              try {
                                const data = await uploadAPI.uploadImage(file);
                                if (data && data.url) {
                                  setFormData({ ...formData, imageUrl: data.url });
                                }
                              } catch (err: any) {
                                console.error('Upload failed:', err);
                                showToast(err.message || 'Upload failed', 'error');
                              } finally {
                                setIsUploading(false);
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                      {formData.imageUrl.startsWith('data:') && (
                        <button onClick={() => setFormData({ ...formData, imageUrl: '' })} className="text-[9px] font-black text-red-400 mt-2 uppercase tracking-widest ml-1">Remove File</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Target */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-[#AAB4C8] uppercase tracking-widest">Navigation Target</label>
                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest">Optional</span>
                </div>
                
                <div className="space-y-6">
                  {/* Course Picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#AAB4C8] uppercase tracking-wider ml-1">Link to Course/Batch</label>
                    <div className="relative" ref={dropdownRef}>
                      {/* Dropdown Trigger */}
                      <div 
                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                        className={`w-full h-[60px] px-8 bg-[#F9FBFF] border ${isCourseDropdownOpen ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-transparent'} rounded-[1.2rem] flex items-center justify-between cursor-pointer transition-all hover:bg-[#F2F6FF]`}
                      >
                        <span className={`text-[14px] font-bold ${formData.courseId ? 'text-[#1A2138]' : 'text-[#AAB4C8]'}`}>
                          {formData.courseId 
                            ? (courses.find(c => (c._id || c.id) === formData.courseId)?.name || courses.find(c => (c._id || c.id) === formData.courseId)?.title || 'Selected Batch')
                            : 'Select Batch'
                          }
                        </span>
                        <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isCourseDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`}>
                          expand_more
                        </span>
                      </div>

                      {/* Dropdown Menu */}
                      {isCourseDropdownOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-100 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          {/* Search Area */}
                          <div className="p-4 border-b border-slate-50 sticky top-0 bg-white z-10">
                            <div className="relative">
                              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                              <input 
                                type="text"
                                placeholder="Search batch by name..."
                                value={courseSearchQuery}
                                onChange={(e) => setCourseSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-11 pl-11 pr-4 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          {/* Options List */}
                          <div className="max-h-[250px] overflow-y-auto custom-scrollbar py-2">
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, courseId: '', linkUrl: '' });
                                setIsCourseDropdownOpen(false);
                                setCourseSearchQuery('');
                              }}
                              className="px-6 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between group"
                            >
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-red-400 transition-colors">-- None (Clear Selection) --</span>
                            </div>

                            {isCoursesLoading ? (
                              <div className="px-6 py-8 text-center">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching courses...</span>
                              </div>
                            ) : (
                              (() => {
                                const filtered = courses.filter(c => 
                                  (c.name || c.title || '').toLowerCase().includes(courseSearchQuery.toLowerCase())
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div className="px-6 py-10 text-center">
                                      <span className="material-symbols-outlined text-slate-200 text-4xl mb-2">search_off</span>
                                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching batches</p>
                                    </div>
                                  );
                                }

                                return filtered.map(c => {
                                  const id = c._id || c.id;
                                  const isSelected = formData.courseId === id;
                                  return (
                                    <div 
                                      key={id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFormData({ 
                                          ...formData, 
                                          courseId: id,
                                          linkUrl: `/courses/${id}`
                                        });
                                        setIsCourseDropdownOpen(false);
                                        setCourseSearchQuery('');
                                      }}
                                      className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                                    >
                                      <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-700'}`}>{c.name || c.title}</span>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mt-0.5">ID: {id}</span>
                                      </div>
                                      {isSelected && (
                                        <span className="material-symbols-outlined text-indigo-500 text-[20px]">check_circle</span>
                                      )}
                                    </div>
                                  );
                                });
                              })()
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 px-4 overflow-hidden py-1">
                    <div className="h-[1px] flex-1 bg-gray-50"></div>
                    <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest italic">Or enter manual URL</span>
                    <div className="h-[1px] flex-1 bg-gray-50"></div>
                  </div>

                  {/* Manual URL Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#AAB4C8] uppercase tracking-wider ml-1">Redirect URL</label>
                    <input
                      type="text"
                      placeholder="https://destination.com/path"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                      className="w-full h-[60px] px-8 bg-[#F9FBFF] border border-transparent rounded-[1.2rem] text-[15px] font-bold text-[#1A2138] outline-none focus:border-[#E1E8F5] transition-all placeholder:text-[#AAB4C8]"
                    />
                  </div>
                </div>
              </div>

              {/* Row: Sequence and Active Status */}
              <div className="grid grid-cols-2 gap-6 items-end">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-[#AAB4C8] uppercase tracking-widest">Sequence</label>
                  <input
                    type="number"
                    placeholder="3"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full h-[70px] px-8 bg-[#F9FBFF] border border-transparent rounded-[1.2rem] text-[15px] font-bold text-[#1A2138] outline-none focus:border-[#E1E8F5] transition-all placeholder:text-[#AAB4C8]"
                  />
                </div>

                <div className="space-y-4">
                  {/* Invisible label for vertical symmetry with Sequence */}
                  <label className="text-[11px] font-black text-transparent uppercase tracking-widest select-none cursor-default">Status</label>
                  <div
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className="h-[70px] px-6 bg-[#F9FBFF] border border-transparent rounded-[1.2rem] flex items-center justify-center gap-4 cursor-pointer group hover:bg-[#F2F6FF] transition-all shadow-sm shadow-blue-500/5"
                  >
                    {/* Toggle Switch */}
                    <div className={`w-[48px] h-[26px] shrink-0 rounded-full relative transition-all duration-300 ${formData.active ? 'bg-[#1D2B64]' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all duration-300 ${formData.active ? 'left-[26px]' : 'left-1'}`} />
                    </div>
                    {/* Stacked Text Label */}
                    <div className="flex flex-col leading-[1.1] select-none">
                      <span className="text-[10px] font-black text-[#1A2138] uppercase tracking-[0.05em]">Active</span>
                      <span className="text-[10px] font-black text-[#1A2138] uppercase tracking-[0.05em]">Status</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-Sticky Action Button */}
              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  className="w-full h-[75px] bg-[#1D2B64] text-white font-black text-[14px] uppercase tracking-[0.2em] rounded-[1.5rem] shadow-[0_20px_40px_rgba(29,43,100,0.2)] hover:bg-[#15204a] transition-all active:scale-[0.98]"
                >
                  {editingBanner ? 'Update Presentation' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Image Preview Lightbox */}
      {previewImage && createPortal(
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 md:p-20">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setPreviewImage(null)}
          />
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
            {/* Standard "X" Cross Button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="fixed top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all z-[200001] shadow-xl group active:scale-95"
            >
              <span className="material-symbols-outlined text-[30px] group-hover:rotate-90 transition-transform duration-300">close</span>
            </button>

            <img
              src={getImageUrl(previewImage)}
              className="w-full h-full object-contain rounded-xl shadow-2xl border border-white/10"
              alt="Preview"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const SortableBannerRow = ({
  banner,
  index,
  activeActionMenuId,
  setActiveActionMenuId,
  openEditModal,
  handleDelete,
  setPreviewImage,
  banners,
  setBanners,
  showToast,
  isSortingDisabled
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: banner.id });

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
      className={`hover:bg-gray-50/30 transition-colors ${isDragging ? 'shadow-lg border-y border-gray-200' : ''}`}
    >
      <td className="px-6 py-4 text-[13px] font-medium text-gray-500">
        {!isSortingDisabled && (
          <span
            {...attributes}
            {...listeners}
            className="material-symbols-outlined text-[18px] align-middle mr-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            drag_indicator
          </span>
        )}
        {index + 1}
      </td>
      <td className="px-6 py-4">
        <div
          onClick={() => banner.imageUrl && setPreviewImage(getImageUrl(banner.imageUrl))}
          className="w-16 aspect-video bg-gray-100 rounded-md overflow-hidden border border-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all active:scale-95 group"
        >
          {banner.imageUrl ? (
            <img src={getImageUrl(banner.imageUrl)} alt={banner.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-300 text-sm">image</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-gray-700">{banner.title}</span>
          <span className={`text-[10px] items-center gap-1.5 flex mt-1 ${banner.active ? 'text-emerald-500' : 'text-gray-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${banner.active ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
            {banner.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="px-3 py-1 bg-gray-100 rounded-md text-[12px] font-bold text-gray-500">
          {banner.order || 0}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex items-center gap-2 relative action-menu-container">
          <button
            onClick={() => setActiveActionMenuId(activeActionMenuId === banner.id ? null : banner.id)}
            className={`px-4 py-1.5 border rounded-lg text-[12px] font-bold transition-all flex items-center gap-1 ${activeActionMenuId === banner.id ? 'border-gray-400 bg-gray-50 text-black' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Actions <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeActionMenuId === banner.id ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {activeActionMenuId === banner.id && (
            <div className={`absolute right-0 ${index >= banners.length - 2 && banners.length > 2 ? 'bottom-full mb-2' : 'top-full mt-2'} w-56 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-[50] py-2 animate-in fade-in zoom-in-95 duration-200`}>
              {/* Enabled Toggle */}
              <div className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-blue-400">info</span>
                  <span className="text-[14px] font-medium text-gray-600">Enabled</span>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const updated = { ...banner, active: !banner.active };
                      await bannersAPI.update(banner.id, updated);
                      setBanners(banners.map((b: any) => b.id === banner.id ? updated : b));
                    } catch (err) {
                      showToast('Failed to update status', 'error');
                    }
                  }}
                  className={`w-10 h-5 rounded-full relative transition-colors ${banner.active ? 'bg-black' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${banner.active ? 'left-[22px]' : 'left-1'}`} />
                </button>
              </div>

              {/* Edit Option */}
              <button
                onClick={() => {
                  setActiveActionMenuId(null);
                  openEditModal(banner);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-blue-400">edit</span>
                <span className="text-[14px] font-medium text-gray-600">Edit</span>
              </button>

              {/* Separator */}
              <div className="h-[1px] bg-gray-50 my-1 mx-4" />

              {/* Delete Option */}
              <button
                onClick={() => {
                  setActiveActionMenuId(null);
                  handleDelete(banner.id);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-red-500">delete</span>
                <span className="text-[14px] font-medium text-red-500">Delete</span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default Banners;

