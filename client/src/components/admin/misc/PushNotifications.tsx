import React, { useState, useEffect } from 'react';
import { notificationsAPI, coursesAPI } from '../../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from '../DrawerSystem';

interface Notification { id?: string; _id?: string; title: string; message: string; type: string; status: 'sent' | 'pending'; createdDate?: string; createdAt?: string; targetCourseId?: string; }

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
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({ title: '', message: '', type: '', status: 'pending' as 'sent' | 'pending', targetCourseId: 'all' });

  useEffect(() => { 
    loadItems(); 
    loadCourses();

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

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      if (Array.isArray(data)) {
        setCourses(data);
      } else if (data && Array.isArray(data.courses)) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to load courses', error);
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
        id: editingItem?._id || editingItem?.id || `notif_${Date.now()}`,
        title: formData.title,
        message: formData.message,
        type: formData.type,
        status: formData.status,
        targetCourseId: formData.targetCourseId,
        createdDate: editingItem?.createdDate || editingItem?.createdAt || new Date().toISOString()
      };
      if (editingItem) {
        await notificationsAPI.update(editingItem._id || editingItem.id || '', data);
        showToast('Updated!');
      } else {
        await notificationsAPI.create(data);
        showToast('Created!');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: '', message: '', type: '', status: 'pending', targetCourseId: 'all' });
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
            onClick={() => { setEditingItem(null); setFormData({ title: '', message: '', type: '', status: 'pending', targetCourseId: 'all' }); setShowModal(true); }}
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
                  {paginatedItems.map((item, idx) => {
                    const itemId = item._id || item.id || `temp_${idx}`;
                    const itemDate = item.createdDate || item.createdAt || new Date().toISOString();
                    return (
                    <tr key={itemId} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
                        {new Date(itemDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')} at {new Date(itemDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-5 min-w-[240px]">
                        <div>
                          <p className="text-[13px] font-bold text-[#4361EE] group-hover:text-blue-700 transition-colors">{item.title}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded capitalize ${item.targetCourseId && item.targetCourseId !== 'all' ? 'bg-purple-100 text-purple-700' : 'bg-[#e5eaff] text-[#4361EE]'}`}>
                            {item.targetCourseId && item.targetCourseId !== 'all' ? 'Batch specific' : 'All Students'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-500 max-w-md truncate">{item.message}</td>
                      <td className="px-6 py-5 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === itemId ? null : itemId);
                            }}
                            className={`flex items-center gap-1 px-4 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${activeMenuId === itemId ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === itemId ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          <div className={`absolute right-0 ${idx >= paginatedItems.length - 2 && paginatedItems.length > 2 ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'} w-32 bg-white border border-gray-100 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === itemId ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button onClick={() => { setEditingItem(item); setFormData({ title: item.title, message: item.message, type: item.type, status: item.status, targetCourseId: item.targetCourseId || 'all' }); setShowModal(true); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">edit</span> Edit
                            </button>
                            <button onClick={() => { handleDelete(itemId); setActiveMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">delete</span> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination Footer */}
            {!loading && filteredItems.length > 0 && (
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
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{" "}
                    {filteredItems.length} entries
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

            {/* Target Batch */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Send To (Batch) <span className="text-red-500">*</span></label>
              <select
                value={formData.targetCourseId || 'all'}
                onChange={(e) => setFormData({ ...formData, targetCourseId: e.target.value })}
                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all bg-white shadow-sm"
              >
                <option value="all">All Students (Global)</option>
                {courses.map(course => (
                  <option key={course.id || course._id} value={course.id || course._id}>
                    {course.title || course.name || 'Unnamed Course'}
                  </option>
                ))}
              </select>
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

