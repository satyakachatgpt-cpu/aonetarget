import React, { useState, useEffect } from 'react';
import { instructionsAPI } from '../../../services/apiClient';
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

interface Instruction { 
  _id?: string;
  id: string; 
  title: string; 
  content: string; 
  category: string; 
  status: 'active' | 'inactive'; 
  createdDate: string;
  order?: number;
}

interface Props { showToast: (m: string, type?: 'success' | 'error') => void; }

const SortableRow = ({ item, idx, currentPage, itemsPerPage, onEdit, onDelete }: any) => {
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
      className={`border-b border-gray-50 hover:bg-gray-50/50 group ${isDragging ? 'bg-blue-50' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition-colors">
            <span className="material-icons-outlined text-base">drag_indicator</span>
          </button>
          <span className="font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
        </div>
      </td>
      <td className="px-6 py-4 font-bold text-navy">{item.title}</td>
      <td className="px-6 py-4 text-gray-600">{item.category}</td>
      <td className="px-6 py-4 text-center">
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${item.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
          {item.status}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg">
            <span className="material-icons-outlined text-base">edit</span>
          </button>
          <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg">
            <span className="material-icons-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const Instructions: React.FC<Props> = ({ showToast }) => {
  const [items, setItems] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Instruction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', category: '', status: 'active' as 'active' | 'inactive' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await instructionsAPI.getAll().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load', 'error');
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
    
    // Optimistic UI update with order sync
    const updatedWithOrder = newItems.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setItems(updatedWithOrder);

    try {
      const orderedIds = updatedWithOrder.map(item => item._id || item.id);
      await instructionsAPI.reorder(orderedIds);
      showToast('Reordered successfully');
    } catch (error) {
      showToast('Failed to reorder', 'error');
      loadItems();
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isSearchOrFilterActive = searchQuery !== '' || statusFilter !== 'all';
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async () => {
    if (!formData.title) { showToast('Fill required fields', 'error'); return; }
    try {
      const data = {
        id: editingItem?.id || `instruction_${Date.now()}`,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        status: formData.status,
        createdDate: editingItem?.createdDate || new Date().toISOString()
      };
      if (editingItem) {
        await instructionsAPI.update(editingItem.id, data);
        showToast('Updated!');
      } else {
        await instructionsAPI.create(data);
        showToast('Created!');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: '', content: '', category: '', status: 'active' });
      loadItems();
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete?')) {
      try {
        await instructionsAPI.delete(id);
        showToast('Deleted!');
        loadItems();
      } catch (error) {
        showToast('Failed', 'error');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div><h3 className="text-lg font-black text-navy uppercase tracking-widest">Instructions</h3><p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Total: {items.length}</p></div>
        <button onClick={() => { setEditingItem(null); setFormData({ title: '', content: '', category: '', status: 'active' }); setShowModal(true); }} className="bg-navy text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center gap-2"><span className="material-icons-outlined text-base">add</span> Add</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative group">
          <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-navy transition-colors">search</span>
          <input
            type="text"
            placeholder="Search instructions..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-gray-200 transition-all"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-6 py-3 border rounded-xl text-[12px] font-bold transition-all shadow-sm ${isFilterOpen ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-[100] p-4 animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Filters</h4>
                <button onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Instruction Status</label>
                  <div className="flex flex-col gap-1">
                    {['all', 'active', 'inactive'].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setStatusFilter(status); setIsFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === status ? 'bg-navy/5 text-navy' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        {status === 'all' ? 'All Instructions' : status === 'active' ? 'Active Only' : 'Inactive Only'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
          className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-600 outline-none hover:bg-white transition-all shadow-sm cursor-pointer"
        >
          <option value="10">10 per page</option>
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-icons-outlined text-5xl text-gray-200 block mb-4">description</span>
            <p className="text-gray-400 font-bold uppercase">No instructions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-left font-black text-gray-600 uppercase tracking-wider">#</th>
                      <th className="px-6 py-4 text-left font-black text-gray-600 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-4 text-left font-black text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-center font-black text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center font-black text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={paginatedItems.map(item => item._id || item.id)}
                      strategy={verticalListSortingStrategy}
                      disabled={isSearchOrFilterActive}
                    >
                      {paginatedItems.map((item, idx) => (
                        <SortableRow
                          key={item._id || item.id}
                          item={item}
                          idx={idx}
                          currentPage={currentPage}
                          itemsPerPage={itemsPerPage}
                          onEdit={(item: Instruction) => {
                            setEditingItem(item);
                            setFormData({ title: item.title, content: item.content, category: item.category, status: item.status });
                            setShowModal(true);
                          }}
                          onDelete={handleDelete}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
            <div className="flex items-center justify-between bg-gray-50 border-t border-gray-100 px-6 py-4">
              <p className="text-sm font-bold text-gray-600">Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}</p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 hover:bg-white rounded-lg disabled:opacity-50"><span className="material-icons-outlined">chevron_left</span></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-2 rounded-lg font-black text-sm ${page === currentPage ? 'bg-navy text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 hover:bg-white rounded-lg disabled:opacity-50"><span className="material-icons-outlined">chevron_right</span></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl border border-gray-100">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
              <h3 className="text-lg font-black text-navy uppercase tracking-widest">{editingItem ? 'Edit' : 'Add'} Instruction</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-icons-outlined">close</span></button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase mb-2">Title *</label>
                <input type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:ring-2 focus:ring-navy/10" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase mb-2">Content</label>
                <textarea placeholder="Content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:ring-2 focus:ring-navy/10 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase mb-2">Category</label>
                <input type="text" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:ring-2 focus:ring-navy/10" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-lg font-bold outline-none focus:ring-2 focus:ring-navy/10">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 px-8 py-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-black uppercase hover:bg-gray-300">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 bg-navy text-white py-3 rounded-lg font-black uppercase hover:bg-blue-900">{editingItem ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Instructions;

