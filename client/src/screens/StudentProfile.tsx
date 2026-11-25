import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { getAuthHeaders } from '../services/apiClient';
import { API_BASE_URL } from '../services/apiClient';
import { ProfileCompletionCard, AvatarProgressRing } from '../components/profile/ProfileCompletionWidget';
import { indiaStateDistrictMap } from '../utils/indiaStates';

interface StudentProfileProps {
  setAuth: (auth: boolean) => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  const { student: globalStudent, isAuthenticated, clearAuth, setAuth: updateAuth, unreadNotificationsCount } = useAuthStore();
  const { setBottomNavHidden } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState({
    enrolled: 0,
    completed: 0,
    tests: 0
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    class: '',
    higherEducation: '',
    gender: '',
    dob: '',
    address: '',
    state: '',
    district: ''
  });
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (isEditing) {
      setBottomNavHidden(true);
      document.body.classList.add('modal-open-nav-hide');
      document.body.style.overflow = 'hidden';
    } else {
      setBottomNavHidden(false);
      document.body.classList.remove('modal-open-nav-hide');
      document.body.style.overflow = 'unset';
    }
    return () => {
      setBottomNavHidden(false);
      document.body.classList.remove('modal-open-nav-hide');
      document.body.style.overflow = 'unset';
    };
  }, [isEditing, setBottomNavHidden]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/student-login');
      return;
    }

    if (globalStudent) {
      setStudent(globalStudent);
      setEditForm({
        name: globalStudent.name || '',
        phone: globalStudent.phone || '',
        email: globalStudent.email || '',
        class: globalStudent.target || globalStudent.class || '',
        higherEducation: globalStudent.higherEducation || globalStudent.highQualification || '',
        gender: globalStudent.gender || '',
        dob: globalStudent.dob || '',
        address: globalStudent.address || globalStudent.admission?.fullAddress || '',
        state: globalStudent.state || '',
        district: globalStudent.district || globalStudent.city || ''
      });
      fetchStats(globalStudent.id || globalStudent._id);
    }
  }, [isAuthenticated, globalStudent, navigate]);

  const fetchStats = async (studentId: string) => {
    try {
      const [coursesRes, testsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students/${studentId}/courses`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/students/${studentId}/test-results`, { headers: getAuthHeaders() })
      ]);

      const coursesData = await coursesRes.json().catch(() => []);
      const testsData = await testsRes.json().catch(() => []);

      const courses = Array.isArray(coursesData) ? coursesData : [];
      const completedCourses = courses.filter((c: any) => c.progress >= 100).length;

      setStats({
        enrolled: courses.length,
        completed: completedCourses,
        tests: Array.isArray(testsData) ? testsData.length : 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCategories((Array.isArray(data) ? data : []).filter((c: any) => c.isActive));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);


  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        ...editForm,
        target: editForm.class || ''
      };
      const response = await fetch(`${API_BASE_URL}/students/${student.id || student._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedStudent = { ...student, ...payload };
        setStudent(updatedStudent);
        updateAuth(updatedStudent);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  interface MenuItem {
    icon: string;
    label: string;
    path?: string;
    action?: () => void;
  }

  const menuItems: MenuItem[] = [
    { icon: 'school', label: 'My Courses', path: '/my-courses' },
    { icon: 'quiz', label: 'My Tests', path: '/my-tests' },
    { icon: 'notifications', label: 'Notifications', path: '/notifications' },
    { icon: 'help', label: 'Help & Support', path: '/help-support' },
    { icon: 'settings', label: 'Settings', path: '/settings' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-100 pb-20">
        <div className="bg-gradient-to-br from-primary-800 via-brandBlue to-primary-700 pt-6 pb-14 px-4">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-full skeleton opacity-30" />
            <div className="w-10 h-10 rounded-full skeleton opacity-30" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full skeleton opacity-30" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 skeleton opacity-30 rounded-lg" />
              <div className="h-3 w-44 skeleton opacity-30 rounded-lg" />
              <div className="h-3 w-28 skeleton opacity-30 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="-mt-6 px-4">
          <div className="card-premium p-4">
            <div className="h-3 w-24 skeleton rounded-lg mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 skeleton rounded-2xl" />
                  <div className="h-2.5 w-12 skeleton rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card-premium p-4 flex items-center gap-4">
              <div className="w-11 h-11 skeleton rounded-2xl" />
              <div className="flex-1 h-4 skeleton rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100 pb-2">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-br from-primary-800 via-brandBlue to-primary-700 text-white pt-6 pb-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 glass-dark rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
            >
              <span className="material-symbols-rounded text-xl">menu</span>
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="w-10 h-10 glass-dark rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
            >
              <span className="material-symbols-rounded text-xl">edit</span>
            </button>
          </div>

          <div className="flex items-center gap-4 animate-fade-in-up">
            <AvatarProgressRing student={student} size={96}>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-elevated">
                <span className="text-3xl font-black text-brandBlue">
                  {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
            </AvatarProgressRing>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{student?.name || 'Student'}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="material-symbols-rounded text-blue-200 text-sm">mail</span>
                <p className="text-blue-200 text-xs truncate">{student?.email}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-rounded text-blue-200 text-sm">call</span>
                <p className="text-blue-200 text-xs">{student?.phone || '+91 XXXXX XXXXX'}</p>
              </div>
              {(student?.class || student?.target) && (
                <div className="flex items-center gap-2 mt-2">
                  {student?.class && (
                    <span className="text-[10px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">
                      {student.class}
                    </span>
                  )}
                  {student?.target && (
                    <span className="text-[10px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">
                      {student.target}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Completion Circle & Status Card */}
      <div className="-mt-7 px-4 mb-3 animate-fade-in-up relative z-20">
        <ProfileCompletionCard
          student={student}
          onEditClick={() => setIsEditing(true)}
        />
      </div>

      <div className="px-4 mt-2 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        <div className="card-premium p-4">
          <h3 className="font-semibold text-[11px] text-gray-400 uppercase tracking-widest mb-3">Learning Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50/80 rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.97]">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <span className="material-symbols-rounded text-brandBlue text-lg fill-1">menu_book</span>
              </div>
              <p className="text-xl font-black text-brandBlue leading-none">{stats.enrolled}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Enrolled</p>
            </div>
            <div className="bg-emerald-50/80 rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.97]">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <span className="material-symbols-rounded text-emerald-600 text-lg fill-1">task_alt</span>
              </div>
              <p className="text-xl font-black text-emerald-600 leading-none">{stats.completed}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Completed</p>
            </div>
            <div className="bg-amber-50/80 rounded-2xl p-3 text-center transition-all duration-200 active:scale-[0.97]">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                <span className="material-symbols-rounded text-amber-600 text-lg fill-1">quiz</span>
              </div>
              <p className="text-xl font-black text-amber-600 leading-none">{stats.tests}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="card-premium overflow-hidden">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => item.path ? navigate(item.path) : item.action?.()}
              className="w-full p-4 flex items-center gap-3 transition-all duration-200 active:scale-[0.97] active:bg-surface-100 hover:bg-surface-50"
            >
              <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-gray-600 text-xl">{item.icon}</span>
              </div>
              <span className="flex-1 text-left font-medium text-sm text-gray-800">{item.label}</span>
              {item.label === 'Notifications' && unreadNotificationsCount > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 mr-1 animate-pulse"></span>
              )}
              <span className="material-symbols-rounded text-gray-300 text-lg">chevron_right</span>
              {idx < menuItems.length - 1 && (
                <div className="absolute bottom-0 left-[4.25rem] right-4 h-px bg-gray-100" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-3xl bg-red-50 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] hover:bg-red-100 border border-red-100"
        >
          <span className="material-symbols-rounded text-red-500 text-xl">logout</span>
          <span className="font-semibold text-sm text-red-600">Log Out</span>
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col p-6 animate-slide-up shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden shrink-0" />
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900">Edit Profile</h2>
                <p className="text-xs text-slate-400 mt-0.5">Complete your details to reach 100%</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
              >
                <span className="material-symbols-rounded text-slate-500 text-lg">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 hide-scrollbar">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Full Name *</label>
                <div className="relative mt-1">
                  <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">person</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phone *</label>
                  <div className="relative mt-1">
                    <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">call</span>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Email *</label>
                  <div className="relative mt-1">
                    <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">mail</span>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Gender</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, gender: g })}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        editForm.gender === g
                          ? 'bg-[#1A237E] text-white border-[#1A237E] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Date of Birth</label>
                <div className="relative mt-1">
                  <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">calendar_today</span>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white transition-all text-slate-700"
                  />
                </div>
              </div>

              {/* Target & Higher Education */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Target</label>
                  <div className="relative mt-1">
                    <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">school</span>
                    <select
                      value={editForm.class || ''}
                      onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white appearance-none transition-all font-bold"
                    >
                      <option value="">Select Target</option>
                      {categories.map(cat => (
                        <option key={cat.id || cat._id} value={cat.title}>{cat.title}</option>
                      ))}
                      {categories.length === 0 && (
                        <>
                          <option value="9th">9th</option>
                          <option value="10th">10th</option>
                          <option value="11th">11th</option>
                          <option value="12th">12th</option>
                          <option value="Neet">Neet</option>
                          <option value="iit-Jee">iit-Jee</option>
                          <option value="Nursing-CET">Nursing-CET</option>
                          <option value="Dropper">Dropper</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Higher Education</label>
                  <div className="relative mt-1">
                    <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-1/2 -translate-y-1/2">history_edu</span>
                    <select
                      value={editForm.higherEducation || ''}
                      onChange={(e) => setEditForm({ ...editForm, higherEducation: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white appearance-none transition-all font-bold"
                    >
                      <option value="">Select Qualification</option>
                      <option value="10th Pass">10th Pass</option>
                      <option value="12th Pass">12th Pass</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Post Graduate">Post Graduate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Address</label>
                <div className="relative mt-1">
                  <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3 top-3">home</span>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Enter full address"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">State</label>
                  <div className="relative mt-1">
                    <select
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value, district: '' })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white appearance-none transition-all font-bold"
                    >
                      <option value="">Select State</option>
                      {Object.keys(indiaStateDistrictMap).sort().map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">District</label>
                  <div className="relative mt-1">
                    <select
                      value={editForm.district}
                      onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                      disabled={!editForm.state}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-brandBlue/20 focus:border-brandBlue focus:bg-white appearance-none transition-all font-bold disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {(editForm.state ? indiaStateDistrictMap[editForm.state] || [] : []).sort().map((dist: string) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 transition-all duration-200 active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white rounded-2xl font-bold text-xs shadow-md shadow-indigo-900/20 active:scale-[0.97] transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
