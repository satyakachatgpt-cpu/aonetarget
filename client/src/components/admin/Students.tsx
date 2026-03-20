import React, { useState, useEffect } from 'react';
import { studentsAPI } from '../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormInput, FormLabel, FormSelect, PrimaryButton } from './DrawerSystem';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  course: string;
  city: string;
  registrationDate: string;
  registrationType: string;
  status: 'active' | 'inactive';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  isBanned?: boolean;
  suspiciousActivityCount?: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
  initialStatus?: string;
  viewMode?: 'all' | 'blocked';
}

const Students: React.FC<Props> = ({ showToast, initialStatus = 'all', viewMode = 'all' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    course: '',
    city: '',
    registrationDate: new Date().toISOString().split('T')[0],
    registrationType: 'regular',
    status: 'active' as 'active' | 'inactive',
    paymentStatus: 'pending' as 'paid' | 'pending' | 'failed',
    notes: ''
  });

  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [selectedUserToBlock, setSelectedUserToBlock] = useState<Student | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredStudents].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredStudents(sorted);
  };

  // Load students on mount
  useEffect(() => {
    loadStudents();

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter students based on search and status
  useEffect(() => {
    let filtered = students;

    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (registrationFilter !== 'all') {
      filtered = filtered.filter(s => s.registrationType === registrationFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === paymentFilter);
    }

    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [students, searchQuery, statusFilter, registrationFilter, paymentFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const loadStudents = async () => {
    try {
      setLoading(true);
      console.log('Loading students...');
      const data = await studentsAPI.getAll();
      console.log('Students loaded successfully:', data);
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to load students:', errorMsg, error);
      showToast(`Failed to load students: ${errorMsg}`, 'error');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const generateStudentId = () => {
    const maxId = Math.max(0, ...students.map(s => {
      const num = parseInt((s.id || '').replace('ST-', ''));
      return isNaN(num) ? 0 : num;
    }));
    return `ST-${String(maxId + 1).padStart(4, '0')}`;
  };

  const validateForm = () => {
    const nameRegex = /^[A-Za-z\s.]{3,50}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!nameRegex.test(formData.name)) {
      showToast('Name should be 3-50 characters (letters only)', 'error');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    if (!phoneRegex.test(formData.phone)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return false;
    }
    if (!formData.course) {
      showToast('Please select a course', 'error');
      return false;
    }
    return true;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const newStudent: Student = {
        id: generateStudentId(),
        ...formData
      };

      await studentsAPI.create(newStudent);
      setStudents([...students, newStudent]);
      resetForm();
      setShowAddModal(false);
      showToast(`Student ${newStudent.name} added successfully`, 'success');
    } catch (error) {
      console.error('Add student error:', error);
      showToast('Failed to add student to database. Please try again.', 'error');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validateForm()) return;

    try {
      const updatedStudent: Student = {
        ...selectedStudent,
        ...formData
      };

      await studentsAPI.update(selectedStudent.id, updatedStudent);
      setStudents(students.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      resetForm();
      setShowEditModal(false);
      setSelectedStudent(null);
      showToast('Student updated successfully', 'success');
    } catch (error) {
      console.error('Update student error:', error);
      showToast('Failed to update student. Please try again.', 'error');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      await studentsAPI.delete(studentId);
      setStudents(students.filter(s => s.id !== studentId));
      showToast(`${studentName} has been deleted`, 'success');
    } catch (error) {
      console.error('Delete student error:', error);
      showToast('Failed to delete student. Please try again.', 'error');
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleUnblock = async (student: Student) => {
    try {
      setLoading(true);
      await studentsAPI.update(student.id, { ...student, status: 'active' });
      showToast(`${student.name} has been unblocked successfully`, 'success');
      loadStudents();
    } catch (err) {
      showToast('Failed to unblock user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (student: Student) => {
    const reason = prompt(`Enter reason for banning ${student.name}:`, 'Terms of service violation');
    if (reason === null) return;
    try {
      setLoading(true);
      const res = await fetch('/api/security-admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: student.id, reason })
      });
      if (res.ok) {
        showToast(`${student.name} has been banned`, 'success');
        loadStudents();
      }
    } catch (err) {
      showToast('Failed to ban user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      dob: student.dob,
      course: student.course,
      city: student.city,
      registrationDate: student.registrationDate,
      registrationType: student.registrationType,
      status: student.status,
      paymentStatus: student.paymentStatus,
      notes: student.notes || ''
    });
    setShowEditModal(true);
  };

  const handleFeesClick = (student: Student) => {
    setSelectedStudent(student);
    setShowFeesModal(true);
  };

  const handleNotesClick = (student: Student) => {
    setSelectedStudent(student);
    setFormData(prev => ({ ...prev, notes: student.notes || '' }));
    setShowNotesModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      dob: '',
      course: '',
      city: '',
      registrationDate: new Date().toISOString().split('T')[0],
      registrationType: 'regular',
      status: 'active',
      paymentStatus: 'pending',
      notes: ''
    });
    setSelectedStudent(null);
  };

  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Name', 'Email', 'Phone', 'DOB', 'Course', 'City', 'Reg Date', 'Reg Type', 'Status', 'Payment'];
      const rows = filteredStudents.map(s => [
        s.id,
        s.name,
        s.email,
        s.phone,
        s.dob,
        s.course,
        s.city,
        s.registrationDate,
        s.registrationType,
        s.status,
        s.paymentStatus
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Exported ${filteredStudents.length} student(s) to CSV`, 'success');
    } catch (error) {
      showToast('Failed to export CSV', 'error');
    }
  };

  const updatePaymentStatus = async (studentId: string, status: 'paid' | 'pending' | 'failed') => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      const updated = { ...student, paymentStatus: status };
      try {
        await studentsAPI.update(studentId, updated);
        setStudents(students.map(s => s.id === studentId ? updated : s));
        showToast(`Payment status updated to ${status}`, 'success');
      } catch (error) {
        console.error('Update payment status error:', error);
        showToast('Failed to update payment status', 'error');
      }
    }
  };

  const saveNotes = async () => {
    if (!selectedStudent) return;

    try {
      const updated = { ...selectedStudent, notes: formData.notes };
      await studentsAPI.update(selectedStudent.id, updated);
      setStudents(students.map(s => s.id === selectedStudent.id ? updated : s));
      setShowNotesModal(false);
      showToast('Notes saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save notes', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-[22px] font-medium text-[#2d2d2d]">
            {viewMode === 'blocked' ? 'Blocked Users' : 'Student Directory'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-11 h-11 flex items-center justify-center bg-[#111] text-white rounded-full shadow-lg hover:bg-black transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 h-11 px-5 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all bg-white shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
        </div>
      </div>

      {/* Filter Dropdown (Conditional) */}
      {isFilterOpen && (
        <div className="mb-6 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Account Status</label>
              <div className="flex gap-2">
                {['all', 'active', 'inactive'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${statusFilter === status ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {status === 'inactive' ? 'Blocked' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        <div className="">
          {loading ? (
            <div className="p-20 text-center text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#111] mx-auto mb-4"></div>
              <p className="font-bold uppercase tracking-widest text-[10px]">Loading students...</p>
            </div>
          ) : (
            <table className="w-full text-left">
            <thead className="bg-[#ffffff] border-b border-gray-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">S. NO.</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('registrationDate')}>
                    DATE & TIME
                    <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('name')}>
                    NAME
                    <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('id')}>
                    USERNAME
                    <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    EMAIL
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    MOBILE
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">No records found</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/30 transition-colors group border-b border-gray-100 last:border-none">
                    <td className="px-6 py-5 text-[12px] font-medium text-gray-400">
                      {(currentPage - 1) * itemsPerPage + paginatedStudents.indexOf(s) + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[13px] font-medium text-gray-500">
                        {new Date(s.registrationDate).toLocaleDateString('en-GB').replace(/\//g, '-')}{' '}
                        <span className="text-gray-400 font-normal">at</span>{' '}
                        {new Date(s.registrationDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[14px] font-bold text-[#3f51b5] tracking-tight">{s.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="inline-flex px-1.5 py-0.5 bg-[#e8eaf6] text-[#3f51b5] text-[9px] font-black rounded uppercase tracking-wider">Student</div>
                        {(s.suspiciousActivityCount || 0) > 0 && (
                          <div className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded uppercase tracking-wider border border-amber-100 animate-pulse">
                            Suspicious ({s.suspiciousActivityCount})
                          </div>
                        )}
                        {s.isBanned && (
                           <div className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded uppercase tracking-wider border border-red-200">
                           Banned
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-medium text-gray-500">{s.id}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-medium text-gray-500">{s.email}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-bold text-gray-600">{s.phone}</p>
                    </td>
                    <td className="px-6 py-5 text-right overflow-visible">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === s.id ? null : s.id);
                          }}
                          className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-[12px] font-bold transition-all shadow-sm ${activeMenuId === s.id ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                        >
                          Actions
                          <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === s.id ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        <div className={`absolute right-0 top-full mt-1 origin-top-right w-36 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === s.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                          {s.status === 'inactive' ? (
                            <button
                              onClick={() => handleUnblock(s)}
                              className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px] text-red-500">cancel</span> Unblock
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleViewStudent(s)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-blue-500">visibility</span> View
                              </button>
                              <button
                                onClick={() => handleEditClick(s)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-indigo-500">edit</span> Edit
                              </button>
                              <button
                                onClick={() => handleFeesClick(s)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-green-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-green-500">payments</span> Fees
                              </button>
                              <button
                                onClick={() => handleNotesClick(s)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-amber-500">sticky_note_2</span> Notes
                              </button>
                              <button
                                onClick={() => handleBanUser(s)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-red-600">block</span> Ban Account
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm text-red-500">delete</span> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        </div>

      {/* Pagination Controls - Matching Screenshot */}
      {filteredStudents.length > 0 && (
        <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, array) => (
                  <React.Fragment key={pageNum}>
                    {idx > 0 && array[idx - 1] !== pageNum - 1 && (
                      <span className="px-2 text-gray-300">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-[12px] font-black rounded-lg transition-all ${currentPage === pageNum ? 'bg-[#1a237e] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Add/Edit Student Drawer */}
      <RightSideDrawer
        isOpen={showAddModal || showEditModal}
        onClose={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
        width="480px"
      >
        <DrawerHeader
          title={viewMode === 'blocked' && !showEditModal ? "Block a User" : (showEditModal ? "Edit Student Details" : "Add New Student")}
          onClose={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
        />
        <DrawerBody className={viewMode === 'blocked' && !showEditModal ? "overflow-hidden" : ""}>
          {viewMode === 'blocked' && !showEditModal ? (
            <div className="flex flex-col h-full relative">
              <div className="flex-1 space-y-8">
                {/* Background Glow Effect from screenshot */}
                <div className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] bg-blue-500/[0.08] blur-[100px] rounded-full -z-10" />

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Search for User *</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by user name, email or Phone"
                        value={blockSearchQuery}
                        onChange={(e) => {
                          setBlockSearchQuery(e.target.value);
                          setSelectedUserToBlock(null);
                        }}
                        className={`w-full h-[52px] px-5 bg-white border ${selectedUserToBlock ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'} rounded-2xl text-[14px] font-medium outline-none focus:border-blue-400 transition-all placeholder:text-gray-300 shadow-sm`}
                      />
                      {selectedUserToBlock && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-500 text-white rounded-full p-0.5">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Search Results Area */}
                  {blockSearchQuery.length > 1 && !selectedUserToBlock && (
                    <div className="bg-white border border-gray-100 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                        {students
                          .filter(s => s.status === 'active') // Only block active users
                          .filter(s =>
                            s.name.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                            s.id.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                            s.email.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                            s.phone.includes(blockSearchQuery)
                          ).slice(0, 5).map(s => (
                            <button
                              key={s.id}
                              onClick={() => setSelectedUserToBlock(s)}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center font-black text-[#1a237e] text-[15px]">
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-gray-800">{s.name}</p>
                                  <p className="text-[11px] font-medium text-gray-400">{s.id} • {s.phone}</p>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-[18px] text-gray-300">add_circle</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedUserToBlock && (
                    <div className="p-6 bg-[#1a237e]/5 rounded-[28px] border border-[#1a237e]/10 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-[#1a237e] shadow-sm border border-[#1a237e]/5">
                          {selectedUserToBlock.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-[#1a237e] uppercase tracking-widest opacity-60">Ready to Block</p>
                          <p className="text-[15px] font-bold text-gray-800">{selectedUserToBlock.name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-5">
                {showEditModal && selectedStudent && (
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Student ID</p>
                    <p className="text-[14px] font-bold text-gray-900">{selectedStudent.id}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <FormLabel label="Full Name" required />
                  <FormInput
                    placeholder="Enter student's full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Email Address" required />
                    <FormInput
                      type="email"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Phone Number" required />
                    <FormInput
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Date of Birth" />
                    <FormInput
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="City" />
                    <FormInput
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel label="Enrolled Course" required />
                  <FormInput
                    placeholder="e.g. Class 12th Commerce"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Registration Type" />
                    <FormSelect
                      value={formData.registrationType}
                      onChange={(val) => setFormData({ ...formData, registrationType: val })}
                      options={[
                        { value: 'regular', label: 'Regular Admission' },
                        { value: 'bulk', label: 'Bulk Enrollment' },
                        { value: 'referral', label: 'Referral Program' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Account Status" />
                    <FormSelect
                      value={formData.status}
                      onChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
                      options={[
                        { value: 'active', label: 'Active Account' },
                        { value: 'inactive', label: 'Blocked / Suspended' }
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-8 pb-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                  className="flex-1 h-[56px] bg-gray-50 text-gray-700 rounded-xl font-bold text-[14px] hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={showEditModal ? handleEditStudent : handleAddStudent}
                  className="flex-[2] h-[56px] bg-[#1a237e] text-white rounded-xl font-bold text-[14px] hover:bg-navy/90 transition-all shadow-lg shadow-navy/20 active:scale-[0.98]"
                >
                  {showEditModal ? "Save Update" : "Create Student Account"}
                </button>
              </div>
            </div>
          )}
        </DrawerBody>
        {viewMode === 'blocked' && !showEditModal && (
          <div className="shrink-0 bg-[#111] z-[100] mt-auto">
            <button
              onClick={async () => {
                if (!selectedUserToBlock) return;
                try {
                  setLoading(true);
                  await studentsAPI.update(selectedUserToBlock.id, { ...selectedUserToBlock, status: 'inactive' });
                  showToast(`${selectedUserToBlock.name} has been blocked successfully`, 'success');
                  setBlockSearchQuery('');
                  setSelectedUserToBlock(null);
                  setShowAddModal(false);
                  loadStudents();
                } catch (err) {
                  showToast('Failed to block user', 'error');
                } finally {
                  setLoading(false);
                }
              }}
              className={`w-full h-[80px] bg-[#111] text-white font-black text-[13px] hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!selectedUserToBlock}
            >
              SAVE CHANGES
            </button>
          </div>
        )}
      </RightSideDrawer>


      {/* View Student Drawer */}
      <RightSideDrawer isOpen={showViewModal} onClose={() => setShowViewModal(false)} width="480px">
        <DrawerHeader title="Student Profile" onClose={() => setShowViewModal(false)} />
        <DrawerBody>
          {selectedStudent && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-6 bg-navy/5 rounded-[32px] border border-navy/5">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-navy text-2xl shadow-sm border border-navy/10">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-[18px] font-black text-navy uppercase tracking-tight">{selectedStudent.name}</h4>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{selectedStudent.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-8 gap-x-4 px-2">
                <div>
                  <FormLabel label="Email Address" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1">{selectedStudent.email}</p>
                </div>
                <div>
                  <FormLabel label="Phone Number" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1">{selectedStudent.phone}</p>
                </div>
                <div>
                  <FormLabel label="Date of Birth" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1">{new Date(selectedStudent.dob).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <FormLabel label="Current Course" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1">{selectedStudent.course}</p>
                </div>
                <div>
                  <FormLabel label="Registration Date" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1">{new Date(selectedStudent.registrationDate).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <FormLabel label="Admission Type" />
                  <p className="text-[14px] font-bold text-gray-700 ml-1 uppercase">{selectedStudent.registrationType}</p>
                </div>
                <div>
                  <FormLabel label="Account Status" />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${selectedStudent.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedStudent.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {selectedStudent.status}
                  </span>
                </div>
                <div>
                  <FormLabel label="Payment Status" />
                  <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase ${selectedStudent.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : selectedStudent.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                    {selectedStudent.paymentStatus}
                  </span>
                </div>
              </div>

              {selectedStudent.notes && (
                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                  <FormLabel label="Internal Notes" />
                  <p className="text-[13px] font-medium text-amber-900 leading-relaxed italic">"{selectedStudent.notes}"</p>
                </div>
              )}

              <div className="flex gap-3 pt-6 pb-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 h-[56px] bg-gray-50 text-gray-700 rounded-xl font-bold text-[14px] hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => { handleEditClick(selectedStudent!); setShowViewModal(false); }}
                  className="flex-1 h-[56px] bg-navy text-white rounded-xl font-bold text-[14px] hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </DrawerBody>
      </RightSideDrawer>

      {/* Fees Management Drawer */}
      <RightSideDrawer isOpen={showFeesModal} onClose={() => setShowFeesModal(false)} width="440px">
        <DrawerHeader title="Payment Management" onClose={() => setShowFeesModal(false)} />
        <DrawerBody>
          {selectedStudent && (
            <div className="space-y-8">
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Currently Set As</p>
                <span className={`inline-flex px-6 py-2.5 rounded-xl text-[12px] font-black uppercase shadow-sm ${selectedStudent.paymentStatus === 'paid' ? 'bg-green-500 text-white' : selectedStudent.paymentStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                  {selectedStudent.paymentStatus}
                </span>
              </div>

              <div className="space-y-3">
                <FormLabel label="Update Payment Status To" />
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => updatePaymentStatus(selectedStudent.id, 'paid')}
                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      </div>
                      <span className="text-[14px] font-bold text-gray-700">Mark as Paid</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-green-500 transition-all">chevron_right</span>
                  </button>

                  <button
                    onClick={() => updatePaymentStatus(selectedStudent.id, 'pending')}
                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-yellow-500 hover:bg-yellow-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[20px]">pending</span>
                      </div>
                      <span className="text-[14px] font-bold text-gray-700">Mark as Pending</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-yellow-500 transition-all">chevron_right</span>
                  </button>

                  <button
                    onClick={() => updatePaymentStatus(selectedStudent.id, 'failed')}
                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-red-500 hover:bg-red-50/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-500 group-hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[20px]">cancel</span>
                      </div>
                      <span className="text-[14px] font-bold text-gray-700">Mark as Failed</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-red-500 transition-all">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="pt-8 pb-4">
                <button
                  onClick={() => setShowFeesModal(false)}
                  className="w-full h-[56px] bg-gray-900 text-white rounded-xl font-bold text-[14px] hover:bg-black transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DrawerBody>
      </RightSideDrawer>

      {/* Notes Drawer */}
      <RightSideDrawer isOpen={showNotesModal} onClose={() => setShowNotesModal(false)} width="440px">
        <DrawerHeader title="Internal Notes" onClose={() => setShowNotesModal(false)} />
        <DrawerBody>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-gray-900 leading-none">Notes for {selectedStudent.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{selectedStudent.id}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <FormLabel label="Observations & Comments" />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-5 py-4 border border-gray-200 rounded-[24px] text-[14px] font-medium outline-none focus:border-amber-400 transition-all bg-white placeholder:text-gray-300 min-h-[300px] resize-none leading-relaxed"
                  placeholder="Type student-specific notes, performance remarks, or follow-up details here..."
                />
              </div>

              <div className="flex gap-3 pt-8 pb-4">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 h-[56px] bg-gray-50 text-gray-700 rounded-xl font-bold text-[14px] hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotes}
                  className="flex-[2] h-[56px] bg-amber-500 text-white rounded-xl font-bold text-[14px] hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-[0.98]"
                >
                  Update Notes
                </button>
              </div>
            </div>
          )}
        </DrawerBody>
      </RightSideDrawer>
    </div>
  );
};

export default Students;

