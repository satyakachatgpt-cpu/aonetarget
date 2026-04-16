import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from '../DrawerSystem';
import { getAdminHeaders } from '../../../services/apiClient';

interface UserRecord {
  id: string; // This is the MongoDB _id string from the backend
  name: string;
  email: string;
  phone: string;
  registrationDate: string | Date;
  appRegistered: boolean;
  registrationType: string;
  deviceId: string;
  status: string;
  lastLogin: string | Date;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const NoPurchaseReport: React.FC<Props> = ({ showToast }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Drawer/Modal State
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: ''
  });
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Date Input Refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  // Debounce search effect (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); 
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (debouncedSearch) query.append('search', debouncedSearch);
      query.append('page', currentPage.toString());
      query.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/admin/reports/no-purchase?${query.toString()}`, {
          headers: getAdminHeaders()
      });
      const data = await res.json();
      setUsers(data.users || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load registered users report', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, debouncedSearch, currentPage, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExportCSV = () => {
    if (users.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const exportData = users.map((u, idx) => ({
      'S.No': (currentPage - 1) * itemsPerPage + idx + 1,
      'Name': u.name,
      'Email': u.email,
      'Phone': u.phone,
      'Registration Date': u.registrationDate ? new Date(u.registrationDate).toLocaleString('en-IN') : '-',
      'Registration Type': u.registrationType,
      'Device ID': u.deviceId,
      'App Registered': u.appRegistered ? 'Yes' : 'No',
      'Last Interaction': u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registered No Purchase');
    XLSX.writeFile(wb, `Registered_No_Purchase_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Report exported successfully', 'success');
  };

  const openDetails = (user: UserRecord) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setActiveMenuId(null);
  };

  const openEditForm = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status
    });
    setIsEditDrawerOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (user: UserRecord) => {
    if (!window.confirm(`Are you sure you want to permanently remove lead "${user.name}"?`)) return;
    
    try {
        const res = await fetch(`/api/admin/reports/no-purchase/${user.id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Server returned ${res.status}: Route not found`);
        }
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Server returned ${res.status}: Update failed`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        showToast('Lead removed successfully', 'success');
        fetchUsers();
    } catch (error: any) {
        showToast(error.message || 'Deletion failed', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    try {
       const res = await fetch(`/api/admin/reports/no-purchase/${selectedUser.id}`, {
           method: 'PUT',
           headers: { 
               'Content-Type': 'application/json',
               ...getAdminHeaders()
           },
           body: JSON.stringify(editForm)
       });
       const data = await res.json();
       if (data.error) throw new Error(data.error);
       
       showToast('Profile updated successfully', 'success');
       setIsEditDrawerOpen(false);
       fetchUsers();
    } catch (error: any) {
        showToast(error.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-8 max-w-[1600px] mx-auto px-4 relative">
      {/* Compact Summary Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group overflow-hidden relative">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-50 group-hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 text-2xl transition-colors">person_off</span>
            </div>
            <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1.5 leading-none">Registered Users (No Purchase)</p>
                <div className="flex items-center gap-4">
                    <p className="text-2xl font-black text-gray-900 leading-none">{totalCount}</p>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase border border-amber-100 tracking-tighter shadow-sm">Waiting Action</span>
                </div>
            </div>
          </div>
          <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 opacity-60">Status Snapshot</p>
              <p className="text-sm font-black text-gray-900 tracking-tight">{new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
          </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group flex-[2] min-w-[280px]">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-[#1a237e] transition-colors">search</span>
                <input
                    type="text"
                    placeholder="Search name, email or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-11 pr-4 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-700 placeholder:text-gray-300 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                />
            </div>
            <div className="flex-1 min-w-[340px] flex items-center gap-3">
                <div 
                    onClick={() => startDateRef.current?.showPicker()}
                    className="flex-1 flex items-center gap-2 bg-white px-3.5 h-10 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all cursor-pointer group/start"
                >
                    <span className="material-symbols-outlined text-gray-400 text-[18px] group-hover/start:text-[#1a237e] transition-colors">calendar_today</span>
                    <input
                        ref={startDateRef}
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] font-bold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                        title="From Date"
                    />
                </div>
                
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] select-none opacity-60">to</span>
                
                <div 
                    onClick={() => endDateRef.current?.showPicker()}
                    className="flex-1 flex items-center gap-2 bg-white px-3.5 h-10 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all cursor-pointer group/end"
                >
                    <span className="material-symbols-outlined text-gray-400 text-[18px] group-hover/end:text-[#1a237e] transition-colors">calendar_today</span>
                    <input
                        ref={endDateRef}
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] font-bold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                        title="To Date"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleExportCSV}
                    className="h-10 px-5 bg-[#00A86B] text-white rounded-xl text-[12.5px] font-black hover:bg-[#008f5b] transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-emerald-500/5 uppercase tracking-wide"
                >
                    <span className="material-symbols-outlined text-xl">download_for_offline</span>
                    Export Excel
                </button>
            </div>
          </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="pl-6 pr-2 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lead Profile</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Contact Matrix</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center w-32">App Info</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center w-40">Joined On</th>
                <th className="pr-6 pl-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all duration-300">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a237e]"></div>
                </div>
              )}
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">person_search</span>
                        <p className="text-[12px] font-bold uppercase tracking-widest">No target records found</p>
                      </div>
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isLastFew = idx >= users.length - 2 && users.length > 3;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/30 transition-colors group overflow-visible">
                      <td className="pl-6 pr-2 py-4 text-[13px] font-bold text-gray-200 group-hover:text-gray-400 transition-colors">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#1a237e] group-hover:text-white transition-all font-black text-base uppercase rotate-3 group-hover:rotate-0">
                                {u.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[14px] font-bold text-gray-800 group-hover:text-[#1a237e] transition-colors truncate">{u.name || 'Anonymous'}</span>
                                <span className="text-[10px] font-bold text-gray-400 lowercase tracking-tighter bg-gray-50 px-1.5 py-0.5 rounded w-fit mt-0.5">ID: {u.id?.substring(0, 12)}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-gray-700 truncate max-w-[200px]">{u.email}</span>
                          <span className="text-[14px] font-black text-[#1a237e] font-mono mt-0.5 tracking-tight">{u.phone || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm border transition-all ${u.appRegistered ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-transparent grayscale'}`}>
                            <span className={`w-2 h-2 rounded-full ${u.appRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            {u.appRegistered ? 'In-App Active' : 'Web Register'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-gray-800">{u.registrationDate ? new Date(u.registrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 opacity-60">Success Joined</span>
                        </div>
                      </td>
                      <td className="pr-6 pl-4 py-4 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === u.id ? null : u.id);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[12px] font-black transition-all active:scale-95 ${activeMenuId === u.id ? 'bg-[#1a237e] text-white border-[#1a237e] shadow-lg shadow-indigo-100' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              Actions <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${activeMenuId === u.id ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>
                            
                            <div className={`absolute right-0 ${isLastFew ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'} w-44 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-2 transition-all duration-300 ${activeMenuId === u.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                              <button onClick={() => openDetails(u)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-[#1a237e] transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                  View Profile
                              </button>
                              <button onClick={() => openEditForm(u)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-[#1a237e] transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">edit_square</span>
                                  Edit Profile
                              </button>
                              <div className="h-[1px] bg-gray-50 my-1 mx-2"></div>
                              <button onClick={() => handleDelete(u)} className="w-full flex items-center gap-3 px-4 py-2 text-left text-[13px] font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                  Remove Lead
                              </button>
                            </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-[13px] font-medium text-gray-400 italic">
               Showing Page {currentPage} of {totalPages} <span className="mx-2 opacity-30">|</span> {totalCount} total leads
            </span>

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

      {/* Details Drawer */}
      <RightSideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} width="480px">
        <DrawerHeader title="Candidate Profile Identity" onClose={() => setIsDrawerOpen(false)} />
        {selectedUser && (
          <>
            <DrawerBody className="p-6 space-y-6">
              <div className="flex items-center gap-5 pb-5 border-b border-gray-50">
                <div className="w-14 h-14 bg-[#1a237e] text-white rounded-xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100">
                  {selectedUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[18px] font-black text-gray-900 tracking-tight leading-none">{selectedUser.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100 tracking-tighter">Verified Email</span>
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border tracking-tighter ${selectedUser.status === 'active' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Digital Mailbox</p>
                    <p className="text-[15px] font-bold text-gray-800 break-all">{selectedUser.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Cellular Connect</p>
                    <p className="text-[15px] font-black text-[#1a237e] font-mono tracking-tight">{selectedUser.phone || 'Not Shared'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Joining Date</p>
                    <p className="text-[14px] font-bold text-gray-800">{new Date(selectedUser.registrationDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last Presence</p>
                    <p className="text-[14px] font-bold text-gray-800">{selectedUser.lastLogin !== '-' ? new Date(selectedUser.lastLogin).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Origin Only'}</p>
                  </div>
                </div>
              </div>

              {/* Technical Profile Stats */}
              <div className="bg-gray-50/70 rounded-2xl p-6 border border-gray-100 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-gray-400">memory</span>
                       <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest leading-none">Hardware Insights</span>
                     </div>
                     <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${selectedUser.registrationType === 'mobile' ? 'bg-[#1a237e] text-white' : 'bg-gray-200 text-gray-600'}`}>
                       {selectedUser.registrationType}
                     </span>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                         <span className="text-[10px] font-bold text-gray-400 uppercase">Hardware ID</span>
                         <span className="text-[12px] font-mono font-bold text-gray-900 bg-white px-3 py-2 border border-gray-100 rounded-xl truncate select-all">{selectedUser.deviceId}</span>
                      </div>
                      <div className="flex items-center justify-between pb-2">
                         <span className="text-[11px] font-bold text-gray-500 uppercase">App Validation</span>
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${selectedUser.appRegistered ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className={`text-[12px] font-black uppercase tracking-tighter ${selectedUser.appRegistered ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {selectedUser.appRegistered ? 'Auth Verified' : 'Incomplete'}
                            </span>
                         </div>
                      </div>
                  </div>
              </div>

              {/* Non-Sticky Actions */}
              <div className="flex gap-4 pt-8">
                <button onClick={() => setIsDrawerOpen(false)} className="flex-1 h-[48px] bg-white border border-gray-200 rounded-xl text-[12px] font-black text-gray-400 hover:bg-gray-50 transition-all hover:border-gray-300 shadow-sm uppercase tracking-wider">Close Profile</button>
                <button onClick={() => { window.location.href = `mailto:${selectedUser.email}`; }} className="flex-1 h-[48px] bg-[#1a1c1e] text-white rounded-xl text-[12px] font-black shadow-md shadow-gray-200 hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest">Follow Up</button>
              </div>
            </DrawerBody>
          </>
        )}
      </RightSideDrawer>

      {/* Edit Drawer */}
      <RightSideDrawer isOpen={isEditDrawerOpen} onClose={() => setIsEditDrawerOpen(false)} width="480px">
        <DrawerHeader title="Update Lead Profile" onClose={() => setIsEditDrawerOpen(false)} />
        <DrawerBody className="p-6">
            <div className="space-y-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">Full Name</label>
                        <input 
                            type="text" 
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] font-bold text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">Email Address</label>
                        <input 
                            type="email" 
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] font-bold text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">Phone Number</label>
                        <input 
                            type="text" 
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] font-black text-[#1a237e] font-mono focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block ml-1">Account Status</label>
                        <select 
                            value={editForm.status}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] font-bold text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="active">Active Lead</option>
                            <option value="blocked">Blocked / Spammer</option>
                        </select>
                    </div>
                </div>

                {/* Non-Sticky Actions */}
                <div className="flex gap-4 pt-8 border-t border-gray-50">
                    <button onClick={() => setIsEditDrawerOpen(false)} className="flex-1 h-[48px] bg-white border border-gray-200 rounded-xl text-[12px] font-black text-gray-400 hover:bg-gray-50 transition-all shadow-sm uppercase tracking-wider">Discard</button>
                    <button onClick={handleUpdate} className="flex-1 h-[48px] bg-[#1a1c1e] text-white rounded-xl text-[12px] font-black shadow-md shadow-gray-200 hover:bg-black transition-all uppercase tracking-widest">Save Profile</button>
                </div>
            </div>
        </DrawerBody>
      </RightSideDrawer>
    </div>
  );
};

export default NoPurchaseReport;
