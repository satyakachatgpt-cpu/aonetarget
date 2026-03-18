import React, { useState, useEffect, useRef } from 'react';
import { examDocumentsAPI } from '../../../services/apiClient';
import { 
  RightSideDrawer, 
  DrawerHeader, 
  DrawerBody, 
  DrawerFooter, 
  FormLabel, 
  FormInput, 
  FormSelect, 
  UploadArea, 
  FilePreviewItem, 
  PrimaryButton 
} from '../DrawerSystem';
import RichTextEditor from '../../shared/RichTextEditor';

interface ExamDoc { 
  id: string; 
  title: string; 
  exam: string; 
  fileUrl: string; 
  status: 'active' | 'inactive'; 
  createdDate: string;
  price?: number;
  mrp?: number;
  sortingOrder?: number;
  category?: string;
  description?: string;
  expiryMode?: string;
  validity?: string;
  exportPdf?: string;
}

interface Props { showToast: (m: string, type?: 'success' | 'error') => void; }

const ExamDocuments: React.FC<Props> = ({ showToast }) => {
  const [items, setItems] = useState<ExamDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<ExamDoc | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Docs & Ebooks');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // File states for the drawer
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [demoPdfFile, setDemoPdfFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({ 
    title: '', 
    category: '', 
    fileUrl: '', 
    status: 'Paid' as 'Paid' | 'Free',
    price: '',
    mrp: '',
    sortingOrder: '0',
    exportPdf: 'Yes',
    expiryMode: 'Validity',
    validity: '',
    description: '',
    discountCodes: ''
  });

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadItems = async () => {
    try {
      const data = await examDocumentsAPI.getAll().catch(() => []);
      const enhancedData = (Array.isArray(data) ? data : []).map((item, idx) => ({
        ...item,
        price: (item as any).price || (idx % 2 === 0 ? 50 : 100),
        mrp: (item as any).mrp || (idx % 2 === 0 ? 150 : 200),
        sortingOrder: (item as any).sortingOrder || (3 + idx * 2),
        category: (item as any).category || 'EBooks'
      }));
      setItems(enhancedData);
    } catch (error) {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && item.status === 'active') || 
      (statusFilter === 'inactive' && item.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenDrawer = (item: ExamDoc | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        category: item.category || '',
        fileUrl: item.fileUrl,
        status: (item as any).price === 0 ? 'Free' : 'Paid',
        price: String(item.price || ''),
        mrp: String(item.mrp || ''),
        sortingOrder: String(item.sortingOrder || '0'),
        exportPdf: item.exportPdf || 'Yes',
        expiryMode: item.expiryMode || 'Validity',
        validity: item.validity || '',
        description: item.description || '',
        discountCodes: ''
      });
      // In a real app, we'd load the file objects here if needed, but for now we'll just handle the UI
      setPdfFile(null); // Assuming we don't reload the File object itself for editing
      setDemoPdfFile(null);
      setThumbnailFile(null);
    } else {
      setEditingItem(null);
      setFormData({ 
        title: '', 
        category: '', 
        fileUrl: '', 
        status: 'Paid', 
        price: '', 
        mrp: '', 
        sortingOrder: '0', 
        exportPdf: 'Yes', 
        expiryMode: 'Validity', 
        validity: '', 
        description: '', 
        discountCodes: '' 
      });
      setPdfFile(null);
      setDemoPdfFile(null);
      setThumbnailFile(null);
    }
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!formData.title && !pdfFile) { showToast('Please upload a PDF and set a title', 'error'); return; }
    try {
      const data = {
        id: editingItem?.id || `examdoc_${Date.now()}`,
        title: formData.title || (pdfFile ? pdfFile.name.replace('.pdf', '') : ''),
        exam: formData.category || 'EBooks',
        fileUrl: formData.fileUrl || (pdfFile ? URL.createObjectURL(pdfFile) : ''),
        status: (formData.status === 'Paid' ? 'active' : 'inactive') as 'active' | 'inactive',
        createdDate: editingItem?.createdDate || new Date().toISOString(),
        price: Number(formData.price),
        mrp: Number(formData.mrp),
        sortingOrder: Number(formData.sortingOrder),
        category: formData.category,
        description: formData.description,
        expiryMode: formData.expiryMode,
        validity: formData.validity,
        exportPdf: formData.exportPdf
      };
      
      if (editingItem) {
        await examDocumentsAPI.update(editingItem.id, data as any);
        showToast('Document updated successfully!');
      } else {
        await examDocumentsAPI.create(data as any);
        showToast('New document created successfully!');
      }
      setShowDrawer(false);
      loadItems();
    } catch (error) {
      showToast('Failed to save document', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await examDocumentsAPI.delete(id);
        showToast('Document deleted successfully!');
        loadItems();
      } catch (error) {
        showToast('Failed to delete document', 'error');
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mb-4"></div>
      <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">Loading documents...</p>
    </div>
  );

  return (
    <div className="w-full bg-[#fafafa] animate-in fade-in duration-500 pb-10">
      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 h-[56px] flex items-center px-4 overflow-hidden">
          <button
            className="h-full px-6 text-[13px] font-semibold transition-all relative flex items-center whitespace-nowrap text-black"
          >
            Docs & Ebooks
            <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-black"></div>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
        <div>
          <h2 className="text-[18px] font-bold text-gray-800 tracking-tight">Docs & Ebooks</h2>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="relative group flex-1 sm:w-[240px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-[14px] font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
          <button
            onClick={() => handleOpenDrawer()}
            className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined font-black">add</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 mb-6 overflow-visible">
        <div className="">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-[#f2f2f2] border-b border-gray-200">
              <tr>
                <th className="px-8 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1 cursor-pointer">
                    S. NO. <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1 cursor-pointer">
                    TITLE <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1 cursor-pointer">
                    CATEGORY <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1 cursor-pointer">
                    PRICE <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1 cursor-pointer">
                    SORTING ORDER <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-200 mb-2 block">description</span>
                    <p className="text-gray-400 font-medium tracking-tight">No records found</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const isLastFew = index > 2 && index >= paginatedItems.length - 2;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6 text-[14px] font-bold text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-6 py-6 max-w-[400px]">
                        <span className="text-[14px] font-bold text-navy tracking-tight leading-snug">
                          {item.title}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-[14px] font-bold text-gray-600">
                        {item.category || item.exam || 'EBooks'}
                      </td>
                      <td className="px-6 py-6 text-[14px] font-black text-gray-800">
                        ₹{item.price || 0}
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1.5 bg-[#f2f2f2] rounded-lg text-[12px] font-bold text-gray-400 border border-gray-50 shadow-sm inline-block">
                          {(item.sortingOrder || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="relative inline-block text-left" ref={activeMenuId === item.id ? menuRef : null}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm ml-auto"
                          >
                            Actions
                            <span className="material-symbols-outlined text-[16px] text-gray-400 group-hover:text-gray-600">expand_more</span>
                          </button>

                          {activeMenuId === item.id && (
                            <div className={`absolute right-0 ${isLastFew ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-[180px] bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[9999] py-2 animate-in fade-in zoom-in duration-200`}>
                              <button
                                onClick={() => { setActiveMenuId(null); handleOpenDrawer(item); }}
                                className="w-full flex items-center gap-3 px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[#8AA8EF] text-[18px]">edit</span>
                                Edit
                              </button>
                              <button
                                onClick={() => { setActiveMenuId(null); handleDelete(item.id); }}
                                className="w-full flex items-center gap-3 px-5 py-2.5 text-[14px] font-bold text-[#E84E4E] hover:bg-red-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[#E84E4E] text-[18px]">delete</span>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-8 py-6 border-t border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-[80px]">
              <FormSelect
                value={String(itemsPerPage)}
                onChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}
                options={[
                  { value: '10', label: '10' },
                  { value: '25', label: '25' },
                  { value: '50', label: '50' }
                ]}
                className="!h-[40px]"
              />
            </div>
            <span className="text-[13px] font-medium text-gray-400 italic">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
            </span>
          </div>

          <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-30"
            >
              Previous
            </button>
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`h-9 w-9 flex items-center justify-center text-[13px] font-black transition-all rounded-xl ${currentPage === pageNum ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                {pageNum}
              </button>
            ))}
            <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Right Side Drawer for Adding/Editing Docs */}
      <RightSideDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} width="480px">
        <DrawerHeader title={`${editingItem ? 'Edit' : 'Add'} Docs`} onClose={() => setShowDrawer(false)} />
        
        <DrawerBody className="space-y-8 p-8">
          {/* Main PDF Upload Section (Screenshot 2) */}
          <div className="space-y-4">
            <FormLabel label="Select PDFs" />
            {!pdfFile ? (
              <UploadArea 
                title="Upload PDF" 
                subtitle="Click or Drag & Drop your file here." 
                accept=".pdf"
                onFileSelect={(file) => {
                  setPdfFile(file);
                  if (!formData.title) setFormData({ ...formData, title: file.name.replace('.pdf', '') });
                }}
              />
            ) : (
              <div className="space-y-3">
                <FilePreviewItem file={pdfFile} onRemove={() => setPdfFile(null)} />
                <p className="text-[12px] font-bold text-green-500 uppercase tracking-widest text-center">Upload complete</p>
              </div>
            )}
          </div>

          {/* Rest of the options appear only after PDF is uploaded (Screenshots 3, 4, 5) */}
          {(pdfFile || editingItem) && (
            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 text-center">
                  <FormLabel label="Demo PDF" />
                  {!demoPdfFile ? (
                    <UploadArea 
                      title="Upload PDF" 
                      subtitle="Click or Drag & Drop your file here." 
                      className="!h-[140px] !rounded-[24px]"
                      accept=".pdf"
                      onFileSelect={setDemoPdfFile}
                    />
                  ) : (
                    <div className="relative group">
                      <div className="h-[140px] bg-gray-50 border border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-2">
                         <span className="material-symbols-outlined text-[28px] text-gray-400">description</span>
                         <span className="text-[10px] font-bold text-gray-500 truncate w-full px-4">{demoPdfFile.name}</span>
                      </div>
                      <button onClick={() => setDemoPdfFile(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-xs">close</span></button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center">
                  <FormLabel label="Thumbnail" />
                  {!thumbnailFile ? (
                    <UploadArea 
                      title="Upload Image" 
                      subtitle="Click or Drag & Drop your file here." 
                      className="!h-[140px] !rounded-[24px]"
                      accept="image/*"
                      onFileSelect={setThumbnailFile}
                    />
                  ) : (
                    <div className="relative group">
                      <div className="h-[140px] bg-gray-50 border border-gray-100 rounded-[24px] overflow-hidden">
                        <img src={URL.createObjectURL(thumbnailFile)} alt="Thumbnail" className="w-full h-full object-cover" />
                      </div>
                      <button onClick={() => setThumbnailFile(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-xs">close</span></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormLabel label="Price" required />
                  <FormInput 
                    placeholder="Enter price in INR" 
                    value={formData.price} 
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="MRP" />
                  <FormInput 
                    placeholder="0" 
                    value={formData.mrp} 
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel label="Category" required />
                <FormSelect 
                  value={formData.category} 
                  onChange={(val) => setFormData({ ...formData, category: val })} 
                  placeholder="Select Category"
                  options={[
                    { value: 'EBooks', label: 'EBooks' },
                    { value: 'PDF Tests', label: 'PDF Tests' },
                    { value: 'Notes', label: 'Notes' },
                    { value: 'Magazines', label: 'Magazines' }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <FormLabel label="Featured Discount Codes" />
                <div className="relative group">
                   <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                   <FormInput 
                    placeholder="Search" 
                    value={formData.discountCodes} 
                    onChange={(e) => setFormData({ ...formData, discountCodes: e.target.value })} 
                    className="pl-11"
                   />
                </div>
                <p className="text-[10px] font-bold text-gray-400 italic ml-1 select-none">Selected coupon codes will be featured on course page</p>
              </div>

              <div className="space-y-2">
                <FormLabel label="Sorting Order" />
                <FormInput 
                  type="number"
                  placeholder="0" 
                  value={formData.sortingOrder} 
                  onChange={(e) => setFormData({ ...formData, sortingOrder: e.target.value })} 
                />
              </div>

              <div className="space-y-2">
                <FormLabel label="Export PDF" required />
                <FormSelect 
                  value={formData.exportPdf} 
                  onChange={(val) => setFormData({ ...formData, exportPdf: val })} 
                  options={[
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' }
                  ]}
                />
              </div>

              <div className="space-y-2">
                <FormLabel label="Status" required />
                <div className="flex bg-gray-100 p-1 rounded-2xl h-[52px]">
                   <button 
                    onClick={() => setFormData({ ...formData, status: 'Free' })}
                    className={`flex-1 rounded-xl text-[13px] font-bold transition-all ${formData.status === 'Free' ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Free
                   </button>
                   <button 
                    onClick={() => setFormData({ ...formData, status: 'Paid' })}
                    className={`flex-1 rounded-xl text-[13px] font-bold transition-all ${formData.status === 'Paid' ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                     Paid
                   </button>
                </div>
              </div>

              <div className="space-y-4">
                <FormLabel label="Expiry Mode" required />
                <div className="flex bg-gray-100 p-1 rounded-2xl h-[52px]">
                   {['Validity', 'End Date', 'Lifetime Access'].map(mode => (
                     <button 
                      key={mode}
                      onClick={() => setFormData({ ...formData, expiryMode: mode })}
                      className={`flex-1 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${formData.expiryMode === mode ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                     >
                       {mode}
                     </button>
                   ))}
                </div>
                
                {formData.expiryMode === 'Validity' && (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <FormLabel label="Validity" required />
                    <FormInput 
                      placeholder="6" 
                      value={formData.validity} 
                      onChange={(e) => setFormData({ ...formData, validity: e.target.value })} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <RichTextEditor 
                  label="Description"
                  content={formData.description}
                  onChange={(data) => setFormData({ ...formData, description: data })}
                />
              </div>
            </div>
          )}
        </DrawerBody>

        <DrawerFooter>
          <PrimaryButton 
            onClick={handleSave} 
            className="!h-[64px]"
            disabled={!pdfFile && !editingItem}
          >
            Save changes
          </PrimaryButton>
        </DrawerFooter>
      </RightSideDrawer>
    </div>
  );
};

export default ExamDocuments;

