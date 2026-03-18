import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from '../DrawerSystem';

interface Notification { id: string; title: string; message: string; type: string; status: 'sent' | 'pending'; createdDate: string; }

interface Props { showToast: (m: string, type?: 'success' | 'error') => void; }

const PushNotifications: React.FC<Props> = ({ showToast }) => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', message: '', type: '', status: 'pending' as 'sent' | 'pending' });

  useEffect(() => { 
    loadItems(); 

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadItems = async () => {
    try {
      const data = await notificationsAPI.getAll().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async () => {
    if (!formData.title || !formData.message) { showToast('Please fill required fields', 'error'); return; }
    try {
      const data = {
        id: editingItem?.id || `notif_${Date.now()}`,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        status: formData.status,
        createdDate: editingItem?.createdDate || new Date().toISOString()
      };
      if (editingItem) {
        await notificationsAPI.update(editingItem.id, data);
        showToast('Updated!');
      } else {
        await notificationsAPI.create(data);
        showToast('Created!');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: '', message: '', type: '', status: 'pending' });
      loadItems();
    } catch (error) {
      showToast('Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete?')) {
      try {
        await notificationsAPI.delete(id);
        showToast('Deleted!');
        loadItems();
      } catch (error) {
        showToast('Failed', 'error');
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div></div>;

  return (
    <div className="space-y-4">

      {/* Header with search, add, filter */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">Notifications</h3>

        <div className="flex items-center gap-4">
          <div className="relative group w-64 lg:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={() => { setEditingItem(null); setFormData({ title: '', message: '', type: '', status: 'pending' }); setShowModal(true); }}
            className="w-9 h-9 bg-[#1a1c1e] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black transition-all"
          >
            <span className="material-icons-outlined text-lg">add</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-2xl z-[100] p-5 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Items</h4>
                  <button
                    onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'all', label: 'All', icon: 'notifications_active' },
                      { id: 'sent', label: 'Sent', icon: 'done_all', color: 'text-green-500' },
                      { id: 'pending', label: 'Pending', icon: 'schedule', color: 'text-amber-500' }
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-icons-outlined text-5xl text-gray-200 block mb-4">notifications</span>
            <p className="text-gray-400 font-bold uppercase">No notifications found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-visible">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-20">S. No.</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                        Date & Time
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                        Title
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                        Message
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
                        {new Date(item.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')} at {new Date(item.createdDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-5 min-w-[240px]">
                        <div>
                          <p className="text-[13px] font-bold text-[#4361EE] group-hover:text-blue-700 transition-colors">{item.title}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#e5eaff] text-[#4361EE] text-[10px] font-bold rounded capitalize">One Time</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-500 max-w-md truncate">{item.message}</td>
                      <td className="px-6 py-5 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === item.id ? null : item.id);
                            }}
                            className={`flex items-center gap-1 px-4 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${activeMenuId === item.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === item.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          <div className={`absolute right-0 ${idx >= paginatedItems.length - 2 ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'} w-32 bg-white border border-gray-100 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === item.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button onClick={() => { setEditingItem(item); setFormData({ title: item.title, message: item.message, type: item.type, status: item.status }); setShowModal(true); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">edit</span> Edit
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">delete</span> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between bg-white px-6 py-4 border-t border-gray-100">
              <p className="text-[12px] font-bold text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg disabled:opacity-30 transition-all border border-gray-100"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${page === currentPage ? 'bg-navy text-white shadow-md shadow-navy/20' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-lg disabled:opacity-30 transition-all border border-gray-100"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <RightSideDrawer isOpen={showModal} onClose={() => setShowModal(false)} width="500px">
        <DrawerHeader
          title={editingItem ? 'Edit Notification' : 'Send Notification'}
          onClose={() => setShowModal(false)}
        />

        <DrawerBody className="bg-[#fcfcfc]">
          <div className="space-y-8 pb-10">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Notification title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-300 bg-white shadow-sm"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Message <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Notification message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full h-[120px] px-5 py-4 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all resize-none placeholder:text-gray-300 bg-white shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Type */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Type</label>
                <input
                  type="text"
                  placeholder="e.g., Promotion"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all bg-white shadow-sm"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Status</label>
                <div className="flex bg-[#f8fafc] p-1.5 rounded-[20px] w-full border border-gray-100 h-[54px]">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'pending' })}
                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'pending' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'sent' })}
                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'sent' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Sent
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DrawerBody>

        <DrawerFooter className="p-6 bg-gray-50 flex gap-4">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 bg-white border border-gray-200 text-gray-700 h-[60px] rounded-2xl font-black uppercase hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-navy text-white h-[60px] rounded-2xl font-black uppercase hover:bg-blue-900 transition-all shadow-lg shadow-navy/20 active:scale-95"
          >
            {editingItem ? 'Update' : 'Send'}
          </button>
        </DrawerFooter>
      </RightSideDrawer>
    </div>
  );
};

export default PushNotifications;

