import React from 'react';

interface CourseProductsViewProps {
  filteredCourses: any[];
  courseCategories: any[];
  productSearchQuery: string;
  setProductSearchQuery: (query: string) => void;
  productStatusFilter: string;
  setProductStatusFilter: (status: string) => void;
  productCategoryFilter: string;
  setProductCategoryFilter: (category: string) => void;
  isProductFilterOpen: boolean;
  setIsProductFilterOpen: (open: boolean) => void;
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  moreDropdownRef: React.RefObject<HTMLDivElement>;
  openActionMenuId: string | null;
  setOpenActionMenuId: (id: string | null) => void;
  setSelectedCourse: (course: any) => void;
  setIsAddingCourse: (isAdding: boolean) => void;
  handleEditCourseClick: () => void;
  handleTogglePublishWrapper: () => void;
  fetchTestSeriesList: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setShowFolderModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setShowVideoModal: (show: boolean) => void;
  setShowDocumentModal: (show: boolean) => void;
  setShowTestDrawer: (show: boolean) => void;
  setShowSubjectiveTestDrawer: (show: boolean) => void;
  setShowNoteModal: (show: boolean) => void;
  setShowYoutubeZoomModal: (show: boolean) => void;
}

const CourseProductsView: React.FC<CourseProductsViewProps> = ({
  filteredCourses,
  courseCategories,
  productSearchQuery,
  setProductSearchQuery,
  productStatusFilter,
  setProductStatusFilter,
  productCategoryFilter,
  setProductCategoryFilter,
  isProductFilterOpen,
  setIsProductFilterOpen,
  viewMode,
  setViewMode,
  isMoreOpen,
  setIsMoreOpen,
  moreDropdownRef,
  openActionMenuId,
  setOpenActionMenuId,
  setSelectedCourse,
  setIsAddingCourse,
  handleEditCourseClick,
  handleTogglePublishWrapper,
  fetchTestSeriesList,
  showToast,
  setShowFolderModal,
  setShowImportModal,
  setShowVideoModal,
  setShowDocumentModal,
  setShowTestDrawer,
  setShowSubjectiveTestDrawer,
  setShowNoteModal,
  setShowYoutubeZoomModal
}) => {
  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Top Navigation Tabs */}
      <div className="bg-white px-8 border-b border-gray-100 flex items-center gap-10 overflow-x-auto scrollbar-hide">
        {['Products', 'Live & Upcoming', 'Forum', 'Content'].map((tab) => (
          <button
            key={tab}
            onClick={() => showToast(`${tab} view coming soon`)}
            className={`py-4 text-[13px] font-black transition-all relative shrink-0 ${tab === 'Products' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab}
            {tab === 'Products' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-950 rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-1">
        {/* Section Header & Action Bar */}
        <div className="p-4 flex items-center justify-between bg-white border-b border-gray-50">
          <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Products</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="bg-gray-50/30 border border-gray-200 pl-10 pr-10 py-2 rounded-lg text-[13px] font-medium w-[280px] outline-none focus:bg-white focus:border-gray-300 transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setIsProductFilterOpen(!isProductFilterOpen)}
                className={`flex items-center gap-2 px-6 py-2 border rounded-xl text-[12px] font-black uppercase tracking-wider transition-all shadow-sm ${isProductFilterOpen ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
              </button>

              {isProductFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Product Filters</h4>
                    <button onClick={() => { setProductStatusFilter('all'); setProductCategoryFilter('all'); setIsProductFilterOpen(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Publish Status</label>
                      <div className="flex flex-col gap-1">
                        {['all', 'active', 'inactive'].map((status) => (
                          <button
                            key={status}
                            onClick={() => { setProductStatusFilter(status); setIsProductFilterOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${productStatusFilter === status ? 'bg-navy/5 text-navy' : 'text-gray-500 hover:bg-gray-50'}`}
                          >
                            {status === 'all' ? 'All Products' : status === 'active' ? 'Published Only' : 'Drafts Only'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsAddingCourse(true)}
              className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${isMoreOpen ? 'bg-gray-100 text-gray-900 border-gray-200' : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'}`}
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>

              {/* Pixel-Perfect Dropdown Menu */}
              {isMoreOpen && (
                <div className="absolute right-0 top-[48px] w-[220px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] z-[100] border border-gray-100 py-6 animate-in fade-in zoom-in duration-200 origin-top-right">
                  {/* Table View Section */}
                  <div className="px-6 mb-6">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Table View</p>
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => { setViewMode('list'); setIsMoreOpen(false); }}
                        className={`transition-colors ${viewMode === 'list' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'list' ? "'FILL' 1" : "''" }}>list</span>
                      </button>
                      <button
                        onClick={() => { setViewMode('grid'); setIsMoreOpen(false); }}
                        className={`transition-colors ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'grid' ? "'FILL' 1" : "''" }}>grid_view</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[1px] bg-gray-50 mb-6 mx-6"></div>

                  {/* Bulk Actions Section */}
                  <div className="">
                    <p className="px-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Bulk Actions</p>

                    <div className="space-y-1">
                      {[
                        { icon: 'folder', label: 'Add Folder', action: () => setShowFolderModal(true) },
                        { icon: 'link', label: 'Import Content', action: () => setShowImportModal(true) },
                        { icon: 'videocam', label: 'Add Video', action: () => setShowVideoModal(true) },
                        { icon: 'description', label: 'Add PDF', action: () => setShowDocumentModal(true) },
                        { icon: 'assignment', label: 'Add Test', action: () => { fetchTestSeriesList(); setShowTestDrawer(true); } },
                        { icon: 'rule', label: 'Subjective Test', action: () => setShowSubjectiveTestDrawer(true) },
                        { icon: 'note_add', label: 'Add Document/Note', action: () => setShowNoteModal(true) },
                        { icon: 'smart_display', label: 'Add YouTube/Zoom Video', action: () => setShowYoutubeZoomModal(true) },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-center gap-4 px-6 py-2.5 hover:bg-gray-50 transition-colors group text-left"
                          onClick={() => { setIsMoreOpen(false); item.action(); }}
                        >
                          <span className="material-symbols-outlined text-[20px] text-blue-400 group-hover:text-blue-500 transition-colors">
                            {item.icon}
                          </span>
                          <span className="text-[14px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Content Section */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#fcfcfc] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">S. No.</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center justify-between w-full">
                      Course Name
                      <span className="material-symbols-outlined text-[14px] text-gray-200">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center justify-between w-full">
                      Category
                      <span className="material-symbols-outlined text-[14px] text-gray-200">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24">Price</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.map((course, index) => {
                  const isPublished = (course as any).isPublished === true || (course as any).status === 'active';
                  const coursePrice = (course as any).price;
                  const priceDisplay = coursePrice !== undefined && coursePrice !== null && coursePrice !== '' && Number(coursePrice) > 0
                    ? `₹${Number(coursePrice).toLocaleString('en-IN')}`
                    : 'Free';
                  const categoryName = (course as any).categoryName ||
                    (courseCategories.find((c: any) => c.id === (course as any).categoryId || c._id === (course as any).categoryId)?.title) ||
                    (course as any).categoryId ||
                    '—';
                  return (
                    <tr key={course.id} className="group hover:bg-blue-50/10 transition-colors cursor-pointer" onClick={() => setSelectedCourse(course)}>
                      <td className="px-6 py-4 text-[13px] font-bold text-gray-500">{filteredCourses.length - index}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-black text-gray-900 group-hover:text-blue-600 transition-colors">{course.name || course.title}</span>
                          {!isPublished && (
                            <span className="mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded w-fit tracking-wider">Unpublished</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-gray-500 leading-relaxed block max-w-[240px]">
                          {categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[14px] font-black text-gray-900">{priceDisplay}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isPublished
                          ? 'bg-green-50 text-green-600 border border-green-100'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === course.id ? null : course.id);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${openActionMenuId === course.id ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-700 border-gray-100 hover:border-gray-300'}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${openActionMenuId === course.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {openActionMenuId === course.id && (
                            <div
                              className="absolute right-0 top-full mt-2 w-[180px] bg-white rounded-2xl shadow-2xl z-[100] border border-gray-100 py-3 animate-in fade-in zoom-in duration-200 origin-top-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCourse(course);
                                  handleEditCourseClick();
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-400">edit_square</span>
                                <span className="text-[13px] font-bold">Edit Details</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePublishWrapper();
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left"
                              >
                                <span className="material-symbols-outlined text-[20px] text-amber-400">{isPublished ? 'visibility_off' : 'visibility'}</span>
                                <span className="text-[13px] font-bold">{isPublished ? 'Unpublish' : 'Publish'}</span>
                              </button>
                              <div className="h-px bg-gray-50 my-2 mx-3"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this course?')) {
                                    showToast('Deleting course...', 'success');
                                    // Implement actual delete logic if available
                                  }
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-red-300 group-hover:text-red-500">delete</span>
                                <span className="text-[13px] font-bold">Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8 bg-gray-50/30">
            {filteredCourses.map((course, index) => {
              const isPublished = (course as any).isPublished === true || (course as any).status === 'active';
              const coursePrice = (course as any).price;
              const priceDisplay = coursePrice !== undefined && coursePrice !== null && coursePrice !== '' && Number(coursePrice) > 0
                ? `₹${Number(coursePrice).toLocaleString('en-IN')}`
                : 'Free';
              return (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="bg-white rounded-[2rem] border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-2xl flex items-center justify-center border border-blue-50 shadow-sm">
                      <span className="material-symbols-outlined text-blue-600 text-[28px]">inventory_2</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCourse(course); handleEditCourseClick(); }}
                        className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </div>
                  </div>
                  <h4 className="text-[17px] font-black text-gray-900 mb-2 uppercase tracking-tight">{course.name || course.title}</h4>
                  <p className="text-[13px] text-gray-400 font-medium mb-6 line-clamp-2">{(course as any).description ? (course as any).description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').substring(0, 100) + '...' : `Complete ${course.name || course.title} course with videos, notes, and tests.`}</p>
                  <div className="flex items-center justify-between border-t border-gray-50 pt-5">
                    <span className="text-[16px] font-black text-gray-900">{priceDisplay}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg tracking-widest ${isPublished ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseProductsView;
