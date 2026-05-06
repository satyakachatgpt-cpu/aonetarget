import React, { useState, useEffect, useRef } from 'react';
import { topicsAPI } from '../../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from '../DrawerSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Topic {
  _id?: string;
  id: string;
  name: string;
  subject: string;
  status: 'active' | 'inactive';
  createdDate: string;
  sortBy?: number;
  order?: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SortableRow = ({ item, idx, currentPage, itemsPerPage, activeMenu, setActiveMenu, onToggleStatus, onEdit, onDelete }: any) => {
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
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`hover:bg-gray-50/50 transition-colors group ${isDragging ? 'bg-gray-100' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
          </button>
          <span className="font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
        </div>
      </td>
      <td className="px-5 py-4 font-bold text-gray-700">{item.name}</td>
      <td className="px-5 py-4">
        <div className="w-[60px] h-[36px] bg-[#f9fafb] rounded-md overflow-hidden border border-gray-100 flex items-center justify-center group-hover:border-gray-200 transition-all">
          <span className="material-symbols-outlined text-gray-200 text-[24px]">image</span>
        </div>
      </td>
      <td className="px-5 py-4 font-bold">
        <span className="px-2.5 py-1 bg-[#f2f2f2] rounded-md text-[11px] font-bold text-gray-500 border border-gray-50 inline-block min-w-[44px] text-center">
          {(item.sortBy || 0).toFixed(2)}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Actions
            <span className="material-symbols-outlined text-[14px] text-gray-400">expand_more</span>
          </button>

          {activeMenu === item.id && (
            <div className={`absolute right-0 top-full mt-1 w-[160px] bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] z-[999] py-1.5 animate-in fade-in zoom-in duration-200 origin-top-right`}>
              <button
                onClick={() => onToggleStatus(item)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors ${item.status === 'active' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {item.status === 'active' ? 'visibility_off' : 'visibility'}
                </span>
                {item.status === 'active' ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onEdit(item)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-blue-400">edit</span>
                Edit
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const Topics: React.FC<Props> = ({ showToast }) => {
  const [items, setItems] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    status: 'active' as 'active' | 'inactive',
    sortBy: '0.00'
  });

  const filterRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadItems();
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadItems = async () => {
    try {
      const data = await topicsAPI.getAll().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load topics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => (item._id || item.id) === active.id);
    const newIndex = items.findIndex((item) => (item._id || item.id) === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex);
    
    // Optimistic UI update with order and sortBy sync
    const updatedWithOrder = newItems.map((item, index) => ({
      ...item,
      order: index + 1,
      sortBy: index + 1 // Keep sortBy in sync with order for visibility
    }));
    setItems(updatedWithOrder);

    try {
      const orderedIds = updatedWithOrder.map(item => item._id || item.id);
      await topicsAPI.reorder(orderedIds);
      showToast('Reordered successfully');
    } catch (error) {
      showToast('Failed to reorder', 'error');
      loadItems();
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isSearchOrFilterActive = searchQuery !== '' || statusFilter !== 'all';
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async () => {
    if (!formData.name) { showToast('Please enter topic name', 'error'); return; }
    try {
      const data = {
        id: editingItem?.id || `topic_${Date.now()}`,
        name: formData.name,
        subject: formData.subject,
        status: formData.status,
        sortBy: parseFloat(formData.sortBy) || 0,
        createdDate: editingItem?.createdDate || new Date().toISOString()
      };
      if (editingItem) {
        await topicsAPI.update(editingItem.id, data);
        showToast('Topic updated successfully!');
      } else {
        await topicsAPI.create(data);
        showToast('Topic created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', subject: '', status: 'active', sortBy: '0.00' });
      loadItems();
    } catch (error) {
      showToast('Failed to save topic', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      try {
        await topicsAPI.delete(id);
        showToast('Topic deleted successfully!');
        loadItems();
      } catch (error) {
        showToast('Failed to delete topic', 'error');
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header with Search and Actions - More Compact */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-gray-800 tracking-tight">Topics</h2>
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <div className="relative group flex-1 sm:w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[13px] font-bold transition-all shadow-sm ${isFilterOpen ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Filters
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] p-3 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filters</h4>
                  <button onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Status</label>
                  <div className="flex flex-col gap-1">
                    {['all', 'active', 'inactive'].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setIsFilterOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${statusFilter === status ? 'bg-gray-50 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        {status === 'all' ? 'All Topics' : status === 'active' ? 'Active Only' : 'Inactive Only'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditingItem(null); setFormData({ name: '', subject: '', status: 'active', sortBy: '0.00' }); setShowModal(true); }}
            className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px] font-black">add</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[1rem] shadow-sm border border-gray-100 overflow-visible pb-32 -mb-32">
        <div className="overflow-visible">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-[#f8f8f8] border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1 cursor-pointer">
                      S. NO. <span className="material-symbols-outlined text-[12px]">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1 cursor-pointer">
                      TOPIC <span className="material-symbols-outlined text-[12px]">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      SUBJECT LOGO <span className="material-symbols-outlined text-[12px]">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1 cursor-pointer">
                      SORT BY <span className="material-symbols-outlined text-[12px]">unfold_more</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[13px]">
                <SortableContext
                  items={paginatedItems.map(item => item._id || item.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={isSearchOrFilterActive}
                >
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <span className="material-symbols-outlined text-5xl text-gray-100 mb-2 block">topic</span>
                        <p className="text-gray-400 font-medium">No topics found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <SortableRow
                        key={item._id || item.id}
                        item={item}
                        idx={idx}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        activeMenu={activeMenu}
                        setActiveMenu={setActiveMenu}
                        onToggleStatus={async (item: Topic) => {
                          try {
                            const newStatus = item.status === 'active' ? 'inactive' : 'active';
                            await topicsAPI.update(item.id, { ...item, status: newStatus });
                            showToast(`Topic ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`);
                            loadItems();
                            setActiveMenu(null);
                          } catch (error) {
                            showToast('Failed to update status', 'error');
                          }
                        }}
                        onEdit={(item: Topic) => {
                          setEditingItem(item);
                          setFormData({ name: item.name, subject: item.subject, status: item.status, sortBy: (item.sortBy || 0).toFixed(2) });
                          setShowModal(true);
                          setActiveMenu(null);
                        }}
                        onDelete={(id: string) => { handleDelete(id); setActiveMenu(null); }}
                      />
                    ))
                  )}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>

        {/* Pagination Footer - More Compact */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white text-[12px]">
          <div className="flex items-center gap-3">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 bg-white border border-gray-200 rounded-md outline-none cursor-pointer font-bold text-[11px]"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span className="text-gray-400 italic font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
            </span>
          </div>

          <div className="flex items-center p-1 bg-gray-50 border border-gray-200 rounded-xl">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-3 flex items-center justify-center font-bold text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30"
            >
              Prev
            </button>
            <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>
            <div className="flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, i, arr) => (
                  <React.Fragment key={page}>
                    {i > 0 && page - arr[i - 1] > 1 && <span className="px-1.5 text-gray-300">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 flex items-center justify-center font-black transition-all rounded-lg ${page === currentPage ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-black hover:bg-white'}`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))
              }
            </div>
            <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-3 flex items-center justify-center font-bold text-gray-400 hover:text-black hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Premium Add/Edit Topic Side Drawer - Matching CMS Pattern */}
      <RightSideDrawer isOpen={showModal} onClose={() => setShowModal(false)} width="650px">
        <DrawerHeader
          title={editingItem ? 'Edit Topic' : 'Add Topic'}
          onClose={() => setShowModal(false)}
        />

        <DrawerBody className="bg-[#fcf8f8]">
          <div className="space-y-8 min-h-[400px]">
            <div>
              <h4 className="text-[15px] font-bold text-gray-700 mb-6 flex items-center gap-2">
                <span className="w-1 h-4 bg-black rounded-full block"></span>
                Topic Details
              </h4>

              <div className="grid grid-cols-12 gap-6">
                {/* Title Field */}
                <div className="col-span-8">
                  <label className="block text-[13px] font-bold text-gray-600 mb-2 ml-1">Title<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter here"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 h-[52px] px-5 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                  />
                </div>

                {/* Sorting Order Field */}
                <div className="col-span-4">
                  <label className="block text-[13px] font-bold text-gray-600 mb-2 ml-1">Sorting Order</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.0"
                    value={formData.sortBy}
                    onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
                    className="w-full bg-white border border-gray-200 h-[52px] px-5 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div className="space-y-4">
              <label className="block text-[13px] font-bold text-gray-600 ml-1">Image</label>
              <div className="flex gap-5">
                {/* Image Placeholder */}
                <div className="w-[180px] h-[140px] bg-[#ededed] rounded-2xl flex flex-col items-center justify-center gap-2 border border-gray-100">
                  <span className="material-symbols-outlined text-gray-400 text-[36px]">image_search</span>
                  <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tighter">No Image</span>
                </div>

                {/* Upload Area */}
                <div className="flex-1 h-[140px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gray-400 hover:bg-white/50 transition-all bg-white/30">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center mb-1">
                    <span className="material-symbols-outlined text-[24px] text-gray-400">upload_file</span>
                  </div>
                  <h5 className="text-[15px] font-bold text-gray-500">Upload Image</h5>
                  <p className="text-[11px] font-medium text-gray-300">Click or Drag & Drop your file here.</p>
                </div>
              </div>
            </div>
          </div>
        </DrawerBody>

        <DrawerFooter>
          <button
            onClick={handleSubmit}
            className="w-full h-[70px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight hover:bg-black transition-all flex items-center justify-center active:scale-[0.98]"
          >
            Submit
          </button>
        </DrawerFooter>
      </RightSideDrawer>
    </div>
  );
};

export default Topics;

