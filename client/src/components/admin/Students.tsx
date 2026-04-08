import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../../utils/indiaStates';
import { studentsAPI, coursesAPI, uploadAPI } from '../../services/apiClient';
import { getImageUrl, getPdfUrl } from '../../lib/utils';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormInput, FormLabel, FormSelect, PrimaryButton, FormPasswordInput } from './DrawerSystem';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  course: string;
  state?: string;
  city: string;
  registrationDate: string;
  registrationType: string;
  status: 'active' | 'inactive';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  userId?: string;
  highQualification?: string;
  isBanned?: boolean;
  suspiciousActivityCount?: number;
  blockedAt?: string;
  password?: string;
  gender?: string;

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

// Optimized Internal Component for Student Profile to fix lag and handle toggles locally
const StudentProfileContent: React.FC<{
  student: Student;
  onClose: () => void;
  getImageUrl: (path: string) => string;
  getStateFromCity: (city: string) => string;
}> = React.memo(({ student, onClose, getImageUrl, getStateFromCity }) => {
  const [showPass, setShowPass] = React.useState(false);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Profile Info */}
      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-[#1a237e]/5 border border-[#1a237e]/10 overflow-hidden flex items-center justify-center">
          {student.documents?.profilePhoto ? (
            <img src={getImageUrl(student.documents.profilePhoto)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[#1a237e] text-[40px]">person</span>
          )}
        </div>
        <div>
          <h3 className="text-[18px] font-black text-gray-900 leading-tight">{student.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-wider">{student.id}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${student.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
              {student.status}
            </span>
          </div>
        </div>
      </div>

      <div className="px-1">
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">badge</span>
              <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-wider">Identification</h4>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {[
                { label: 'Full Name', value: student.name },
                { label: 'Email Address', value: student.email },
                { label: 'Phone Number', value: student.phone },
                { label: 'State', value: student.state || getStateFromCity(student.city) },
                { label: 'District / City', value: student.city },
                { label: 'Qualification', value: student.highQualification },
                { label: 'Gender', value: student.gender || student.admission?.gender },
                { label: 'Age / DOB', value: student.dob ? new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                   <p className="text-[13px] font-bold text-gray-800 truncate">{item.value || 'N/A'}</p>
                </div>
              ))}
            </div>

            {/* Optimized & Compact Password Section */}
            <div className="pt-4 mt-2">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between h-16">
                <div className="flex-1">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Account Password</p>
                   <p className="text-[14px] font-mono font-black text-indigo-600 tracking-[0.15em]">
                     {showPass ? (student.password || 'NOT SET') : '••••••••'}
                   </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPass(!showPass)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
                    title={showPass ? "Hide Password" : "Show Password"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                    
                  <button 
                    onClick={() => {
                      if (student.password) {
                        navigator.clipboard.writeText(student.password);
                        toast.success('Password copied!');
                      } else {
                        toast.error('No password available to copy');
                      }
                    }}
                    className={`h-10 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 ${student.password ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    title="Copy Password"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">Copy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onClose}
          className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.22em] shadow-lg hover:bg-black transition-all active:scale-95"
        >
          Close Detail
        </button>
      </div>
    </div>
  );
});

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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    state: '',
    city: '',
    userId: '',
    password: '',
    confirmPassword: '',
    highQualification: '',
    gender: 'Male',
    registrationDate: new Date().toISOString().split('T')[0],
    registrationType: 'regular',
    status: 'active' as 'active' | 'inactive',
    paymentStatus: 'pending' as 'paid' | 'pending' | 'failed',
    notes: '',
    // Legacy/Hidden fields kept in state for API compatibility but hidden from simple form
    fatherName: '',
    motherName: '',
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
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        (s.name ?? '').toLowerCase().includes(lowerQuery) ||
        (s.id ?? '').toLowerCase().includes(lowerQuery) ||
        (s.email ?? '').toLowerCase().includes(lowerQuery) ||
        (s.phone ?? '').includes(searchQuery)
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
      
      setStudents(prev => {
        const passwordMap = new Map();
        prev.forEach(s => {
          if (s.password && s.password !== '••••••••') {
            passwordMap.set(s.id, s.password);
          }
        });
        
        const newData = Array.isArray(data) ? data : [];
        return newData.map((s: any) => ({
          ...s,
          password: passwordMap.get(s.id) || s.password
        }));
      });
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

  const formatPayload = (data: typeof formData) => {
    const payload: any = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      city: data.city,
      state: data.state,
      userId: data.userId,
      highQualification: data.highQualification,
      registrationDate: data.registrationDate,
      registrationType: data.registrationType,
      status: data.status,
      paymentStatus: data.paymentStatus,
      notes: data.notes,
      admission: {
        fatherName: data.fatherName,
        motherName: data.motherName,
        gender: data.gender,
        alternatePhone: data.alternatePhone,
        fullAddress: data.fullAddress,
        batchTiming: data.batchTiming,
        admissionDate: data.admissionDate,
      },
      academic: {
        previousClass: data.previousClass,
        schoolName: data.schoolName,
        marksPercentage: data.marksPercentage,
        passingYear: data.passingYear,
      },
      fees: {
        totalFees: data.totalFees,
        paidAmount: data.paidAmount,
        remainingAmount: data.remainingAmount,
      },
      documents: {
        aadharCard: data.aadharCard,
        marksheet: data.marksheet,
        photo: data.photo,
        profilePhoto: data.profilePhoto,
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
      setStudents([{ ...res, password: formData.password }, ...students]);
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
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, password: newPassword } : s));
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
      state: student.state || getStateFromCity(student.city) || '',
      city: student.city,
      registrationDate: student.registrationDate,
      registrationType: student.registrationType,
      status: student.status,
      paymentStatus: student.paymentStatus,
      notes: student.notes || '',
      userId: student.userId || student.id,
      password: '', // Don't pre-fill password for security
      confirmPassword: '',
      highQualification: student.highQualification || '',
      gender: student.admission?.gender || student.gender || 'Male',
      // Hidden fields
      fatherName: student.admission?.fatherName || '',
      motherName: student.admission?.motherName || '',
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
      state: '',
      city: '',
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
      fatherName: '',
      motherName: '',
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
                      <div className="text-[14px] font-bold text-[#3f51b5] tracking-tight">{s?.name ?? 'Unknown Student'}</div>
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
                      <p className="text-[13px] font-medium text-gray-500">{s?.id ?? 'N/A'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-medium text-gray-500">{s?.email ?? 'N/A'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[13px] font-bold text-gray-600">{s?.phone ?? 'N/A'}</p>
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

      {/* Standardized Pagination Footer */}
      {!loading && filteredStudents.length > 0 && (
        <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
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
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">expand_more</span>
            </div>
            <span className="text-[13px] font-medium text-gray-400 italic">
              Showing {showingStart} to {showingEnd} of {totalItems} entries
            </span>
          </div>

          <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
            >
              Next
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
                    value={formData.city}
                    onChange={(e) => {
                      const val = e.target.value ?? '';
                      setFormData({ ...formData, city: val });
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
                            setFormData({ ...formData, city: d });
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

                <div className="space-y-2">
                  <FormLabel label="Highest Qualification" required />
                  <FormInput
                    placeholder="e.g., Graduate, 12th"
                    value={formData.highQualification}
                    onChange={(e) => setFormData({ ...formData, highQualification: e.target.value })}
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
                </div>

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
                          <FormLabel label={showEditModal ? "Confirm New Password" : "Confirm Password *"} required={!showEditModal} />
                          <FormPasswordInput
                            placeholder={showEditModal ? "Leave blank to keep current" : "••••••••"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          />
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


      {/* View Student Drawer - Optimized Sub-component */}
      <RightSideDrawer isOpen={showViewModal} onClose={() => setShowViewModal(false)} width="500px">
        <DrawerHeader title="Student Profile Details" onClose={() => setShowViewModal(false)} />
        <DrawerBody className="bg-gray-50/30">
          {selectedStudent && (
             <StudentProfileContent 
                student={selectedStudent} 
                onClose={() => setShowViewModal(false)} 
                getImageUrl={getImageUrl} 
                getStateFromCity={getStateFromCity}
             />
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

