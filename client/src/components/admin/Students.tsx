import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import axios from 'axios';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../../utils/indiaStates';
import { studentsAPI, coursesAPI, uploadAPI, packagesAPI, testSeriesAPI } from '../../services/apiClient';
import { getImageUrl } from '../../lib/utils';
import { RightSideDrawer, CenterModal, DrawerHeader, DrawerBody, DrawerFooter, FormInput, FormLabel, FormSelect, PrimaryButton, FormPasswordInput } from './DrawerSystem';
import { Student } from './students/types';
import { AddPackagesModal } from './students/AddPackagesModal';
import { StudentProfileContent } from './students/StudentProfileContent';
import { StudentPagination } from './students/StudentPagination';
import { StudentFilters } from './students/StudentFilters';
import { StudentNotesDrawer } from './students/StudentNotesDrawer';
import { StudentFeesDrawer } from './students/StudentFeesDrawer';
import { StudentTable } from './students/StudentTable';

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
  initialStatus?: string;
  viewMode?: 'all' | 'blocked';
}

interface StudentFormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
  state: string;
  city: string;
  district: string;
  class: string;
  userId: string;
  password?: string;
  confirmPassword?: string;
  highQualification: string;
  gender: string;
  registrationDate: string;
  registrationType: string;
  status: 'active' | 'inactive';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes: string;
  fullAddress: string;
}

