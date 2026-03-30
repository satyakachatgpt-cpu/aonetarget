import React, { useState, useEffect, useCallback } from 'react';
import { coursesAPI, categoriesAPI, subcategoriesAPI } from '../../../services/apiClient';
import RichTextEditor from '../../shared/RichTextEditor';
import FileUploadButton from '../../shared/FileUploadButton';

interface Course {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  subjects: number;
  studentsEnrolled: number;
  status: 'active' | 'inactive';
  createdDate: string;
  categoryId?: string;
  subcategoryId?: string;
  price?: number;
  mrp?: number;
  instructor?: string;
  type?: 'recorded' | 'live';
  examType?: 'neet' | 'iit-jee';
  contentType?: 'recorded_batch' | 'live_classroom' | 'crash_course' | 'mock_test';
  subject?: 'biology' | 'chemistry' | 'physics' | 'math';
  boardType?: 'cbse' | 'hbse';
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Courses: React.FC<Props> = ({ showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [editingItem, setEditingItem] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const emptyForm = {
    name: '',
    description: '',
    imageUrl: '',
    subjects: '',
    status: 'active' as 'active' | 'inactive',
    categoryId: '',
    subcategoryId: '',
    price: '',
    mrp: '',
    instructor: '',
    type: '' as '' | 'recorded' | 'live',
    examType: '' as '' | 'neet' | 'iit-jee',
    contentType: '' as '' | 'recorded_batch' | 'live_classroom' | 'crash_course' | 'mock_test',
    subject: '' as '' | 'biology' | 'chemistry' | 'physics' | 'math',
    boardType: '' as '' | 'cbse' | 'hbse'
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { loadCourses(); loadCategoriesAndSubs(); }, []);

  const loadCategoriesAndSubs = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoriesAPI.getAll().catch(() => []),
        subcategoriesAPI.getAll().catch(() => [])
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setAllSubcategories(Array.isArray(subs) ? subs : []);
    } catch (error) {
      console.error('Failed to load categories/subcategories', error);
    }
  };

