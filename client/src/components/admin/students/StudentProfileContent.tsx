import React from 'react';
import { toast } from 'sonner';
import { studentsAPI, coursesAPI, packagesAPI, testSeriesAPI, uploadAPI } from '../../../services/apiClient';
import { FormLabel, FormPasswordInput, PrimaryButton } from '../DrawerSystem';
import { AddPackagesModal } from './AddPackagesModal';
import { Student } from './types';

interface StudentProfileContentProps {
  student: Student;
  onClose: () => void;
  getImageUrl: (path: string) => string;
  getStateFromCity: (city: string) => string;
  onApproveDevice: (student: Student) => void;
  onRejectDevice: (student: Student) => void;
  onResetDevice: (student: Student) => void;
  onRefresh: () => void;
}

export const StudentProfileContent: React.FC<StudentProfileContentProps> = React.memo(({ 
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