const Students: React.FC<Props> = ({ showToast, initialStatus = 'all', viewMode = 'all' }) => {
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([]);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);

  // Get all districts for suggestions
  const allDistricts = React.useMemo(() => {
    return Object.values(indiaStateDistrictMap).flat().sort();
  }, []);

  const getStateFromCity = React.useCallback((cityName: string) => {
    if (!cityName) return '';
    for (const [state, districts] of Object.entries(indiaStateDistrictMap)) {
      if ((districts as string[]).includes(cityName)) {
        return state;
      }
    }
    return '';
  }, []);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form states
  const initialFormData: StudentFormData = {
    name: '',
    email: '',
    phone: '',
    dob: '',
    state: '',
    city: '',
    district: '',
    class: '',
    userId: '',
    password: '',
    confirmPassword: '',
    highQualification: '',
    gender: 'Male',
    registrationDate: new Date().toISOString().split('T')[0],
    registrationType: 'regular',
    status: 'active',
    paymentStatus: 'pending',
    notes: '',
    fullAddress: '',
  };
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);

  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ value: string, label: string }[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Student; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof Student) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Load data on mount
  useEffect(() => {
    loadStudents();
    loadCourses();

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle opening student from state
  useEffect(() => {
    if (location.state?.openStudentId && students.length > 0) {
      const student = students.find(s => s.id === location.state.openStudentId);
      if (student) {
        setSelectedStudent(student);
        setShowViewModal(true);
        // Clear state to prevent re-opening
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, students]);

  // Route/Prop Sync: Ensure filters reset and data refreshes when switching between list views
  useEffect(() => {
    setStatusFilter(initialStatus);
    setSearchQuery('');
    setRegistrationFilter('all');
    setPaymentFilter('all');
    setDeviceFilter('all');
    setCurrentPage(1);
    loadStudents();
  }, [initialStatus, viewMode]);

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
  const filteredStudents = useMemo(() => {
    let filtered = students;

    if (debouncedSearchQuery) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name ?? '').toLowerCase().includes(lowerQuery) ||
        (s.id ?? '').toLowerCase().includes(lowerQuery) ||
        (s.email ?? '').toLowerCase().includes(lowerQuery) ||
        (s.phone ?? '').includes(debouncedSearchQuery)
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

    if (deviceFilter === 'pending') {
      filtered = filtered.filter(s => s.pendingDeviceId);
    } else if (deviceFilter === 'locked') {
      filtered = filtered.filter(s => s.deviceId && !s.pendingDeviceId);
    }

    return filtered;
  }, [students, debouncedSearchQuery, statusFilter, registrationFilter, paymentFilter, deviceFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, registrationFilter, paymentFilter, deviceFilter]);

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
    if (!formData.email || !emailRegex.test(formData.email)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return false;
    }
    if (!formData.state) {
      showToast('Please select a state', 'error');
      return false;
    }
    if (!formData.city) {
      showToast('Please enter a district/city', 'error');
      return false;
    }
    if (!showEditModal) {
      if (!formData.password) {
        showToast('Password is required', 'error');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return false;
      }
    } else {
      if (formData.password && formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return false;
      }
    }
    return true;
  };

  const formatPayload = (data: StudentFormData) => {
    const payload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      city: data.district || data.city,
      district: data.district || data.city,
      class: data.class,
      state: data.state,
      userId: data.userId,
      highQualification: data.highQualification,
      registrationDate: data.registrationDate,
      registrationType: data.registrationType,
      status: data.status,
      paymentStatus: data.paymentStatus,
      notes: data.notes,
      gender: data.gender,
      address: data.fullAddress,
      admission: {
        gender: data.gender,
        fullAddress: data.fullAddress,
        admissionDate: new Date().toISOString().split('T')[0]
      }
    };
    if (data.password) {
      payload.password = data.password;
    }
    return payload;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = formatPayload(formData);
      const res = await studentsAPI.create(payload);
      setStudents([{ ...res, hasPassword: !!formData.password || !!res.hasPassword }, ...students]);
      resetForm();
      setShowAddModal(false);
      showToast(`Student ${formData.name} added successfully`, 'success');
    } catch (error: any) {
      console.error('Add student error:', error);
      showToast(error.message || 'Failed to add student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !validateForm()) return;

    try {
      setLoading(true);
      const payload = formatPayload(formData);
      const newPassword = payload.password;
      
      await studentsAPI.update(selectedStudent.id, payload);
      
      if (newPassword) {
        // Mark as set
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, hasPassword: true } : s));
      }
      
      loadStudents(); // Reload to get structured data correctly
      resetForm();
      setShowEditModal(false);
      setSelectedStudent(null);
      showToast('Student updated successfully', 'success');
    } catch (error: any) {
      console.error('Update student error:', error);
      showToast(error.message || 'Failed to update student', 'error');
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
  } catch (error: any) {
    console.error('SERVER_ERROR [deleteReferralAdmin]:', error);
    showToast('Failed to delete referral: ' + error.message, 'error');
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleUnblock = async (student: Student) => {
    try {
      setLoading(true);
      await studentsAPI.update(student.id, { 
        id: student.id, 
        status: 'active', 
        isBanned: false, 
        banReason: null,
        blockedAt: undefined 
      });
      showToast(`${student.name} has been unblocked successfully`, 'success');
      loadStudents();
    } catch (err) {
      showToast('Failed to unblock user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDevice = async (student: Student) => {
    try {
      setLoading(true);
      await studentsAPI.approveDevice(student._id || student.id);
      showToast(`Device approved for ${student.name}`, 'success');
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Error approving device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDevice = async (student: Student) => {
    try {
      setLoading(true);
      await studentsAPI.rejectDevice(student._id || student.id);
      showToast(`Device rejected for ${student.name}`, 'success');
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Error rejecting device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDevice = async (student: Student) => {
    if (!confirm(`Are you sure you want to reset device access for ${student.name}? They will be logged out everywhere.`)) {
      return;
    }
    try {
      setLoading(true);
      await studentsAPI.resetDevice(student._id || student.id);
      showToast(`Device reset for ${student.name}`, 'success');
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Error resetting device', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (student: Student) => {
    const reason = prompt(`Enter reason for banning ${student.name}:`, 'Terms of service violation');
    if (reason === null) return;
    try {
      setLoading(true);
      await studentsAPI.banUser(student.id, reason);
      showToast(`${student.name} has been banned`, 'success');
      loadStudents();
    } catch (err: any) {
      showToast(err.message || 'Failed to ban user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    const hydratedFormData: StudentFormData = {
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      dob: student.dob || '',
      state: student.state || getStateFromCity(student.city) || '',
      city: student.city || student.district || '',
      district: student.district || student.city || '',
      class: student.class || '',
      registrationDate: student.registrationDate || new Date().toISOString().split('T')[0],
      registrationType: student.registrationType || 'regular',
      status: student.status || 'active',
      paymentStatus: student.paymentStatus || 'pending',
      notes: student.notes || '',
      userId: student.userId || student.id || '',
      password: '', 
      confirmPassword: '',
      highQualification: student.highQualification || student.qualification || '',
      gender: student.admission?.gender || student.gender || 'Male',
      fullAddress: student.admission?.fullAddress || student.address || ''
    };
    setFormData(hydratedFormData);
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
    setFormData(initialFormData);
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
        if (selectedStudent && selectedStudent.id === studentId) {
          setSelectedStudent(updated);
        }
        showToast(`Payment status updated to ${status.toUpperCase()}`, 'success');
      } catch (error) {
        console.error('Update payment status error:', error);
        showToast('Failed to update payment status', 'error');
      }
    }
  };

  const handleFileUpload = async (file: File, field: string) => {
    try {
      setUploadingField(field);
      
      let data;
      if (file.type === 'application/pdf') {
        data = await uploadAPI.uploadPDF(file);
      } else {
        data = await uploadAPI.uploadImage(file);
      }
      
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
          {viewMode !== 'blocked' && (
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="w-11 h-11 flex items-center justify-center bg-[#111] text-white rounded-full shadow-lg hover:bg-black transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          )}
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
      <StudentFilters
        isOpen={isFilterOpen}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        deviceFilter={deviceFilter}
        setDeviceFilter={setDeviceFilter}
      />

      {/* Table Section */}
      <StudentTable
        students={paginatedStudents}
        loading={loading}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        showingStart={showingStart}
        showingEnd={showingEnd}
        startIndex={startIndex}
        viewMode={viewMode}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        handleSort={handleSort}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onView={handleViewStudent}
        onEdit={handleEditClick}
        onFees={handleFeesClick}
        onNotes={handleNotesClick}
        onBan={handleBanUser}
        onUnblock={handleUnblock}
        onDelete={handleDeleteStudent}
        filteredStudentsLength={filteredStudents.length}
      />

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
          <div className="space-y-6 pb-20">
            {/* Unified Admission Form */}
            <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-rounded text-indigo-600">person_add</span>
                </div>
                <div>
                  <h4 className="text-[18px] font-black text-gray-900 leading-none">Student Credentials</h4>
                  <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Main Identification Info</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <FormLabel label="Full Name" required />
                  <FormInput
                    placeholder="e.g., Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel label="Email Address" required />
                  <FormInput
                    type="email"
                    placeholder="rahul@example.com"
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
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 10) setFormData({ ...formData, phone: val });
                    }}
                  />
                </div>

                <div className="space-y-2 relative">
                  <FormLabel label="State" required />
                  <input
                    type="text"
                    placeholder="Enter state (e.g. Haryana)"
                    value={formData.state}
                    onChange={(e) => {
                      const val = e.target.value ?? '';
                      setFormData({ ...formData, state: val, city: '' });
                      if (val.trim()) {
                        const lowVal = val.toLowerCase();
                        const filtered = Object.keys(indiaStateDistrictMap).filter(s => 
                          (s ?? '').toLowerCase().includes(lowVal)
                        ).sort().slice(0, 5);
                        setStateSuggestions(filtered);
                        setShowStateSuggestions(filtered.length > 0);
                      } else {
                        setShowStateSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                        if (formData.state.trim()) {
                            const filtered = Object.keys(indiaStateDistrictMap).filter(s => 
                              s.toLowerCase().includes(formData.state.toLowerCase())
                            ).sort().slice(0, 5);
                            setStateSuggestions(filtered);
                            setShowStateSuggestions(filtered.length > 0);
                        }
                    }}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                  {showStateSuggestions && (
                    <div className="absolute z-[70] left-0 right-0 top-[100%] mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {stateSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, state: s, city: '' });
                            setShowStateSuggestions(false);
                          }}
                          className="w-full px-5 py-3.5 text-left text-[13px] font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all border-b border-gray-50 last:border-0"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {showStateSuggestions && <div className="fixed inset-0 z-[65]" onClick={() => setShowStateSuggestions(false)}></div>}
                </div>

                <div className="space-y-2 relative">
                  <FormLabel label="District / City" required />
                  <input
                    type="text"
                    disabled={!formData.state || !indiaStateDistrictMap[formData.state]}
                    placeholder={formData.state && indiaStateDistrictMap[formData.state] ? "Enter district name (e.g. Rohtak)" : "Select valid State first"}
                    value={formData.district || formData.city}
                    onChange={(e) => {
                      const val = e.target.value ?? '';
                      setFormData({ ...formData, district: val, city: val });
                      if (val.trim() && formData.state && indiaStateDistrictMap[formData.state]) {
                        const lowVal = val.toLowerCase();
                        const filtered = (indiaStateDistrictMap[formData.state] || []).filter(d => 
                          (d ?? '').toLowerCase().includes(lowVal)
                        ).slice(0, 5);
                        setDistrictSuggestions(filtered);
                        setShowDistrictSuggestions(filtered.length > 0);
                      } else {
                        setShowDistrictSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                        if (formData.city.trim() && formData.state && indiaStateDistrictMap[formData.state]) {
                            const filtered = (indiaStateDistrictMap[formData.state] || []).filter(d => 
                              d.toLowerCase().includes(formData.city.toLowerCase())
                            ).slice(0, 5);
                            setDistrictSuggestions(filtered);
                            setShowDistrictSuggestions(filtered.length > 0);
                        }
                    }}
                    className={`w-full px-5 py-3.5 border border-gray-100 rounded-2xl text-[14px] font-bold outline-none transition-all shadow-sm ${
                      !formData.state || !indiaStateDistrictMap[formData.state]
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-50 text-gray-700 focus:border-indigo-500 focus:bg-white'
                    }`}
                  />
                  {showDistrictSuggestions && (
                    <div className="absolute z-[60] left-0 right-0 top-[100%] mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {districtSuggestions.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, district: d, city: d });
                            setShowDistrictSuggestions(false);
                          }}
                          className="w-full px-5 py-3.5 text-left text-[13px] font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all border-b border-gray-50 last:border-0"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                  {showDistrictSuggestions && <div className="fixed inset-0 z-[55]" onClick={() => setShowDistrictSuggestions(false)}></div>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel label="Class" required />
                    <FormSelect
                      value={formData.class}
                      onChange={(val) => setFormData({ ...formData, class: val })}
                      options={[
                        { value: '9th', label: '9th' },
                        { value: '10th', label: '10th' },
                        { value: '11th', label: '11th' },
                        { value: '12th', label: '12th' },
                        { value: 'Neet', label: 'Neet' },
                        { value: 'iit-Jee', label: 'iit-Jee' },
                        { value: 'Nursing-CET', label: 'Nursing-CET' },
                        { value: 'Dropper', label: 'Dropper' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="Higher Education" />
                    <FormSelect
                      value={formData.highQualification}
                      onChange={(val) => setFormData({ ...formData, highQualification: val })}
                      options={[
                        { value: '10th Pass', label: '10th Pass' },
                        { value: '12th Pass', label: '12th Pass' },
                        { value: 'Graduate', label: 'Graduate' },
                        { value: 'Post Graduate', label: 'Post Graduate' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel label="Full Address" required />
                  <textarea
                    placeholder="Enter complete residential address"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm min-h-[100px] resize-none"
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

                <div className="space-y-2">
                  <FormLabel label="Date of Birth" required />
                  <FormInput
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                <div className="pt-8 border-t border-gray-100 mt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                    <h5 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">Login Configuration</h5>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <FormLabel label="Student User ID" />
                      <div className="relative group">
                          <input
                            type="text"
                            readOnly
                            value={formData.userId || 'AUTO-GENERATED'}
                            className="w-full px-5 py-3.5 bg-gray-100 border border-gray-100 rounded-2xl text-[14px] font-black text-gray-500 cursor-not-allowed"
                          />
                          <span className="material-symbols-rounded absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">lock</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold px-1">Unique identification used for logging into the student portal.</p>
                    </div>

                      <div className="space-y-6 bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                        <div className="space-y-2">
                          <FormLabel label={showEditModal ? "New Password" : "Create Password *"} required={!showEditModal} />
                          <FormPasswordInput
                            placeholder={showEditModal ? "Leave blank to keep current" : "••••••••"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <FormLabel label={showEditModal ? "Confirm Password" : "Confirm Password *"} required={!showEditModal} />
                          <FormPasswordInput
                            placeholder="Re-enter password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          />
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div className="flex gap-4 px-2">
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                className="flex-1 h-14 rounded-2xl font-black text-[13px] text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={showEditModal ? handleEditStudent : handleAddStudent}
                disabled={loading}
                className="flex-[2] h-14 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : (
                  <>
                    <span className="material-symbols-rounded text-[18px]">how_to_reg</span>
                    {showEditModal ? "Update Admission" : "Finalize Admission"}
                  </>
                )}
              </button>
            </div>
          </div>
        </DrawerBody>
      </RightSideDrawer>


      {/* View Student Modal - Refined Premium Centered Layout */}
      <CenterModal isOpen={showViewModal} onClose={() => setShowViewModal(false)}>
          {selectedStudent && (
             <StudentProfileContent 
                student={selectedStudent} 
                onClose={() => setShowViewModal(false)} 
                getImageUrl={getImageUrl} 
                getStateFromCity={getStateFromCity}
                onApproveDevice={handleApproveDevice}
                onRejectDevice={handleRejectDevice}
                onResetDevice={handleResetDevice}
                onRefresh={async () => {
                   await loadStudents();
                   // Re-sync selected student if it exists
                   if (selectedStudent) {
                      // We fetch all students again, then find the one we are viewing
                      const data = await studentsAPI.getAll();
                      const updated = (Array.isArray(data) ? data : []).find((s: any) => s.id === selectedStudent.id);
                      if (updated) setSelectedStudent(updated);
                   }
                }}
             />
          )}
      </CenterModal>

      {/* Fees Management Drawer */}
      <StudentFeesDrawer
        isOpen={showFeesModal}
        onClose={() => setShowFeesModal(false)}
        selectedStudent={selectedStudent}
        onUpdateStatus={updatePaymentStatus}
      />

      {/* Notes Drawer */}
      <StudentNotesDrawer
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        selectedStudent={selectedStudent}
        notes={formData.notes}
        setNotes={(notes) => setFormData({ ...formData, notes })}
        onSave={saveNotes}
      />
    </div>
  );
};

export default Students;