  const filteredSubcategories = formData.categoryId
    ? allSubcategories.filter((s: any) => s.categoryId === formData.categoryId)
    : allSubcategories;

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll().catch(() => []);
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedItems = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async () => {
    if (!formData.name || !formData.categoryId) { showToast('Please fill Course Name and Category', 'error'); return; }
    try {
      const courseData: any = {
        id: editingItem?.id || `course_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl,
        subjects: parseInt(formData.subjects) || 0,
        studentsEnrolled: editingItem?.studentsEnrolled || 0,
        status: formData.status,
        createdDate: editingItem?.createdDate || new Date().toISOString(),
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        price: formData.price ? parseFloat(formData.price) : 0,
        mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
        instructor: formData.instructor || undefined,
        type: formData.type || undefined,
        examType: formData.examType || undefined,
        contentType: formData.contentType || undefined,
        subject: formData.subject || undefined,
        boardType: formData.boardType || undefined
      };
      if (editingItem) {
        await coursesAPI.update(editingItem.id, courseData);
        showToast('Course updated successfully!');
      } else {
        await coursesAPI.create(courseData);
        showToast('Course created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData(emptyForm);
      loadCourses();
    } catch (error) {
      showToast('Failed to save course', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this course?')) {
      try {
        await coursesAPI.delete(id);
        showToast('Course deleted successfully!');
        loadCourses();
      } catch (error) {
        showToast('Failed to delete course', 'error');
      }
    }
  };

  // Body scroll lock
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  const handleEdit = useCallback((item: Course) => {
    try {
      console.info('Editing course:', item.id);
      setEditingItem(item);
      setFormData({
        name: item.name || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        subjects: (item.subjects || '').toString(),
        status: item.status || 'active',
        categoryId: item.categoryId || '',
        subcategoryId: item.subcategoryId || '',
        price: item.price?.toString() || '',
        mrp: item.mrp?.toString() || '',
        instructor: item.instructor || '',
        type: (item.type || '') as any,
        examType: (item.examType || '') as any,
        contentType: (item.contentType || '') as any,
        subject: (item.subject || '') as any,
        boardType: (item.boardType || '') as any
      });
      setShowModal(true);
    } catch (err) {
      console.error('Error opening edit drawer:', err);
      showToast('Failed to open editor', 'error');
    }
  }, [showToast]);

  const handleAddNew = useCallback(() => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(true);
  }, [emptyForm]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div></div>;

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-drawer-in { animation: slideInRight 250ms ease-out forwards; }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div>
          <h3 className="text-lg font-black text-navy uppercase tracking-widest">Courses</h3>
          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Management Root / Offerings</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-black text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase shadow-sm hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="material-icons-outlined text-base">add</span>
          Add New
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center bg-gray-50/30">
        <div className="flex-1 relative group w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-navy transition-colors">search</span>
          <input
            type="text"
            placeholder="Search courses by name or description..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/5 transition-all shadow-sm placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group shrink-0">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterOpen || statusFilter !== 'all' ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Advanced Filters
              {statusFilter !== 'all' && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] p-5 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Courses</h4>
                  <button
                    onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Publish Status</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'all', label: 'All Courses', icon: 'inventory' },
                      { id: 'active', label: 'Published Only', icon: 'check_circle', color: 'text-green-500' },
                      { id: 'inactive', label: 'Drafts Only', icon: 'pause_circle', color: 'text-amber-500' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setStatusFilter(item.id); setIsFilterOpen(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[12px] font-bold transition-all ${statusFilter === item.id ? 'bg-navy text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${statusFilter === item.id ? 'text-white' : item.color || 'text-gray-400'}`}>{item.icon}</span>
                        {item.label}
                        {statusFilter === item.id && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="bg-transparent text-[13px] font-bold text-navy outline-none cursor-pointer pr-2"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[2.5rem] border border-gray-100">
            <span className="material-icons-outlined text-5xl text-gray-200 block mb-4">school</span>
            <p className="text-gray-400 font-bold uppercase tracking-wider text-sm">No courses found</p>
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex gap-8 items-center relative group hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500">
              {/* Image Preview Card */}
              <div className="w-[200px] h-[140px] rounded-3xl bg-[#f5f8ff] flex flex-col items-center justify-center gap-3 shrink-0 overflow-hidden relative border border-blue-50/50">
                {item.imageUrl ? (
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-blue-300 text-[28px]">school</span>
                    </div>
                    <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest">No Image</span>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-[20px] font-black text-gray-900 tracking-tight leading-tight uppercase">{item.name}</h4>
                    <p className="text-[14px] font-bold text-gray-500/80 tracking-tight uppercase">
                      {item.examType ? `${item.examType.toUpperCase()}: ` : ''}{item.name}
                    </p>
                  </div>
                  <div className="text-[20px] font-black text-gray-900">₹{item.price || 'Free'}</div>
                </div>

                <div className="max-w-2xl">
                  <p className="text-[14px] font-medium text-gray-500 line-clamp-2 leading-relaxed">
                    {item.description ? item.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : 'Access full course content, videos, and materials.'}
                  </p>
                  <button className="text-[14px] font-black text-blue-600 mt-2 hover:underline">Show more</button>
                </div>

                <div className="flex justify-between items-end pt-2">
                  <div className={`px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border shadow-sm ${item.status === 'active' ? 'bg-[#ebfaf2] text-[#22c55e] border-[#d1f2e1]' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {item.status === 'active' ? 'Published' : 'Draft'}
                  </div>

                  <button
                    onClick={() => handleEdit(item)}
                    className="relative z-10 px-8 py-2.5 bg-white border border-gray-200 rounded-2xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right Side sliding Drawer */}
      {showModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[200] animate-in fade-in duration-250 ease-out"
            onClick={() => setShowModal(false)}
          />

          {/* Drawer Container */}
          <div className="fixed top-0 right-0 h-screen w-[450px] bg-white z-[210] shadow-[-20px_0_60px_rgba(0,0,0,0.03)] flex flex-col animate-drawer-in overflow-hidden">
            {/* Drawer Header */}
            <div className="px-8 pt-[42px] pb-6 flex items-center justify-between relative">
              <h3 className="text-[16px] font-bold text-gray-800 tracking-tight">
                {editingItem ? 'Edit Course' : 'Add Course'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
              {/* Blur accent as seen in screenshot */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-400/5 blur-[60px] rounded-full pointer-events-none" />
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 space-y-6 pb-24">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-800">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Title"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[10px] text-[15px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Description Field */}
              <div className="space-y-4">
                <label className="text-[14px] font-bold text-gray-700 ml-1">Description</label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(html) => setFormData({ ...formData, description: html })}
                  height="280px"
                />
              </div>

              {/* Image Section */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-800">Image</label>
                <div className="flex gap-4">
                  {/* Preview Box */}
                  <div className="w-[170px] aspect-[4/3] bg-[#f8fafc] border border-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 relative overflow-hidden shrink-0">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-gray-300 text-[36px]">image</span>
                        <p className="text-[12px] font-bold text-gray-300 uppercase tracking-widest">No Image</p>
                      </>
                    )}
                  </div>
                  {/* Upload Box */}
                  <div
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="flex-1 border-2 border-dashed border-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer p-5 text-center group"
                  >
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setFormData({ ...formData, imageUrl: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <span className="material-symbols-outlined text-gray-300 text-[30px] group-hover:text-gray-400 transition-colors">touch_app</span>
                    <p className="text-[14px] font-bold text-gray-400">Upload Image</p>
                    <p className="text-[10px] font-medium text-gray-300 leading-tight">Click or Drag & Drop your file here</p>
                  </div>
                </div>
              </div>

              {/* Status Section (Segmented Toggle) */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-gray-800">Status</label>
                <div className="bg-[#f8fafc] p-1.5 rounded-xl flex relative border border-gray-100/50">
                  {/* Sliding Background */}
                  <div
                    className={`absolute inset-y-1.5 w-[calc(50%-6px)] bg-[#e2e8f0] rounded-lg shadow-sm transition-all duration-300 ${(formData.price === '0' || formData.price === '') ? 'left-1.5' : 'left-[50%]'}`}
                  />
                  <button
                    onClick={() => setFormData({ ...formData, price: '0' })}
                    className={`flex-1 relative z-10 py-2.5 text-[12px] font-bold transition-colors ${(formData.price === '0' || formData.price === '') ? 'text-gray-800' : 'text-gray-400'}`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => { if (formData.price === '0' || formData.price === '') setFormData({ ...formData, price: '1499' }); }}
                    className={`flex-1 relative z-10 py-2.5 text-[12px] font-bold transition-colors ${(formData.price !== '0' && formData.price !== '') ? 'text-gray-800' : 'text-gray-400'}`}
                  >
                    Paid
                  </button>
                </div>
              </div>

              {/* Advanced Settings Link */}
              <div className="pt-2">
                <button
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="flex items-center gap-1 text-[13px] font-bold text-blue-500 hover:text-blue-600 transition-all ml-auto"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${showMoreOptions ? 'rotate-90 text-blue-600' : ''}`}>play_arrow</span>
                  Advanced Settings
                </button>

                {showMoreOptions && (
                  <div className="mt-4 space-y-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Category</label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-[12px] outline-none"
                        >
                          <option value="">Select</option>
                          {categories.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.title}</option>))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Price (₹)</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-bold text-[12px] outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section - Fixed Dark Footer */}
            <div className="mt-auto bg-[#1a1a1b] pt-5 pb-5 px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] flex justify-center">
              <button
                onClick={handleSubmit}
                className="text-white text-[15px] font-bold tracking-[0.2em] hover:opacity-80 transition-all border-none bg-transparent"
              >
                SUBMIT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Courses;

