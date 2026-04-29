import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../../utils/indiaStates';
import { studentsAPI, coursesAPI, uploadAPI, packagesAPI, testSeriesAPI } from '../../services/apiClient';
import { getImageUrl, getPdfUrl } from '../../lib/utils';
import { RightSideDrawer, CenterModal, DrawerHeader, DrawerBody, DrawerFooter, FormInput, FormLabel, FormSelect, PrimaryButton, FormPasswordInput } from './DrawerSystem';

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
  isBanned?: boolean;
  suspiciousActivityCount?: number;
  blockedAt?: string;
  hasPassword?: boolean;
  gender?: string;
  district?: string;
  whatsAppNumber?: string;
  alternateWhatsAppNumber?: string;
  alternateNumber?: string;
  class?: string;
  address?: string;
  highQualification?: string;
  height?: string;
  qualification?: string;

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
  deviceId?: string;
  activeDeviceId?: string;
  activeDeviceName?: string;
  activeDeviceType?: string;
  activeDeviceIP?: string;
  activeDeviceUserAgent?: string;
  activeDeviceRegisteredAt?: string;
  activeDeviceLastLoginAt?: string;

  pendingDeviceId?: string;
  pendingDeviceName?: string;
  pendingDeviceType?: string;
  pendingDeviceIP?: string;
  pendingDeviceUserAgent?: string;
  pendingDeviceRequestedAt?: string;
  pendingDeviceStatus?: string;

  deviceIP?: string;
  lastIP?: string;

  deviceLocked?: boolean;
  enrolledCourses?: string[];
  _id?: string;
  createdAt?: string;
}

const AddPackagesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAssign: (selectedIds: string[]) => void;
  isAssigning: boolean;
}> = ({ isOpen, onClose, onAssign, isAssigning }) => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedIds([]);
      setSearch('');
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [courses, pkgs, series] = await Promise.all([
        coursesAPI.getAll().catch(() => []),
        packagesAPI.getAll().catch(() => []),
        testSeriesAPI.getAll().catch(() => [])
      ]);

      const all = [
        ...courses.map((c: any) => ({ ...c, type: 'Batch' })),
        ...pkgs.map((p: any) => ({ ...p, type: 'Package' })),
        ...series.map((s: any) => ({ ...s, type: 'Test Series' }))
      ];
      setProducts(all);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => 
    (p.name || p.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-3xl rounded-[24px] shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Compact Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-[18px] font-bold text-slate-900 leading-tight">Add Packages</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Select products to assign to this student</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-900">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Minimal Search Area */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search products by name or type..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] font-medium placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          </div>
        </div>

        {/* Clean List Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Refreshing Catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                  <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                </div>
                <p className="text-[14px] font-bold text-slate-800">No matching products found</p>
                <p className="text-[12px] font-medium text-slate-400 mt-1">Try adjusting your search terms</p>
             </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((p) => {
                const id = p.id || p._id;
                const isSelected = selectedIds.includes(id);
                return (
                  <div 
                    key={id} 
                    onClick={() => toggleSelect(id)}
                    className={`group flex items-center gap-4 px-6 py-4 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white group-hover:border-slate-300'}`}>
                      {isSelected && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-800 truncate">{p.name || p.title}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight shrink-0">{p.type}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold text-slate-900">₹{p.price || 0}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center justify-between shrink-0">
           <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-800">{selectedIds.length} items selected</span>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ready to assign</p>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={onClose} 
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => onAssign(selectedIds)}
                disabled={selectedIds.length === 0 || isAssigning}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[13px] hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isAssigning ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Assign Packages'}
              </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
};


// Optimized Internal Component for Student Profile
const StudentProfileContent: React.FC<{
  student: Student;
  onClose: () => void;
  getImageUrl: (path: string) => string;
  getStateFromCity: (city: string) => string;
  onApproveDevice: (student: Student) => void;
  onRejectDevice: (student: Student) => void;
  onResetDevice: (student: Student) => void;
  onRefresh: () => void;
}> = React.memo(({ 
  student, 
  onClose, 
  getImageUrl, 
  getStateFromCity,
  onApproveDevice,
  onRejectDevice,
  onResetDevice,
  onRefresh
}) => {
  const [activeProfileTab, setActiveProfileTab] = React.useState<'identification' | 'packages' | 'security'>('identification');
  const [isResetting, setIsResetting] = React.useState(false);
  const [newPass, setNewPass] = React.useState('');
  const [confirmPass, setConfirmPass] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Packages state
  const [enrolledDetails, setEnrolledDetails] = React.useState<any[]>([]);
  const [isLoadingEnrolled, setIsLoadingEnrolled] = React.useState(false);
  const [showAddPackages, setShowAddPackages] = React.useState(false);
  const [isAssigning, setIsAssigning] = React.useState(false);

  // Profile photo upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const fetchEnrolledDetails = React.useCallback(async () => {
    if (!student.enrolledCourses || student.enrolledCourses.length === 0) {
      setEnrolledDetails([]);
      return;
    }
    setIsLoadingEnrolled(true);
    try {
      const [allCourses, allPkgs, allSeries] = await Promise.all([
        coursesAPI.getAll().catch(() => []),
        packagesAPI.getAll().catch(() => []),
        testSeriesAPI.getAll().catch(() => [])
      ]);

      const details = student.enrolledCourses.map(id => {
        const item = 
          allCourses.find((c: any) => (c.id || c._id) === id) ||
          allPkgs.find((p: any) => (p.id || p._id) === id) ||
          allSeries.find((s: any) => (s.id || s._id) === id);
        
        if (item) {
          return {
            id: id,
            name: item.name || item.title || 'Unnamed Content',
            type: allCourses.some((c: any) => (c.id || c._id) === id) ? 'Batch' : 
                  allPkgs.some((p: any) => (p.id || p._id) === id) ? 'Package' : 'Test Series',
            price: item.price || 0
          };
        }
        return { id: id, name: 'Unknown/Deleted Content', type: 'Unknown', price: 0 };
      });
      setEnrolledDetails(details);
    } catch (error) {
      console.error('Failed to fetch enrolled details:', error);
    } finally {
      setIsLoadingEnrolled(false);
    }
  }, [student.enrolledCourses]);

  React.useEffect(() => {
    fetchEnrolledDetails();
  }, [fetchEnrolledDetails]);

  const handleUnenroll = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to remove this access?')) return;
    try {
      await studentsAPI.unenroll(student.id, courseId);
      toast.success('Package removed successfully');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove package');
    }
  };

  const handleAssignPackages = async (selectedIds: string[]) => {
    try {
      setIsAssigning(true);
      for (const courseId of selectedIds) {
        await studentsAPI.enroll(student.id, courseId);
      }
      toast.success('Packages assigned successfully');
      setShowAddPackages(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign packages');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadAPI.uploadImage(file);
      await studentsAPI.update(student.id, { 
        documents: { ...student.documents, profilePhoto: res.url } 
      });
      toast.success('Profile photo updated successfully');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPass) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSaving(true);
      await studentsAPI.update(student.id, { password: newPass });
      toast.success('Password updated successfully');
      setIsResetting(false);
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  if (isResetting) {
    return (
      <div className="h-[95vh] md:h-[90vh] max-h-[95vh] md:max-h-[90vh] flex flex-col bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white z-[100] shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-200">
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              </div>
              <div>
                <h3 className="text-[16px] font-black text-gray-900 uppercase tracking-tight leading-none">Security Reset</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Updating student credentials</p>
              </div>
           </div>
           <button onClick={() => setIsResetting(false)} className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
              <span className="material-symbols-outlined">close</span>
           </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 shadow-inner">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Student Identifier</p>
                   <div className="w-full h-14 px-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center">
                      <span className="text-[15px] font-black text-[#1a237e] tracking-wider font-mono">{student.userId || student.id}</span>
                   </div>
                </div>

                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <FormLabel label="NEW PASSWORD" required />
                    <FormPasswordInput 
                      placeholder="Create secure new password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel label="CONFIRM NEW PASSWORD" required />
                    <FormPasswordInput 
                      placeholder="Repeat new password exactly"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <PrimaryButton 
                onClick={handleResetPassword}
                disabled={isSaving}
                className="rounded-2xl h-16 shadow-xl shadow-indigo-100"
              >
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="uppercase tracking-[0.1em]">Processing...</span>
                  </div>
                ) : 'CONFIRM RESET'}
              </PrimaryButton>
              
              <button
                onClick={() => { setIsResetting(false); setNewPass(''); setConfirmPass(''); }}
                disabled={isSaving}
                className="w-full h-16 bg-white border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:border-gray-300 hover:text-gray-900 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[86vh] flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-300 rounded-[22px] shadow-2xl border border-slate-200">
      {/* Pixel Minimal Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white z-[100] shrink-0">
        <div className="flex items-center gap-4">
          <div 
            onClick={handleAvatarClick}
            className="relative w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center cursor-pointer group shadow-sm transition-transform active:scale-95"
          >
            {student.documents?.profilePhoto ? (
              <img src={getImageUrl(student.documents.profilePhoto)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="material-symbols-outlined text-slate-300 text-[28px]">person</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="material-symbols-outlined text-white text-[20px]">photo_camera</span>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                 <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-slate-900 leading-tight">{student.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">{student.id}</span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${student.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <span className={`w-1 h-1 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {student.status}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-200"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>

      {/* Pixel Minimal Tab Selector */}
      <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 shrink-0">
        <div className="max-w-4xl mx-auto flex gap-2">
          {[
            { id: 'identification', label: 'Identity', icon: 'badge' },
            { id: 'packages', label: 'Packages', icon: 'package_2' },
            { id: 'security', label: 'Security', icon: 'security' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProfileTab(tab.id as any)}
              className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98] text-[12px] font-bold uppercase tracking-wide border ${
                activeProfileTab === tab.id 
                ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area - Optimized Spacing */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white custom-scrollbar scroll-smooth">
        <div className="p-6 max-w-6xl mx-auto">
          {activeProfileTab === 'identification' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">info</span>
                  <h4 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Identification Details</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: 'Full Name', value: student.name },
                    { label: 'Email Address', value: student.email },
                    { label: 'Phone Number', value: student.phone },
                    { label: 'State', value: student.state || getStateFromCity(student.city) },
                    { label: 'District', value: student.district || student.city },
                    { label: 'Gender', value: student.gender || student.admission?.gender },
                    { label: 'Address', value: student.admission?.fullAddress || student.address },
                    { label: 'Class', value: student.class },
                    { label: 'Higher Education', value: student.highQualification },
                    { label: 'Age / DOB', value: student.dob ? new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A' }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                       <p className="text-[14px] font-semibold text-slate-800 truncate" title={item.value || 'N/A'}>{item.value || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compact Wallet & Referral */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between group hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm group-hover:bg-amber-100 transition-colors">
                      <span className="material-symbols-outlined text-[20px] fill-1">monetization_on</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Available Coins</p>
                      <p className="text-[20px] font-black text-slate-900 leading-none">{(student as any).coins || 0}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-100 text-[32px] group-hover:text-amber-100 transition-colors">savings</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-100 transition-colors">
                      <span className="material-symbols-outlined text-[20px]">share</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Referral Code</p>
                      <p className="text-[16px] font-black text-slate-900 font-mono tracking-wider leading-none uppercase">{(student as any).referralCode || 'N/A'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const code = (student as any).referralCode;
                      if (code) {
                        navigator.clipboard.writeText(code);
                        toast.success('Referral code copied!');
                      }
                    }}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                  >
                     <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeProfileTab === 'packages' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <span className="material-symbols-outlined text-[20px]">package_2</span>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">Assigned Packages</h4>
                      <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">Active course and catalog access</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddPackages(true)}
                    className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shadow-indigo-100"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Assign New
                  </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Package</th>
                        <th className="px-6 py-3.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</th>
                        <th className="px-6 py-3.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {isLoadingEnrolled ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                             <div className="w-8 h-8 border-3 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-3">Syncing Catalog...</p>
                          </td>
                        </tr>
                      ) : enrolledDetails.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                             <span className="material-symbols-outlined text-[40px] text-slate-200">inventory_2</span>
                             <p className="text-[12px] font-bold text-slate-400 mt-2">No active packages assigned.</p>
                          </td>
                        </tr>
                      ) : (
                        enrolledDetails.map((pkg, idx) => (
                          <tr key={pkg.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-300">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <p className="text-[14px] font-medium text-slate-800 line-clamp-1" title={pkg.name}>{pkg.name}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wider">{pkg.type}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <p className="text-[14px] font-bold text-slate-900">₹{pkg.price}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleUnenroll(pkg.id)}
                                className="w-8 h-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center ml-auto border border-transparent hover:border-rose-100 shadow-none active:scale-90"
                                title="Remove Access"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeProfileTab === 'security' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <span className="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-wide">Access & Device Security</h4>
                      <p className="text-[10px] font-medium text-slate-400 uppercase mt-0.5">Control login binding and credentials</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsResetting(true)}
                    className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                    Update Password
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Device Security</p>
                        {student.activeDeviceLastLoginAt && (
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">
                            LAST LOGIN: {new Date(student.activeDeviceLastLoginAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">HARDWARE INFO</span>
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-slate-100 text-[12px] font-bold text-slate-700">
                            <span className="material-symbols-outlined text-[18px] text-indigo-400">devices</span>
                            {student.activeDeviceType || student.activeDeviceName || 'Unknown Device'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">IP ADDRESS</span>
                            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 text-[11px] font-bold text-slate-700 font-mono">
                              {student.activeDeviceIP || (student as any).deviceIP || (student as any).lastIP || 'N/A'}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400">REGISTRATION</span>
                            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 text-[11px] font-bold text-slate-700">
                              {student.activeDeviceRegisteredAt ? new Date(student.activeDeviceRegisteredAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">UNIQUE DEVICE IDENTIFIER (UID)</span>
                          <div className="px-3 py-2 bg-white rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 break-all select-all leading-tight">
                            {student.activeDeviceId || student.deviceId || 'NO DEVICE REGISTERED'}
                          </div>
                        </div>
                      </div>

                      {(student.activeDeviceId || student.deviceId) && (
                         <button 
                           onClick={() => onResetDevice(student)}
                           className="mt-5 w-full h-11 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all group shadow-sm"
                         >
                           <span className="material-symbols-outlined text-[18px] transition-transform group-hover:rotate-180">logout</span>
                           Unlink Active Device
                         </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/30">
                       <span className="material-symbols-outlined text-indigo-400 text-[18px]">lock</span>
                       <p className="text-[10px] font-medium text-indigo-900 leading-tight">Secure 1:1 hardware binding is active. Shared logins are automatically blocked.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {student.pendingDeviceId ? (
                      <div className="p-6 bg-orange-50 rounded-2xl border border-orange-200/50 shadow-sm flex-1">
                        <div className="flex items-center justify-between gap-3 mb-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 animate-pulse">
                              <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                            </div>
                            <h5 className="text-[12px] font-bold text-orange-900 uppercase tracking-wider">Approval Request</h5>
                          </div>
                          {student.pendingDeviceRequestedAt && (
                            <span className="text-[9px] font-black text-orange-400 uppercase">{new Date(student.pendingDeviceRequestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          )}
                        </div>
                        
                        <div className="space-y-4 mb-6">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-orange-400 uppercase">Requested Device</span>
                            <div className="p-3 bg-white rounded-xl border border-orange-100 font-bold text-[12px] text-orange-900 leading-snug shadow-sm">
                              {student.pendingDeviceType || student.pendingDeviceName || 'New Unknown Device'}
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-orange-100 border-dashed">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">Incoming IP Address</span>
                               <span className="text-[12px] font-bold text-orange-900 font-mono">{student.pendingDeviceIP || 'N/A'}</span>
                             </div>
                             <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                               <span className="material-symbols-outlined text-[18px]">location_searching</span>
                             </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-orange-400 uppercase">Hardware UID</span>
                            <div className="p-2 bg-orange-100/30 rounded-lg border border-orange-100/50 font-mono text-[9px] text-orange-800 break-all select-all">
                              {student.pendingDeviceId}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                          <button
                            onClick={() => onApproveDevice(student)}
                            className="flex-1 h-12 bg-emerald-600 text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                          >
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            Approve
                          </button>
                          <button
                            onClick={() => onRejectDevice(student)}
                            className="w-12 h-12 bg-white border border-orange-200 text-orange-700 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95 flex items-center justify-center shadow-sm"
                            title="Reject Request"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center flex-1 border-dashed">
                         <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-4 shadow-sm">
                            <span className="material-symbols-outlined text-[28px]">verified_user</span>
                         </div>
                         <h5 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Security Status: CLEAR</h5>
                         <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-tight">No pending approval requests</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddPackagesModal 
        isOpen={showAddPackages}
        onClose={() => setShowAddPackages(false)}
        onAssign={handleAssignPackages}
        isAssigning={isAssigning}
      />
    </div>
  );
});

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
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Device Guard</label>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending Requests' },
                  { id: 'locked', label: 'Locked Accounts' }
                ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDeviceFilter(f.id)}
                      className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${deviceFilter === f.id ? 'bg-[#1A237E] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {f.label}
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
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                  PAYMENT
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
                          const dateStr = (viewMode === 'blocked' && (s as any).blockedAt) 
                            ? (s as any).blockedAt 
                            : (s.registrationDate || s.createdAt);
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
                        {s.deviceId && (
                          <div className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border items-center gap-1 ${
                            s.pendingDeviceId 
                            ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' 
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]">
                              {s.pendingDeviceId ? 'warning' : 'devices'}
                            </span>
                            {s.pendingDeviceId ? 'PENDING REQUEST' : 'LOCKED'}
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
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        s.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : s.paymentStatus === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {s.paymentStatus || 'PENDING'}
                      </span>
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

