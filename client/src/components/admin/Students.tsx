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
  blockedAt?: string;

  admission?: {
    fatherName: string;
    motherName: string;
    gender: string;
    alternatePhone: string;
    fullAddress: string;
    batchTiming: string;
    admissionDate: string;
  };
  fees?: {
    totalFees: number;
    paidAmount: number;
    remainingAmount: number;
  };
  academic?: {
    previousClass: string;
    schoolName: string;
    marksPercentage: string;
    passingYear: string;
  };
  documents?: {
    aadharCard: string;
    marksheet: string;
    photo: string;
    profilePhoto: string;
  };
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
  const [pageSize, setPageSize] = useState(10);

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
    notes: '',
    // New Fields
    fatherName: '',
    motherName: '',
    gender: 'Male',
    alternatePhone: '',
    fullAddress: '',
    previousClass: '',
    schoolName: '',
    marksPercentage: '',
    passingYear: '',
    batchTiming: '',
    admissionDate: new Date().toISOString().split('T')[0],
    totalFees: 0,
    paidAmount: 0,
    remainingAmount: 0,
    aadharCard: '',
    marksheet: '',
    photo: '',
    profilePhoto: ''
  });

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ value: string, label: string }[]>([]);

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

  // Load data on mount
  useEffect(() => {
    loadStudents();
    loadCourses();

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadCourses = async () => {
    try {
      const { coursesAPI } = await import('../../services/apiClient');
      const data = await coursesAPI.getAll();
      const list = Array.isArray(data) ? data : (data.courses || []);
      const formatted = list.map((c: any) => ({
        value: c.name || c.title,
        label: c.name || c.title
      }));
      setCourses(formatted);
    } catch (err) {
      console.error('Failed to fetch courses');
    }
  };

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
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = endIndex;

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
    if (formData.alternatePhone && !phoneRegex.test(formData.alternatePhone)) {
      showToast('Alternate phone number must be exactly 10 digits', 'error');
      return false;
    }
    if (!formData.course) {
      showToast('Please select a course', 'error');
      return false;
    }
    if (isNaN(Number(formData.totalFees)) || isNaN(Number(formData.paidAmount))) {
      showToast('Fees must be numeric values', 'error');
      return false;
    }
    return true;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await studentsAPI.create(formData as any);
      setStudents([...students, res]);
      resetForm();
      setShowAddModal(false);
      showToast(`Student ${formData.name} added successfully`, 'success');
    } catch (error: any) {
      console.error('Add student error:', error);
      showToast(error.response?.data?.error || 'Failed to add student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validateForm()) return;

    try {
      setLoading(true);
      await studentsAPI.update(selectedStudent.id, formData as any);
      loadStudents(); // Reload to get structured data correctly
      resetForm();
      setShowEditModal(false);
      setSelectedStudent(null);
      showToast('Student updated successfully', 'success');
    } catch (error: any) {
      console.error('Update student error:', error);
      showToast(error.response?.data?.error || 'Failed to update student', 'error');
    } finally {
      setLoading(false);
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
      await studentsAPI.update(student.id, { ...student, status: 'active', blockedAt: undefined });
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
      notes: student.notes || '',
      // New Fields
      fatherName: student.admission?.fatherName || '',
      motherName: student.admission?.motherName || '',
      gender: student.admission?.gender || 'Male',
      alternatePhone: student.admission?.alternatePhone || '',
      fullAddress: student.admission?.fullAddress || '',
      previousClass: student.academic?.previousClass || '',
      schoolName: student.academic?.schoolName || '',
      marksPercentage: student.academic?.marksPercentage || '',
      passingYear: student.academic?.passingYear || '',
      batchTiming: student.admission?.batchTiming || '',
      admissionDate: student.admission?.admissionDate ? new Date(student.admission.admissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalFees: student.fees?.totalFees || 0,
      paidAmount: student.fees?.paidAmount || 0,
      remainingAmount: student.fees?.remainingAmount || 0,
      aadharCard: student.documents?.aadharCard || '',
      marksheet: student.documents?.marksheet || '',
      photo: student.documents?.photo || '',
      profilePhoto: student.documents?.profilePhoto || ''
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
      notes: '',
      fatherName: '',
      motherName: '',
      gender: 'Male',
      alternatePhone: '',
      fullAddress: '',
      previousClass: '',
      schoolName: '',
      marksPercentage: '',
      passingYear: '',
      batchTiming: '',
      admissionDate: new Date().toISOString().split('T')[0],
      totalFees: 0,
      paidAmount: 0,
      remainingAmount: 0,
      aadharCard: '',
      marksheet: '',
      photo: '',
      profilePhoto: ''
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

  const handleFileUpload = async (file: File, field: string) => {
    try {
      setUploadingField(field);
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      setFormData(prev => ({ ...prev, [field]: data.url }));
      showToast(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} uploaded`, 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload file', 'error');
    } finally {
      setUploadingField(null);
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
            {viewMode === 'blocked' ? 'Blocked Users' : 'Admission System'}
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
                paginatedStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/30 transition-colors group border-b border-gray-100 last:border-none">
                    <td className="px-6 py-5 text-[12px] font-medium text-gray-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[13px] font-medium text-gray-500">
                        {(() => {
                          const dateStr = (viewMode === 'blocked' && (s as any).blockedAt) ? (s as any).blockedAt : s.registrationDate;
                          const dateObj = new Date(dateStr);
                          if (!dateStr || isNaN(dateObj.getTime())) {
                            return <span className="text-gray-300 italic">No date set</span>;
                          }
                          return (
                            <>
                              {dateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}{' '}
                              <span className="text-gray-400 font-normal">at</span>{' '}
                              {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                            </>
                          );
                        })()}
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
      {/* Pagination Footer */}
      <div className="flex justify-between items-center mt-4 px-6 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex items-center gap-3">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded-lg px-2 py-1 text-sm outline-none focus:border-black transition-all shadow-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600 font-medium">
            Showing {showingStart} to {showingEnd} of {totalItems} entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-gray-500 hover:text-black font-bold text-sm disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <button className="px-4 py-1 bg-black text-white rounded-lg font-bold text-sm shadow-md">
            {currentPage}
          </button>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 text-gray-500 hover:text-black font-bold text-sm disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
        </div>
      </div>

      {/* Add/Edit Student Drawer */}
      <RightSideDrawer
        isOpen={showAddModal || showEditModal}
        onClose={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
        width="480px"
      >
        <DrawerHeader
          title={showEditModal ? "Edit Student Admission" : "New Student Admission"}
          onClose={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
        />
        <DrawerBody className="bg-[#fafafa]">
          <div className="space-y-8 pb-10">
            {/* Section: Personal Details */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest border-b border-gray-50 pb-4">A. Personal Details</h4>
              
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                    {formData.profilePhoto ? (
                      <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-300 text-[40px]">person</span>
                    )}
                    {uploadingField === 'profilePhoto' && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'profilePhoto');
                      };
                      input.click();
                    }}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#111] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
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
                    <FormLabel label="Father Name" required />
                    <FormInput
                      placeholder="Enter father's name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Mother Name" required />
                    <FormInput
                      placeholder="Enter mother's name"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Date of Birth" required />
                    <FormInput
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Gender" required />
                    <FormSelect
                      value={formData.gender}
                      onChange={(val) => setFormData({ ...formData, gender: val })}
                      options={[
                        { value: 'Male', label: 'Male' },
                        { value: 'Female', label: 'Female' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Contact Details */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest border-b border-gray-50 pb-4">B. Contact Details</h4>
              <div className="space-y-4">
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
                    <FormLabel label="Alternate Phone" />
                    <FormInput
                      type="tel"
                      placeholder="10-digit alternate mobile"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="City" required />
                    <FormInput
                      placeholder="Enter city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel label="Full Address" required />
                  <textarea
                    placeholder="Enter full residential address"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                    className="w-full min-h-[100px] p-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-400 transition-all bg-white placeholder:text-gray-300 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: Academic Details */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest border-b border-gray-50 pb-4">C. Academic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel label="Previous Class" />
                  <FormInput
                    placeholder="e.g. 10th / 12th / Grad"
                    value={formData.previousClass}
                    onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="School / College Name" />
                  <FormInput
                    placeholder="Enter school name"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="Marks / Percentage" />
                  <FormInput
                    placeholder="e.g. 85%"
                    value={formData.marksPercentage}
                    onChange={(e) => setFormData({ ...formData, marksPercentage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="Passing Year" />
                  <FormInput
                    placeholder="e.g. 2023"
                    value={formData.passingYear}
                    onChange={(e) => setFormData({ ...formData, passingYear: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Admission Details */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest border-b border-gray-50 pb-4">D. Admission Details</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel label="Course" required />
                  <FormSelect
                    value={formData.course}
                    onChange={(val) => setFormData({ ...formData, course: val })}
                    options={[
                      { value: '', label: 'Select Course' },
                      ...courses
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Batch" required />
                    <FormSelect
                      value={formData.batchTiming}
                      onChange={(val) => setFormData({ ...formData, batchTiming: val })}
                      options={[
                        { value: '', label: 'Select Batch' },
                        { value: 'Morning', label: 'Morning' },
                        { value: 'Afternoon', label: 'Afternoon' },
                        { value: 'Evening', label: 'Evening' },
                        { value: 'Weekend', label: 'Weekend' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Admission Date" />
                    <FormInput
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    />
                  </div>
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
            </div>

            {/* Section: Fees Details */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest">E. Fees Details</h4>
                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-black uppercase">Auto Calculating</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FormLabel label="Total Fees (₹)" required />
                  <FormInput
                    type="number"
                    placeholder="0"
                    value={formData.totalFees}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({ 
                        ...prev, 
                        totalFees: total,
                        remainingAmount: total - prev.paidAmount
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="Paid Amount (₹)" required />
                  <FormInput
                    type="number"
                    placeholder="0"
                    value={formData.paidAmount}
                    onChange={(e) => {
                      const paid = parseFloat(e.target.value) || 0;
                      setFormData(prev => ({ 
                        ...prev, 
                        paidAmount: paid,
                        remainingAmount: prev.totalFees - paid
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel label="Remaining (₹)" />
                  <div className={`h-[48px] px-4 border rounded-xl flex items-center text-[14px] font-bold ${formData.remainingAmount > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                    ₹ {formData.remainingAmount}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Documents */}
            <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h4 className="text-[14px] font-black text-[#1a237e] uppercase tracking-widest border-b border-gray-50 pb-4">F. Documents Upload</h4>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'aadharCard', label: 'Aadhar Card (Front/Back)', icon: 'badge' },
                  { id: 'marksheet', label: 'Marksheet (10th/12th)', icon: 'description' },
                  { id: 'photo', label: 'Admission Photo', icon: 'image' }
                ].map(doc => (
                  <div key={doc.id} className="flex gap-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl group transition-all hover:bg-white hover:shadow-md">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-blue-500">{doc.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-700">{doc.label}</p>
                      {formData[doc.id as keyof typeof formData] ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Uploaded
                          </span>
                          <a href={formData[doc.id as keyof typeof formData] as string} target="_blank" className="text-[11px] font-black text-blue-500 uppercase hover:underline">View</a>
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase">Max Size: 5MB • JPG, PNG, PDF</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,application/pdf';
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            if (file) handleFileUpload(file, doc.id);
                          };
                          input.click();
                        }}
                        disabled={uploadingField === doc.id}
                        className={`px-4 py-2 rounded-xl text-[12px] font-black tracking-wider uppercase transition-all ${formData[doc.id as keyof typeof formData] ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#111] text-white hover:bg-blue-600 shadow-sm'}`}
                      >
                        {uploadingField === doc.id ? 'Uploading...' : formData[doc.id as keyof typeof formData] ? 'Change' : 'Upload'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                className="flex-1 h-[64px] bg-white border border-gray-200 text-gray-700 rounded-[20px] font-bold text-[14px] hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showEditModal ? handleEditStudent : handleAddStudent}
                disabled={loading || !!uploadingField}
                className="flex-[2] h-[64px] bg-[#1a237e] text-white rounded-[20px] font-bold text-[14px] hover:bg-[#151b60] transition-all shadow-xl shadow-navy/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (showEditModal ? "Save Admission Update" : "Complete Admission Process")}
              </button>
            </div>
          </div>
        </DrawerBody>
        {viewMode === 'blocked' && !showEditModal && (
          <div className="shrink-0 bg-[#111] z-[100] mt-auto">
            <button
              onClick={async () => {
                if (!selectedUserToBlock) return;
                try {
                  setLoading(true);
                  await studentsAPI.update(selectedUserToBlock.id, { 
                    ...selectedUserToBlock, 
                    status: 'inactive',
                    blockedAt: new Date().toISOString()
                  });
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
      <RightSideDrawer isOpen={showViewModal} onClose={() => setShowViewModal(false)} width="500px">
        <DrawerHeader title="Student Profile Details" onClose={() => setShowViewModal(false)} />
        <DrawerBody className="bg-gray-50/30">
          {selectedStudent && (
            <div className="space-y-6 pb-10">
              {/* Header Profile Info */}
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-[#1a237e]/5 border border-[#1a237e]/10 overflow-hidden flex items-center justify-center">
                  {selectedStudent.documents?.profilePhoto ? (
                    <img src={selectedStudent.documents.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#1a237e] text-[40px]">person</span>
                  )}
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-gray-900 leading-tight">{selectedStudent.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-wider">{selectedStudent.id}</span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${selectedStudent.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedStudent.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {selectedStudent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Layout for details */}
              <div className="grid grid-cols-1 gap-4">
                {/* Personal & Contact Section */}
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 text-[#1a237e]">
                    <span className="material-symbols-outlined text-[20px]">contact_page</span>
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Personal & Contact</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <FormLabel label="Father's Name" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.fatherName || 'N/A'}</p>
                    </div>
                    <div>
                      <FormLabel label="Mother's Name" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.motherName || 'N/A'}</p>
                    </div>
                    <div>
                      <FormLabel label="Date of Birth" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <div>
                      <FormLabel label="Gender" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.gender || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 border-t border-gray-50 pt-4">
                      <FormLabel label="Email" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.email}</p>
                    </div>
                    <div>
                      <FormLabel label="Primary Phone" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.phone}</p>
                    </div>
                    <div>
                      <FormLabel label="Alt Phone" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.alternatePhone || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <FormLabel label="Address" />
                      <p className="text-[13px] font-bold text-gray-700 leading-relaxed">{selectedStudent.admission?.fullAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Academic & Admission Section */}
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 text-[#3f51b5]">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Academic & Admission</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <FormLabel label="Prev Class" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.academic?.previousClass || 'N/A'}</p>
                    </div>
                    <div>
                      <FormLabel label="Percentage" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.academic?.marksPercentage || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                        <FormLabel label="Course" />
                        <p className="text-[14px] font-black text-[#1a237e]">{selectedStudent.course}</p>
                    </div>
                    <div>
                      <FormLabel label="Batch" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.batchTiming || 'N/A'}</p>
                    </div>
                    <div>
                      <FormLabel label="Admission Date" />
                      <p className="text-[13px] font-bold text-gray-700">{selectedStudent.admission?.admissionDate ? new Date(selectedStudent.admission.admissionDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Fees & Documents Section */}
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="material-symbols-outlined text-[20px]">currency_rupee</span>
                    <h4 className="text-[12px] font-black uppercase tracking-widest">Fees & Verification</h4>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Total</p>
                        <p className="text-[14px] font-black text-gray-900">₹{selectedStudent.fees?.totalFees || 0}</p>
                    </div>
                    <div className="text-center border-x border-gray-200">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Paid</p>
                        <p className="text-[14px] font-black text-green-600">₹{selectedStudent.fees?.paidAmount || 0}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Due</p>
                        <p className="text-[14px] font-black text-red-600">₹{selectedStudent.fees?.remainingAmount || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <FormLabel label="Verification Documents" />
                    <div className="grid grid-cols-2 gap-3">
                        {['aadharCard', 'marksheet', 'photo'].map(doc => (
                            selectedStudent.documents?.[doc as keyof typeof selectedStudent.documents] ? (
                                <a 
                                    key={doc}
                                    href={selectedStudent.documents?.[doc as keyof typeof selectedStudent.documents] as string}
                                    target="_blank"
                                    className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-400 transition-all group"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-blue-500">description</span>
                                    <span className="text-[11px] font-bold text-gray-600 uppercase truncate">{doc.replace(/([A-Z])/g, ' $1')}</span>
                                </a>
                            ) : null
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 pb-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 h-[56px] bg-gray-900 text-white rounded-xl font-bold text-[14px] hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Close Profile
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

