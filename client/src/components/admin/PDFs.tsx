import React, { useState, useEffect } from 'react';
import { getPdfUrl } from '../../lib/utils';
import { pdfsAPI, coursesAPI, uploadAPI } from '../../services/apiClient';
import {
  RightSideDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerFooter,
  UploadArea,
  FilePreviewItem,
  PrimaryButton
} from './DrawerSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PDF {
  _id?: string;
  id: string;
  title: string;
  price: number;
  sortBy: number;
  fileUrl: string;
  courseId?: string;
  categoryId?: string;
  status: 'active' | 'inactive';
  isEbook?: boolean;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SortableRow = ({
  pdf,
  idx,
  startIndex,
  courses,
  openActionMenuId,
  setOpenActionMenuId,
  handleEdit,
  handleDelete,
  getPdfUrl,
  disabled
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: pdf._id || pdf.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50/50 transition-colors group ${isDragging ? 'shadow-2xl relative z-10 bg-white' : ''}`}
    >
      <td className="pl-8 pr-4 py-6 text-[13px] font-black text-gray-300">
        <div className="flex items-center gap-3">
          {!disabled && (
            <span
              {...attributes}
              {...listeners}
              className="material-symbols-outlined text-[18px] text-gray-400 cursor-grab active:cursor-grabbing hover:text-navy transition-colors"
            >
              drag_indicator
            </span>
          )}
          {startIndex + idx + 1}
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-bold text-gray-800">{pdf.title}</span>
          <div className="flex items-center gap-2">
            {pdf.courseId && (
              <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-400 font-medium rounded border border-gray-100 uppercase tracking-tighter">
                {courses.find((c: any) => (c._id || c.id) === pdf.courseId)?.title || 'Course: ' + pdf.courseId}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-6">
        <span className="text-[14px] font-bold text-gray-700">₹{pdf.price || 0}</span>
      </td>
      <td className="px-6 py-6">
        <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[12px] font-medium border border-gray-100">
          {(pdf.sortBy || 0).toFixed(0)}
        </span>
      </td>
      <td className="px-6 py-6">
        <div className="relative row-action-menu-container">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenActionMenuId(openActionMenuId === (pdf._id || pdf.id) ? null : (pdf._id || pdf.id));
            }}
            className={`px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 group shadow-sm`}
          >
            Actions
            <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-gray-600">expand_more</span>
          </button>

          {openActionMenuId === (pdf._id || pdf.id) && (
            <div className={`absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 py-3 z-[999] animate-in fade-in zoom-in duration-200 origin-top-right`}>
              <button
                onClick={() => { window.open(getPdfUrl(pdf.fileUrl), '_blank'); setOpenActionMenuId(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-blue-500">visibility</span>
                View PDF
              </button>
              <button
                onClick={() => handleEdit(pdf)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-blue-500">edit</span>
                Edit
              </button>
              <button
                onClick={() => { handleDelete(pdf._id || pdf.id); setOpenActionMenuId(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-red-500">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const PDFs: React.FC<Props> = ({ showToast }) => {
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingPdf, setEditingPdf] = useState<PDF | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
    sortBy: 1,
    fileUrl: '',
    courseId: '',
    status: 'active' as 'active' | 'inactive',
    isEbook: true
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Guard: Disable reordering during search or filtering
    if (searchQuery.trim() !== '') {
      showToast('Reordering is disabled while search is active', 'error');
      return;
    }

    const oldIndex = pdfs.findIndex((p) => (p._id || p.id) === active.id);
    const newIndex = pdfs.findIndex((p) => (p._id || p.id) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousOrder = [...pdfs];
    const newOrder = arrayMove(pdfs, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sortBy: index + 1
    }));

    setPdfs(newOrder);

    try {
      const orderedIds = newOrder.map(p => p._id || p.id);
      await pdfsAPI.reorder(orderedIds);
      showToast('Order updated successfully', 'success');
    } catch (error) {
      console.error('Failed to reorder:', error);
      showToast('Failed to save order. Rolling back...', 'error');
      setPdfs(previousOrder);
    }
  };

  // Standardized Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [pd, cs] = await Promise.all([
        pdfsAPI.getAll(),
        coursesAPI.getAll()
      ]);
      const pdfList = Array.isArray(pd) ? pd : [];
      // Filter to only show E-Books and sort by sortBy ASC
      const filteredList = pdfList
        .filter(p => p.isEbook !== false)
        .sort((a, b) => (Number(a.sortBy) || 0) - (Number(b.sortBy) || 0));
        
      setPdfs(filteredList);
      setCourses(Array.isArray(cs) ? cs : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.row-action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPdfs = pdfs.filter(pdf =>
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Standardized Pagination Logic
  const totalItems = filteredPdfs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = filteredPdfs.slice(startIndex, endIndex);
  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = endIndex;

  // Reset pagination when search or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const handleOpenAdd = () => {
    setEditingPdf(null);
    setSelectedFile(null);
    setFormData({
      title: '',
      price: 0,
      sortBy: (pdfs.length + 1),
      fileUrl: '',
      courseId: '',
      status: 'active',
      isEbook: true
    });
    setShowAddDrawer(true);
  };

  const handleEdit = (pdf: any) => {
    setEditingPdf(pdf);
    setSelectedFile(null);
    setFormData({
      title: pdf.title,
      price: pdf.price || 0,
      sortBy: pdf.sortBy || 0,
      fileUrl: pdf.fileUrl || '',
      courseId: pdf.courseId || '',
      status: pdf.status as 'active' | 'inactive',
      isEbook: true
    });
    setShowAddDrawer(true);
    setOpenActionMenuId(null);
  };

  const handleSubmit = async () => {
    if (!formData.title && !selectedFile) {
      showToast('Please provide a title or select a file', 'error');
      return;
    }
    if (!formData.courseId) {
      showToast('Please select a Course', 'error');
      return;
    }

    try {
      let finalData = { ...formData };
      if (selectedFile) {
        try {
          const data = await uploadAPI.uploadPDF(selectedFile);
          if (data && data.url) {
            finalData.fileUrl = data.url;
            if (!finalData.title) finalData.title = selectedFile.name.split('.')[0];
          }
        } catch (error: any) {
          console.error('PDF upload failed:', error);
          showToast(error.message || 'Failed to upload PDF file', 'error');
          return;
        }
      }

      if (editingPdf) {
        await pdfsAPI.update(editingPdf._id || editingPdf.id, finalData);
        showToast('E-Book updated successfully');
      } else {
        await pdfsAPI.create({
          ...finalData,
          id: `pdf_${Date.now()}`
        });
        showToast('E-Book added successfully');
      }
      setShowAddDrawer(false);
      fetchInitialData();
    } catch (error) {
      console.error('Action failed:', error);
      showToast('Failed to save e-book', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this e-book?')) {
      try {
        await pdfsAPI.delete(id);
        showToast('E-Book deleted');
        fetchInitialData();
      } catch (error) {
        showToast('Failed to delete e-book', 'error');
      }
    }
  };

  return (
    <div className="bg-[#fafafa] min-h-screen">
      <div className="pt-0 px-6 pb-10 space-y-4">
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 bg-white">
            <h1 className="text-[18px] font-bold text-gray-800 tracking-tight">E-Books / PDFs</h1>

            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:flex-none">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-[240px] pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all shadow-sm placeholder:text-gray-400"
                />
              </div>

              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
              </button>

              <button
                onClick={handleOpenAdd}
                className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/10 border-b border-gray-100">
                  <th className="pl-8 pr-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap w-[100px]">
                    S. NO.
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                    TITLE
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap">
                    PRICE
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap w-[120px]">
                    SORT BY
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] whitespace-nowrap w-[150px]">ACTIONS</th>
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={paginatedItems.map(p => p._id || p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium">Loading resources...</td>
                      </tr>
                    ) : paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-medium italic">No e-books found</td>
                      </tr>
                    ) : (
                      paginatedItems.map((pdf, idx) => (
                        <SortableRow
                          key={pdf._id || pdf.id}
                          pdf={pdf}
                          idx={idx}
                          startIndex={startIndex}
                          courses={courses}
                          openActionMenuId={openActionMenuId}
                          setOpenActionMenuId={setOpenActionMenuId}
                          handleEdit={handleEdit}
                          handleDelete={handleDelete}
                          getPdfUrl={getPdfUrl}
                          disabled={searchQuery.trim() !== ''}
                        />
                      ))
                    )}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && filteredPdfs.length > 0 && (
            <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center group">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400">expand_more</span>
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
                <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl">
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
        </div>

        {/* Add/Edit Drawer */}
        <RightSideDrawer isOpen={showAddDrawer} onClose={() => setShowAddDrawer(false)} width="480px">
          <DrawerHeader
            title={editingPdf ? 'Edit E-Book' : 'Add New E-Book'}
            onClose={() => setShowAddDrawer(false)}
          />
          <DrawerBody className="space-y-6 px-8 pt-8 pb-10">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Select Course <span className="text-red-500">*</span></label>
              <div className="relative group">
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full h-[52px] px-5 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.title || c.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
            </div>

            {selectedFile && (
              <FilePreviewItem file={selectedFile} onRemove={() => setSelectedFile(null)} />
            )}

            {editingPdf && !selectedFile && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-500">description</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-700 truncate">{editingPdf.title}</p>
                  <p className="text-[10px] font-medium text-blue-500 uppercase">Existing File</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Upload PDF</label>
              <UploadArea
                title="SELECT FILE"
                subtitle="Click or drag PDF here"
                accept=".pdf"
                onFileSelect={(file) => {
                  setSelectedFile(file);
                  if (!formData.title) setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
                }}
                className="h-[140px]"
              />
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">E-Book Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Enter Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Price (₹)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-gray-700 ml-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortBy}
                    onChange={(e) => setFormData({ ...formData, sortBy: Number(e.target.value) })}
                    className="w-full h-[52px] px-5 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-500 transition-all bg-white"
                  />
                </div>
              </div>
            </div>
          </DrawerBody>
          <DrawerFooter className="p-0 border-none">
            <PrimaryButton
              onClick={handleSubmit}
              className="h-[64px]"
            >
              {editingPdf ? 'Update E-Book' : 'Add E-Book'}
            </PrimaryButton>
          </DrawerFooter>
        </RightSideDrawer>
      </div>
    </div>
  );
};

export default PDFs;
