import React, { useState, useEffect } from 'react';
import { studentsAPI } from '../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, PrimaryButton } from './DrawerSystem';

interface BlockedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  registrationDate: string;
  status: 'active' | 'inactive';
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const BlockedUsers: React.FC<Props> = ({ showToast }) => {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState<any | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
    
    // Close menu on click outside
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const data = await studentsAPI.getAll();
      const blocked = (data as BlockedUser[]).filter(user => user.status === 'inactive');
      setUsers(blocked);
    } catch (error) {
      showToast('Failed to load blocked users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (user: BlockedUser) => {
    try {
      await studentsAPI.unbanUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      showToast(`${user.name} has been unblocked`, 'success');
    } catch (error) {
      showToast('Failed to unblock user', 'error');
    }
  };

  const loadAllStudents = async () => {
    try {
      const data = await studentsAPI.getAll();
      setAllStudents(data as any[]);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleBlockAction = async () => {
    if (!selectedUserToBlock) {
      showToast('Please select a user to block', 'error');
      return;
    }

    try {
      setBlocking(true);
      await studentsAPI.banUser(selectedUserToBlock.id, 'Terms of service violation');
      
      // Update local blocked list
      const blockedRecords = await studentsAPI.getAll();
      const blocked = (blockedRecords as BlockedUser[]).filter(user => user.status === 'inactive');
      setUsers(blocked);
      
      setShowAddModal(false);
      setSelectedUserToBlock(null);
      setSearchUserQuery('');
      showToast(`${selectedUserToBlock.name} has been blocked`, 'success');
    } catch (error) {
      showToast('Failed to block user', 'error');
    } finally {
      setBlocking(false);
    }
  };

  const usersToBlockSearch = allStudents.filter(student => 
    student.status === 'active' && (
    student.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    student.phone.includes(searchUserQuery)
    )
  ).slice(0, 5);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  );

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = endIndex;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-gray-800 tracking-tight">Blocked Users</h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 h-10 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 h-10 px-4 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
          <button 
            onClick={() => {
              setShowAddModal(true);
              if (allStudents.length === 0) loadAllStudents();
            }}
            className="w-10 h-10 flex items-center justify-center bg-[#1a237e] text-white rounded-full shadow-lg shadow-navy/20 hover:bg-navy/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        <div className="">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">S. NO.</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                    DATE & TIME <span className="material-symbols-outlined text-sm">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                    TITLE <span className="material-symbols-outlined text-sm">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                    EMAIL <span className="material-symbols-outlined text-sm">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-8"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 bg-gray-100 rounded-lg w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-300">
                      <span className="material-symbols-outlined text-[64px] mb-4">block</span>
                      <p className="text-[12px] font-bold uppercase tracking-widest">No blocked users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => {
                  const isLastFew = index > 2 && index >= paginatedUsers.length - 2;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">{startIndex + index + 1}</td>
                      <td className="px-6 py-5">
                        <div className="text-[13px] font-medium text-gray-600">
                          {user.registrationDate || '21-02-2026'} <span className="text-gray-400 ml-1">at 03:13 PM</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[13px] font-bold text-navy hover:underline cursor-pointer tracking-tight">
                            {user.name}
                          </span>
                          <span className="w-fit px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded uppercase border border-red-100">
                            Banned
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-5 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === user.id ? null : user.id);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] font-bold transition-all ${activeMenuId === user.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Actions <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === user.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                          
                          <div className={`absolute right-0 ${isLastFew ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'} w-40 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === user.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button 
                              onClick={() => handleUnblock(user)}
                              className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-green-50 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm text-green-600">verified_user</span>
                              Activate
                            </button>
                            <button className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                              Remove
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

        {/* Standardized Pagination Footer */}
        {!loading && totalItems > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
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
                Showing {showingStart} to {showingEnd} of {totalItems} entries
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
      {/* Block User Drawer */}
      <RightSideDrawer isOpen={showAddModal} onClose={() => setShowAddModal(false)} width="440px">
        <DrawerHeader title="Block a User" onClose={() => setShowAddModal(false)} />
        
        <DrawerBody className="p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <FormLabel label="Search for User" required />
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-navy transition-colors">search</span>
                <FormInput 
                  placeholder="Search by user name, email or Phone"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="pl-12 !h-[56px] border-gray-100 !rounded-2xl"
                />
              </div>
            </div>

            {searchUserQuery && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {usersToBlockSearch.length === 0 ? (
                  <p className="text-center py-4 text-[13px] text-gray-400">No active users found</p>
                ) : (
                  usersToBlockSearch.map(student => (
                    <div 
                      key={student.id}
                      onClick={() => {
                        setSelectedUserToBlock(student);
                        setSearchUserQuery(student.name);
                      }}
                      className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${selectedUserToBlock?.id === student.id ? 'border-navy bg-navy/5 shadow-sm' : 'border-gray-50 hover:border-navy/30 hover:bg-gray-50'}`}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-navy font-bold text-sm shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-800 truncate">{student.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium truncate">{student.email}</p>
                      </div>
                      {selectedUserToBlock?.id === student.id && (
                        <span className="material-symbols-outlined text-navy">check_circle</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            
            {selectedUserToBlock && !searchUserQuery.includes(selectedUserToBlock.name) && (
               <div className="p-4 bg-navy/5 border border-navy/10 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-navy text-white rounded-xl flex items-center justify-center font-bold text-sm">
                    {selectedUserToBlock.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-gray-800">{selectedUserToBlock.name}</p>
                    <p className="text-[11px] text-navy font-medium">Selected for blocking</p>
                  </div>
               </div>
            )}
          </div>
        </DrawerBody>

        <DrawerFooter>
          <PrimaryButton 
            onClick={handleBlockAction} 
            disabled={!selectedUserToBlock || blocking}
            className="!h-[64px]"
          >
            {blocking ? 'Processing...' : 'Save changes'}
          </PrimaryButton>
        </DrawerFooter>
      </RightSideDrawer>
    </div>
  );
};

export default BlockedUsers;

