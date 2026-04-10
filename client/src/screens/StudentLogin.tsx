import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../utils/indiaStates';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const phoneSchema = z.object({
  phone: z.string().length(10, 'Enter a valid 10-digit phone number').regex(/^\d+$/, 'Digits only'),
});

const profileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().length(10, 'Enter a valid 10-digit phone number').regex(/^\d+$/, 'Digits only'),
  address: z.string().optional().or(z.literal('')),
  state: z.string().min(1, 'Please select a state'),
  district: z.string().min(1, 'Please select a district'),
  whatsAppNumber: z.string().length(10, "WhatsApp number must be 10 digits").regex(/^\d+$/, 'Digits only'),
  alternateNumber: z.string().length(10, "Alternate number must be 10 digits").regex(/^\d+$/, 'Digits only'),
  gender: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  class: z.string().min(1, 'Please select a class'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm your password'),
  target: z.string().optional().or(z.literal('')),
  referralCode: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

interface StudentLoginProps {
  setAuth: (student: any, accessToken?: string, deviceId?: string) => void;
  onSuccess?: () => void;
}

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    if (window.crypto && window.crypto.randomUUID) {
      deviceId = window.crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

const StudentLogin: React.FC<StudentLoginProps> = ({ setAuth, onSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'otp' | 'signup' | 'profile' | 'category' | 'subcategory' | 'forgot-password' | 'reset-otp' | 'new-password' | 'signup-otp'>('login');

  const {
    register: loginReg,
    handleSubmit: handleLoginSubmit,
    watch: loginWatch,
    formState: { errors: loginErrors }
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' }
  });

  const {
    register: profileReg,
    handleSubmit: handleProfileSubmit,
    setValue: setProfileValue,
    watch: profileWatch,
    formState: { errors: profileErrors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      state: '',
      district: '',
      whatsAppNumber: '',
      alternateNumber: '',
      gender: '',
      dob: '',
      class: '11th',
      target: '',
      referralCode: ''
    }
  });

  const selectedState = profileWatch('state');
  const availableDistricts = selectedState ? indiaStateDistrictMap[selectedState] || [] : [];

  const currentPhone = loginWatch('phone');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fallbackCategories = [
    { id: 'neet', title: 'NEET', isActive: true },
    { id: 'iit-jee', title: 'IIT-JEE', isActive: true },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          const active = (Array.isArray(data) ? data : []).filter((c: any) => c.isActive);
          setCategories(active.length > 0 ? active : fallbackCategories);
        } else {
          setCategories(fallbackCategories);
        }
      } catch {
        setCategories(fallbackCategories);
      }
    };
    fetchCategories();
  }, []);

  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  const [selectionModal, setSelectionModal] = useState<{ isOpen: boolean, type: 'state' | 'district' | null }>({ isOpen: false, type: null });
  const [searchQuery, setSearchQuery] = useState('');
  
  // New States for Password & Forgot Password
  const [passwordFormData, setPasswordFormData] = useState({ loginId: '', password: '' });
  const [resetPhone, setResetPhone] = useState('');
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirm: '' });

  const openSelection = (type: 'state' | 'district') => {
    if (type === 'district' && !selectedState) {
      toast.error('Please select a state first');
      return;
    }
    setSearchQuery('');
    setSelectionModal({ isOpen: true, type });
  };

  const handleSelection = (value: string) => {
    if (selectionModal.type === 'state') {
      setProfileValue('state', value);
      setProfileValue('district', '');
    } else if (selectionModal.type === 'district') {
      setProfileValue('district', value);
    }
    setSelectionModal({ isOpen: false, type: null });
  };

  const SelectionModal = () => {
    if (!selectionModal.isOpen) return null;

    const options = selectionModal.type === 'state'
      ? Object.keys(indiaStateDistrictMap).sort()
      : availableDistricts.sort();

    const filteredOptions = options.filter(opt =>
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectionModal({ isOpen: false, type: null })}></div>
        <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] h-[80vh] sm:h-auto sm:max-h-[70vh] flex flex-col overflow-hidden animate-slide-in-bottom sm:animate-fade-in">
          <div className="p-6 border-b border-gray-100 shrink-0">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden"></div>
            <h3 className="text-xl font-black text-gray-800 capitalize">Select {selectionModal.type}</h3>
            <div className="mt-4 relative">
              <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder={`Search ${selectionModal.type}...`}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1A237E] text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 hide-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelection(opt)}
                  className={`w-full px-6 py-4 rounded-2xl text-left text-sm font-bold transition-all ${(selectionModal.type === 'state' ? selectedState : profileWatch('district')) === opt
                    ? 'bg-[#1A237E]/10 text-[#1A237E] border-2 border-[#1A237E]/20'
                    : 'text-gray-600 hover:bg-gray-50 hover:pl-8'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {(selectionModal.type === 'state' ? selectedState : profileWatch('district')) === opt && (
                      <span className="material-symbols-rounded text-lg">check_circle</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 text-center">
                <span className="material-symbols-rounded text-5xl text-gray-200">search_off</span>
                <p className="text-gray-400 mt-2 font-bold">No results found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      const formattedDate = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      setProfileValue('dob', formattedDate);
    }
  }, [dobDay, dobMonth, dobYear, setProfileValue]);

  const ScrollPicker = ({ value, options, onChange, label }: { value: string, options: any[], onChange: (val: string) => void, label: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const index = options.findIndex(opt => opt.value === value);
      if (index !== -1 && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: index * 44,
          behavior: 'smooth'
        });
      }
    }, [value, options]);

    return (
      <div className="relative group flex-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-[#1A237E] font-black mb-2 block text-center opacity-70">{label}</label>
        <div className="relative h-36 overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 bg-[#1A237E]/5 border-y border-[#1A237E]/10 pointer-events-none z-10 mx-2 rounded-xl"></div>

          <div
            ref={scrollRef}
            className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col items-center py-[62px]"
          >
            {options.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => onChange(opt.value)}
                className={`h-11 shrink-0 flex items-center justify-center snap-center px-4 w-full transition-all duration-300 cursor-pointer z-20 ${value === opt.value
                  ? 'text-[#1A237E] font-black text-lg scale-110'
                  : 'text-gray-400 text-sm font-bold opacity-60'
                  }`}
              >
                {opt.label}
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10"></div>
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10"></div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    // If user is already logged in, take them to home
    const isAuth = localStorage.getItem('isStudentAuthenticated') === 'true';
    if (isAuth && step !== 'otp' && step !== 'profile') {
      navigate('/');
    }
  }, [navigate, step]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const sendLoginOtp = async (data: PhoneFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone })
      });
      const resData = await response.json();
      if (!response.ok) {
        if (response.status === 404 && resData.error && resData.error.includes('Account not found')) {
          toast.error('Account not found. Redirecting to sign up...');
          setStep('signup');
          return;
        }
        throw new Error(resData.error || 'Failed to send OTP');
      }

      setStep('otp');
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']);
      if (resData.otp) {
        toast.success(`OTP for testing: ${resData.otp}`, { duration: 10000 });
      } else {
        toast.success('OTP sent successfully');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndLogin = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          otp: otpValue,
          deviceId: getDeviceId()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OTP verification failed');

      setAuth(data.student, data.accessToken, data.deviceId);
      toast.success('Login successful!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    if (resendTimer > 0) return;
    if (currentPhone.length === 10) {
      await sendLoginOtp({ phone: currentPhone });
    }
  };



  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordFormData.loginId || !passwordFormData.password) {
      toast.error('Please enter both Login ID and Password');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/students/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...passwordFormData, deviceId: getDeviceId() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Login successful!');
        setAuth(data.student, data.accessToken, data.deviceId);
        if (onSuccess) onSuccess();
        navigate('/student/dashboard');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone || resetPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/students/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Reset OTP sent!');
        setStep('reset-otp');
        setOtp(['', '', '', '', '', '']);
        setResendTimer(60);
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async () => {
    try {
      setLoading(true);
      const otpStr = otp.join('');
      const response = await fetch('/api/students/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone, otp: otpStr })
      });
      if (response.ok) {
        toast.success('OTP verified!');
        setStep('new-password');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordData.password) {
      toast.error('Password is required');
      return;
    }
    if (newPasswordData.password !== newPasswordData.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/students/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone, newPassword: newPasswordData.password })
      });
      if (response.ok) {
        toast.success('Password updated! Please login.');
        setStep('login');
        setPasswordFormData({ loginId: resetPhone, password: '' });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (err) {
      toast.error('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const verifySignupOtp = async () => {
    try {
      setLoading(true);
      const otpStr = otp.join('');
      const response = await fetch('/api/students/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentPhone, otp: otpStr })
      });
      if (response.ok) {
        toast.success('OTP verified!');
        setStep('profile');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginStep = () => (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[#1A237E] text-2xl">lock_open</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Welcome Back!</h2>
          <p className="text-sm text-gray-500 mt-1">Login with Password</p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">User ID / Email / Mobile Number</label>
            <input
              type="text"
              value={passwordFormData.loginId}
              onChange={(e) => {
                let val = e.target.value;
                // If all digits (phone number), cap at 10
                if (/^\d*$/.test(val) && val.length > 10) val = val.slice(0, 10);
                setPasswordFormData({ ...passwordFormData, loginId: val });
              }}
              placeholder="Enter User ID, Email or Mobile"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#303F9F] focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Password</label>
              <button
                type="button"
                onClick={() => setStep('forgot-password')}
                className="text-xs font-bold text-[#1A237E] hover:underline"
              >
                Forgot?
              </button>
            </div>
            <div className="relative group/pass">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordFormData.password}
                onChange={(e) => setPasswordFormData({ ...passwordFormData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#303F9F] focus:bg-white transition-all text-sm font-medium pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A237E] transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                <span className="material-symbols-rounded text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white rounded-xl font-black text-sm shadow-xl shadow-blue-900/20 disabled:opacity-50 hover:shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Login Now'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setStep('signup')}
            className="text-[#1A237E] font-black hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );

  const renderForgotStep = () => (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
      <div className="w-full p-6 sm:p-8">
        <button onClick={() => setStep('login')} className="flex items-center gap-1 text-[#1A237E] font-bold text-sm mb-6 group">
          <span className="material-symbols-rounded text-lg transition-transform group-hover:-translate-x-1">arrow_back</span> Back to Login
        </button>
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-orange-600 text-2xl">lock_reset</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
          <p className="text-sm text-gray-500 mt-1">Receive an OTP to reset your password</p>
        </div>
        <form onSubmit={handleForgotStep1} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Mobile Number</label>
            <div className="flex">
              <div className="flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 rounded-l-2xl text-sm text-gray-700 font-bold">+91</div>
              <input
                type="tel"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-r-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full h-14 bg-[#111] text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 transition-all hover:bg-black active:scale-[0.98]">
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderResetOtpStep = () => (
    <div className="p-8">
      <button onClick={() => setStep('forgot-password')} className="flex items-center gap-2 text-gray-400 font-bold text-[12px] mb-8 uppercase tracking-widest group">
        <span className="material-symbols-rounded text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span> Go Back
      </button>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-navy leading-none">Security Check</h2>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Enter OTP sent to +91 {resetPhone}</p>
      </div>
      <div className="space-y-8">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { otpRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className={`w-12 h-16 text-center text-2xl font-black border-2 rounded-2xl focus:outline-none transition-all ${digit ? 'border-brandBlue bg-brandBlue/5 text-brandBlue shadow-lg shadow-brandBlue/10' : 'border-gray-100 focus:border-brandBlue text-gray-400'}`}
            />
          ))}
        </div>
        <button
          onClick={verifyResetOtp}
          disabled={loading || otp.join('').length !== 6}
          className="w-full h-14 bg-brandBlue text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-brandBlue/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </div>
  );

  const renderNewPasswordStep = () => (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-navy leading-none">New Password</h2>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Create a strong password</p>
      </div>
      <form onSubmit={resetPasswordSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPasswordData.password}
              onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A237E] transition-colors"
            >
              <span className="material-symbols-rounded text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={newPasswordData.confirm}
              onChange={(e) => setNewPasswordData({ ...newPasswordData, confirm: e.target.value })}
              placeholder="••••••••"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A237E] transition-colors"
            >
              <span className="material-symbols-rounded text-xl">
                {showConfirmPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-brandBlue text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-brandBlue/20 active:scale-[0.98] transition-all"
        >
          {loading ? 'Saving...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );

  const renderSignupOtpStep = () => (
    <div className="p-8">
      <button onClick={() => setStep('signup')} className="flex items-center gap-2 text-gray-400 font-bold text-[12px] mb-8 uppercase tracking-widest group">
        <span className="material-symbols-rounded text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span> Go Back
      </button>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-navy leading-none">OTP Verification</h2>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sent to +91 {currentPhone}</p>
      </div>
      <div className="space-y-8">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { otpRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className={`w-12 h-16 text-center text-2xl font-black border-2 rounded-2xl focus:outline-none transition-all ${digit ? 'border-[#1A237E] bg-[#1A237E]/5 text-[#1A237E] shadow-lg' : 'border-gray-100 focus:border-[#1A237E] text-gray-400'}`}
            />
          ))}
        </div>
        <button
          onClick={verifySignupOtp}
          disabled={loading || otp.join('').length !== 6}
          className="w-full h-14 bg-[#1A237E] text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </div>
  );

  const renderOtpStep = () => (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setStep('login')}
          className="flex items-center gap-1 text-[#1A237E] font-semibold text-sm mb-4 group hover:text-[#303F9F]"
        >
          <span className="material-symbols-rounded text-lg">arrow_back</span> <span>Back</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[#1A237E] text-2xl">sms</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Login with OTP</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit OTP sent to<br />
            <span className="font-semibold text-gray-700">+91 {currentPhone}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2.5">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { otpRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all ${digit ? 'border-[#303F9F] bg-[#1A237E]/5' : 'border-gray-200 focus:border-[#303F9F]'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={verifyOtpAndLogin}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 hover:shadow-xl transition-all"
          >
            {loading ? 'Verifying OTP...' : 'Verify & Login'}
          </button>

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend OTP in <span className="font-bold text-[#1A237E]">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={resendLoginOtp}
                disabled={loading}
                className="text-sm text-[#1A237E] font-bold hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSignupStep = () => (
    <div className="flex flex-col items-center justify-start w-full">
      <div className="w-full p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setStep('login')}
          className="flex items-center gap-1 text-[#1A237E] font-semibold text-sm mb-4 group hover:text-[#303F9F]"
        >
          <span className="material-symbols-rounded text-lg">arrow_back</span> <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[#1A237E] text-2xl">person_add</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Create Account</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your phone number to get started</p>
        </div>

        <form onSubmit={handleLoginSubmit(async (data) => {
          setLoading(true);
          try {
            const response = await fetch('/api/students/check-phone', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: data.phone })
            });
            const resData = await response.json();

            if (!response.ok) throw new Error(resData.error || 'Failed to check phone');

            if (resData.exists) {
              toast.error('You are already registered. Please login with password.');
              return;
            }

            // Send registration OTP
            const otpRes = await fetch('/api/students/signup/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: data.phone })
            });

            if (otpRes.ok) {
              toast.success('Registration OTP sent!');
              setProfileValue('phone', data.phone);
              setStep('signup-otp');
              setResendTimer(60);
              setOtp(['', '', '', '', '', '']);
            } else {
              const otpData = await otpRes.json();
              throw new Error(otpData.error || 'Failed to send OTP');
            }
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setLoading(false);
          }
        })} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Phone Number *</label>
            <div className="flex">
              <div className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium">
                +91
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                {...loginReg('phone')}
                placeholder="Enter 10-digit number"
                maxLength={10}
                onKeyDown={(e) => {
                  const val = e.currentTarget.value.replace(/\D/g, '');
                  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                  if (/^\d$/.test(e.key) && val.length >= 10) e.preventDefault();
                }}
                className={`w-full px-4 py-3 border rounded-r-xl focus:outline-none focus:border-[#303F9F] text-sm ${loginErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
              />
            </div>
            {loginErrors.phone && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{loginErrors.phone.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 hover:shadow-xl transition-all"
          >
            Continue
          </button>

          <p className="text-center text-sm text-gray-500 mt-3">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setStep('login')}
              className="text-[#1A237E] font-bold hover:underline"
            >
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="px-6 pt-5 flex-shrink-0 bg-white relative z-20">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setStep('signup')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-[#1A237E] hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
          <div>
            <h3 className="text-base font-black text-navy leading-none">Complete Profile</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Final Step</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit(async (data) => {
        setLoading(true);
        console.log('Profile Submission data:', data);
        try {
          const response = await fetch('/api/students/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          console.log('Registration response status:', response.status);
          const resData = await response.json();
          console.log('Registration response data:', resData);
          
          if (!response.ok) throw new Error(resData.error || 'Registration failed');
          
          toast.success('Registration successful! Please login.');
          setStep('login');
          setPasswordFormData({ loginId: data.phone, password: '' });
        } catch (err: any) {
          console.error('Registration Catch Error:', err);
          toast.error(err.message || 'An unexpected error occurred during registration');
        } finally {
          setLoading(false);
        }
      })} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-2 sm:px-8 space-y-3 hide-scrollbar">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name *</label>
            <input
              type="text"
              {...profileReg('name')}
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-[#303F9F] text-sm ${profileErrors.name ? 'border-red-500' : 'border-gray-200'}`}
            />
            {profileErrors.name && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.name.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
            <input
              type="email"
              {...profileReg('email')}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-[#303F9F] text-sm ${profileErrors.email ? 'border-red-500' : 'border-gray-200'}`}
            />
            {profileErrors.email && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.email.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Address</label>
            <input
              type="text"
              {...profileReg('address')}
              placeholder="Enter your address"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#303F9F] text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">State *</label>
              <button
                type="button"
                onClick={() => openSelection('state')}
                className={`w-full px-4 py-3.5 border rounded-xl flex items-center justify-between text-sm transition-all ${profileErrors.state ? 'border-red-500' : 'border-gray-200'
                  } ${selectedState ? 'text-gray-800 font-bold' : 'text-gray-400 hover:border-gray-300'}`}
              >
                <span>{selectedState || 'Select State'}</span>
                <span className="material-symbols-rounded text-gray-400">expand_more</span>
              </button>
              <input type="hidden" {...profileReg('state')} />
              {profileErrors.state && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.state.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">District *</label>
              <button
                type="button"
                onClick={() => openSelection('district')}
                className={`w-full px-4 py-3.5 border rounded-xl flex items-center justify-between text-sm transition-all ${profileErrors.district ? 'border-red-500' : 'border-gray-200'
                  } ${profileWatch('district') ? 'text-gray-800 font-bold' : 'text-gray-400 hover:border-gray-300'} ${!selectedState ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
              >
                <span>{profileWatch('district') || 'Select District'}</span>
                <span className="material-symbols-rounded text-gray-400">expand_more</span>
              </button>
              <input type="hidden" {...profileReg('district')} />
              {profileErrors.district && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.district.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">WhatsApp No *</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                {...profileReg('whatsAppNumber')}
                placeholder="10-digit number"
                maxLength={10}
                onKeyDown={(e) => {
                  const val = e.currentTarget.value.replace(/\D/g, '');
                  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                  if (/^\d$/.test(e.key) && val.length >= 10) e.preventDefault();
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-[#303F9F] text-sm ${profileErrors.whatsAppNumber ? 'border-red-500' : 'border-gray-200'}`}
              />
              {profileErrors.whatsAppNumber && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.whatsAppNumber.message}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Alternate No *</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                {...profileReg('alternateNumber')}
                placeholder="10-digit number"
                maxLength={10}
                onKeyDown={(e) => {
                  const val = e.currentTarget.value.replace(/\D/g, '');
                  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                  if (/^\d$/.test(e.key) && val.length >= 10) e.preventDefault();
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-[#303F9F] text-sm ${profileErrors.alternateNumber ? 'border-red-500' : 'border-gray-200'}`}
              />
              {profileErrors.alternateNumber && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.alternateNumber.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setProfileValue('gender', g)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border ${profileWatch('gender') === g
                    ? 'bg-[#1A237E] text-white border-[#1A237E] shadow-lg shadow-blue-900/20'
                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input type="hidden" {...profileReg('gender')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Date of Birth *</label>
            <div className="flex gap-3 mb-4">
              <ScrollPicker
                label="Day"
                value={dobDay}
                onChange={setDobDay}
                options={Array.from({ length: 31 }, (_, i) => ({
                  value: String(i + 1),
                  label: String(i + 1).padStart(2, '0')
                }))}
              />
              <ScrollPicker
                label="Month"
                value={dobMonth}
                onChange={setDobMonth}
                options={[
                  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ].map((m, i) => ({
                  value: String(i + 1),
                  label: m
                }))}
              />
              <ScrollPicker
                label="Year"
                value={dobYear}
                onChange={setDobYear}
                options={Array.from({ length: 40 }, (_, i) => {
                  const y = String(new Date().getFullYear() - i - 5);
                  return { value: y, label: y };
                })}
              />
            </div>
            <input type="hidden" {...profileReg('dob')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Class</label>
            <div className="grid grid-cols-3 gap-2">
              {['9th', '10th', '11th', '12th', 'Dropper'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProfileValue('class', c)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border ${profileWatch('class') === c
                    ? 'bg-[#1A237E] text-white border-[#1A237E] shadow-lg shadow-blue-900/20'
                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input type="hidden" {...profileReg('class')} />
            {profileErrors.class && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.class.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Create Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...profileReg('password')}
                required
                placeholder="Min 6 characters"
                className={`w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A237E] transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                <span className="material-symbols-rounded text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {profileErrors.password && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.password.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                {...profileReg('confirmPassword')}
                required
                placeholder="Re-enter password"
                className={`w-full px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-brandBlue focus:bg-white transition-all text-sm font-bold pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A237E] transition-colors"
                title={showConfirmPassword ? "Hide Password" : "Show Password"}
              >
                <span className="material-symbols-rounded text-xl">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {profileErrors.confirmPassword && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.confirmPassword.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Referral Code (Optional)</label>
            <input
              type="text"
              {...profileReg('referralCode')}
              placeholder="Enter referral code (e.g. AONE-XXXX)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#303F9F] text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 sm:px-8 border-t border-gray-50">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-4 rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-screen bg-surface-100 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A237E]/5 to-[#303F9F]/10 pointer-events-none"></div>
      <div
        className="absolute top-0 w-full h-[32vh] min-h-[260px] bg-gradient-to-b from-[#1A237E] to-[#283593] shadow-lg z-0"
        style={{ borderBottomLeftRadius: '30% 10%', borderBottomRightRadius: '30% 10%' }}
      ></div>

      {/* Fixed Header Section */}
      <div className="relative z-20 pt-10 px-5 flex flex-col items-center flex-shrink-0">
        <div className="mb-6 flex flex-col items-center">
          <img src="/attach-assist/alonelogo_1770810181717.jpg" alt="Aone Target" className="w-[64px] h-[64px] object-contain rounded-2xl shadow-lg border-4 border-white/20 bg-white mb-2" />
          <h1 className="text-[20px] font-black text-white drop-shadow-md tracking-tight leading-none text-center">Aone Target</h1>
          <p className="text-white/80 text-[9px] font-bold tracking-widest mt-1 uppercase">Academic Excellence</p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="relative z-10 flex-1 px-5 pb-8 overflow-hidden">
        <div className="w-full h-full bg-white shadow-2xl rounded-[32px] border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {step === 'login' && renderLoginStep()}
            {step === 'otp' && renderOtpStep()}
            {step === 'signup' && renderSignupStep()}
            {step === 'profile' && renderProfileStep()}
            {step === 'forgot-password' && renderForgotStep()}
            {step === 'reset-otp' && renderResetOtpStep()}
            {step === 'new-password' && renderNewPasswordStep()}
            {step === 'signup-otp' && renderSignupOtpStep()}
          </div>
        </div>
      </div>
      <SelectionModal />
    </div>
  );
};

export default StudentLogin;
