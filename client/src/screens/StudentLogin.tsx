import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../utils/indiaStates';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { API_BASE_URL } from '../services/baseService';
import { SelectionModal } from '../components/auth/SelectionModal';
import { ScrollPicker } from '../components/auth/ScrollPicker';
import { OtpInputGrid } from '../components/auth/OtpInputGrid';
import { AuthSubmitButton } from '../components/auth/AuthSubmitButton';
import { AuthHeader } from '../components/auth/AuthHeader';
import { OtpHelperText } from '../components/auth/OtpHelperText';
import { AuthBackButton } from '../components/auth/AuthBackButton';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginStep } from '../components/auth/LoginStep';
import { ForgotStep } from '../components/auth/ForgotStep';
import { NewPasswordStep } from '../components/auth/NewPasswordStep';

const phoneSchema = z.object({
  phone: z.string().length(10, 'Enter a valid 10-digit phone number').regex(/^\d+$/, 'Digits only'),
});

const profileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phone: z.string().length(10, 'Enter a valid 10-digit phone number').regex(/^\d+$/, 'Digits only'),
  address: z.string().optional().or(z.literal('')),
  state: z.string().min(1, 'Please select a state'),
  district: z.string().min(1, 'Please select a district'),
  gender: z.string().optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  class: z.string().min(1, 'Please select a class'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm your password'),
  target: z.string().optional().or(z.literal('')),
  referralCode: z.string().optional().or(z.literal('')),
  higherEducation: z.string().optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

interface StudentLoginProps {
  setAuth: (student: any, accessToken?: string, deviceId?: string, refreshToken?: string) => void;
  onSuccess?: () => void;
}

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Phone';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Windows/i.test(ua)) return 'Windows Laptop/PC';
  if (/Macintosh/i.test(ua)) return 'MacBook/Desktop';
  return 'Browser Device';
};

const getDeviceId = () => {
  let deviceId = localStorage.getItem('studentDeviceId');
  if (!deviceId) {
    if (window.crypto && window.crypto.randomUUID) {
      deviceId = window.crypto.randomUUID();
    } else {
      deviceId = 'stu_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem('studentDeviceId', deviceId);
  }
  return deviceId;
};


const StudentLogin: React.FC<StudentLoginProps> = ({ setAuth, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // REDIRECT MEMORY: sessionStorage fallback so state survives page reloads during auth flow
  const peekPostLoginRedirect = () => {
    const fromState = (location.state as any)?.from;
    const fromSession = sessionStorage.getItem('postLoginRedirect');
    const redirect = fromState || fromSession;

    if (
      redirect &&
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('/student-login')
    ) {
      return redirect;
    }

    return null;
  };

  const getPostLoginRedirect = () => {
    const redirect = peekPostLoginRedirect();

    if (redirect) {
      sessionStorage.removeItem('postLoginRedirect');
      return redirect;
    }

    sessionStorage.removeItem('postLoginRedirect');
    return null;
  };

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
      gender: '',
      dob: '',
      class: '',
      higherEducation: '',
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
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('pendingReferralCode', refCode);
    }
  }, []);

  useEffect(() => {
    // Auto-fill referral code from localStorage if on profile step
    if (step === 'profile') {
      const storedRef = localStorage.getItem('pendingReferralCode');
      if (storedRef) {
        setProfileValue('referralCode', storedRef);
      }
    }
  }, [step, setProfileValue]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
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

  const [selectionModal, setSelectionModal] = useState<{ isOpen: boolean, type: 'state' | 'district' | 'class' | 'higherEducation' | null }>({ isOpen: false, type: null });
  const [searchQuery, setSearchQuery] = useState('');
  
  // New States for Password & Forgot Password
  const [passwordFormData, setPasswordFormData] = useState({ loginId: '', password: '' });
  const [resetPhone, setResetPhone] = useState('');
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirm: '' });

  const openSelection = (type: 'state' | 'district' | 'class' | 'higherEducation') => {
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
    } else if (selectionModal.type === 'class') {
      setProfileValue('class', value);
    } else if (selectionModal.type === 'higherEducation') {
      setProfileValue('higherEducation', value);
    }
    setSelectionModal({ isOpen: false, type: null });
  };

// Modal and ScrollPicker moved outside to prevent remount issues

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      const formattedDate = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      setProfileValue('dob', formattedDate);
    }
  }, [dobDay, dobMonth, dobYear, setProfileValue]);

// ScrollPicker moved outside to prevent remount issues

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    const isAuth = localStorage.getItem('isStudentAuthenticated') === 'true';
    const pendingRedirect = peekPostLoginRedirect();

    if (isAuth && pendingRedirect && step !== 'otp' && step !== 'profile') {
      navigate(pendingRedirect, { replace: true });
      return;
    }

    if (isAuth && !pendingRedirect && step !== 'otp' && step !== 'profile') {
      navigate('/', { replace: true });
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
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.phone, purpose: 'login' })
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
      toast.success('OTP sent successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndLogin = async () => {
    if (loading) return;
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          otp: otpValue,
          deviceId: getDeviceId(),
          deviceName: navigator.userAgent,
          deviceType: getDeviceType()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'DEVICE_APPROVAL_REQUIRED') {
          toast.error(data.message || 'New device approval pending. Please contact admin.', { duration: 6000 });
          return;
        }
        throw new Error(data.error || 'OTP verification failed');
      }

      setAuth(data.student, data.accessToken, data.deviceId, data.refreshToken);
      toast.success('Login successful!');
      const redirect = getPostLoginRedirect() || '/student-dashboard';
      navigate(redirect, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    if (resendTimer > 0) return;
    if (currentPhone && currentPhone.length === 10) {
      await sendLoginOtp({ phone: currentPhone });
    }
  };

  const resendSignupOtp = async () => {
    if (resendTimer > 0 || loading) return;
    const phone = profileWatch('phone');
    if (phone && phone.length === 10) {
      setLoading(true);
      try {
        const otpRes = await fetch(`${API_BASE_URL}/students/signup/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const otpData = await otpRes.json();
        if (otpRes.ok) {
          toast.success('Registration OTP resent!');
          setResendTimer(60);
          setOtp(['', '', '', '', '', '']);
        } else {
          toast.error(otpData.error || 'Failed to resend OTP');
        }
      } catch (err: any) {
        toast.error('Connection error');
      } finally {
        setLoading(false);
      }
    }
  };

  const resendResetOtp = async () => {
    if (resendTimer > 0) return;
    if (resetPhone && resetPhone.length === 10) {
      await handleForgotStep1({ preventDefault: () => {} } as any);
    }
  };



  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!passwordFormData.loginId || !passwordFormData.password) {
      toast.error('Please enter both Login ID and Password');
      return;
    }

    try {
      setLoading(true);
      const loginUrl = `${API_BASE_URL}/students/login-password`;
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...passwordFormData, 
          deviceId: getDeviceId(),
          deviceName: navigator.userAgent,
          deviceType: getDeviceType()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Login successful!');
        setAuth(data.student, data.accessToken, data.deviceId, data.refreshToken);
        if (onSuccess) onSuccess();
        const redirect = getPostLoginRedirect() || '/student-dashboard';
        navigate(redirect, { replace: true });
      } else {
        if (data.code === 'DEVICE_APPROVAL_REQUIRED') {
          toast.error(data.message || 'New device approval pending. Please contact admin.', { duration: 6000 });
          return;
        }
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
    if (loading) return;
    if (!resetPhone || resetPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/students/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: resetPhone })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Reset OTP sent!');
        setStep('reset-otp');
        setOtp(['', '', '', '', '', '']);
        setResendTimer(30);
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyResetOtp = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const otpStr = otp.join('');
      const response = await fetch(`${API_BASE_URL}/students/forgot-password/verify-otp`, {
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
      const response = await fetch(`${API_BASE_URL}/students/reset-password`, {
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
      const response = await fetch(`${API_BASE_URL}/students/signup/verify-otp`, {
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
    <LoginStep
      loading={loading}
      passwordFormData={passwordFormData}
      setPasswordFormData={setPasswordFormData}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      handlePasswordLogin={handlePasswordLogin}
      onSignupClick={() => setStep('signup')}
      onForgotPasswordClick={() => setStep('forgot-password')}
    />
  );

  const renderForgotStep = () => (
    <ForgotStep
      loading={loading}
      resetPhone={resetPhone}
      setResetPhone={setResetPhone}
      handleForgotStep1={handleForgotStep1}
      onBackToLogin={() => setStep('login')}
    />
  );

  const renderResetOtpStep = () => (
    <div className="p-8">
      <AuthBackButton 
        onClick={() => setStep('forgot-password')} 
        label="Go Back" 
        variant="gray" 
        className="mb-8" 
      />
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-navy leading-none">Security Check</h2>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Enter OTP sent to +91 {resetPhone}</p>
      </div>
      <div className="space-y-8">
        <OtpInputGrid
          otp={otp}
          otpRefs={otpRefs}
          onChange={handleOtpChange}
          onKeyDown={handleOtpKeyDown}
          variant="brandBlue"
        />
        <OtpHelperText />

        <AuthSubmitButton
          onClick={verifyResetOtp}
          loading={loading}
          disabled={otp.join('').length !== 6}
          loadingText="Verifying..."
          type="button"
          className="w-full h-14 bg-brandBlue text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-brandBlue/20"
        >
          Verify OTP
        </AuthSubmitButton>

        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
              Didn't receive OTP? Resend in <span className="text-brandBlue">{resendTimer}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={resendResetOtp}
              disabled={loading}
              className="text-[12px] font-black text-brandBlue uppercase tracking-widest hover:underline disabled:opacity-50"
            >
              Resend OTP Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderNewPasswordStep = () => (
    <NewPasswordStep
      loading={loading}
      newPasswordData={newPasswordData}
      setNewPasswordData={setNewPasswordData}
      resetPasswordSubmit={resetPasswordSubmit}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
    />
  );

  const renderSignupOtpStep = () => (
    <div className="p-8">
      <AuthBackButton 
        onClick={() => setStep('signup')} 
        label="Go Back" 
        variant="gray" 
        className="mb-8" 
      />
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-navy leading-none">OTP Verification</h2>
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sent to +91 {currentPhone}</p>
      </div>
      <div className="space-y-8">
        <OtpInputGrid
          otp={otp}
          otpRefs={otpRefs}
          onChange={handleOtpChange}
          onKeyDown={handleOtpKeyDown}
        />
        <OtpHelperText />

        <AuthSubmitButton
          onClick={verifySignupOtp}
          loading={loading}
          disabled={otp.join('').length !== 6}
          loadingText="Verifying..."
          type="button"
          className="w-full h-14 bg-[#1A237E] text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl"
        >
          Verify OTP
        </AuthSubmitButton>

        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
              Didn't receive OTP? Resend in <span className="text-[#1A237E]">{resendTimer}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={resendSignupOtp}
              disabled={loading}
              className="text-[12px] font-black text-[#1A237E] uppercase tracking-widest hover:underline disabled:opacity-50"
            >
              Resend OTP Now
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderOtpStep = () => (
    <div className="flex flex-col items-center justify-start w-full">
      <div className="w-full p-6 sm:p-8 pb-10 sm:pb-8">
        <AuthBackButton 
          onClick={() => setStep('login')} 
          label="Back" 
          className="mb-4 font-semibold hover:text-[#303F9F]" 
        />

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

        <div className="space-y-8">
          <OtpInputGrid
            otp={otp}
            otpRefs={otpRefs}
            onChange={handleOtpChange}
            onKeyDown={handleOtpKeyDown}
          />
          <OtpHelperText />

          <AuthSubmitButton
            type="button"
            onClick={verifyOtpAndLogin}
            loading={loading}
            disabled={otp.join('').length !== 6}
            loadingText="Verifying OTP..."
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl"
          >
            Verify & Login
          </AuthSubmitButton>

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                Didn't receive OTP? Resend in <span className="text-[#1A237E] font-black">{resendTimer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={resendLoginOtp}
                disabled={loading}
                className="text-[12px] font-black text-[#1A237E] uppercase tracking-widest hover:underline disabled:opacity-50"
              >
                Resend OTP Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSignupStep = () => (
    <div className="flex flex-col items-center justify-start w-full">
      <div className="w-full p-6 sm:p-8 pb-10 sm:pb-8">
        <AuthBackButton 
          onClick={() => setStep('login')} 
          label="Back" 
          className="mb-4 font-semibold hover:text-[#303F9F]" 
        />

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[#1A237E] text-2xl">person_add</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Create Account</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your phone number to get started</p>
        </div>

        <form onSubmit={handleLoginSubmit(async (data) => {
          if (loading) return;
          setLoading(true);
          try {
            // Directly send registration OTP (backend already checks if user exists)
            const otpRes = await fetch('/api/students/signup/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: data.phone })
            });

            const otpData = await otpRes.json();
            if (otpRes.ok) {
              toast.success('Registration OTP sent!');
              setProfileValue('phone', data.phone);
              setStep('signup-otp');
              setResendTimer(60);
              setOtp(['', '', '', '', '', '']);
            } else {
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

          <AuthSubmitButton
            loading={loading}
            loadingText="Sending OTP..."
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl h-14"
          >
            Continue
          </AuthSubmitButton>

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
          <AuthBackButton 
            onClick={() => setStep('signup')} 
            variant="circle" 
          />
          <div>
            <h3 className="text-base font-black text-navy leading-none">Complete Profile</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Final Step</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit(async (data) => {
        setLoading(true);
        try {
          const response = await fetch('/api/students/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const resData = await response.json();
          
          if (!response.ok) throw new Error(resData.error || 'Registration failed');
          
          toast.success('Registration successful! Please login.');
          localStorage.removeItem('pendingReferralCode');
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
            <label className="text-xs font-semibold text-gray-600 block mb-1">Email *</label>
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
            <label className="text-xs font-semibold text-gray-600 block mb-1">Target *</label>
            <button
              type="button"
              onClick={() => openSelection('class')}
              className={`w-full px-4 py-3.5 border rounded-xl flex items-center justify-between text-sm transition-all ${profileErrors.class ? 'border-red-500' : 'border-gray-200'
                } ${profileWatch('class') ? 'text-gray-800 font-bold' : 'text-gray-400 hover:border-gray-300'}`}
            >
              <span>{profileWatch('class') || 'Select Class'}</span>
              <span className="material-symbols-rounded text-gray-400">expand_more</span>
            </button>
            <input type="hidden" {...profileReg('class')} />
            {profileErrors.class && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{profileErrors.class.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Higher Education</label>
            <button
              type="button"
              onClick={() => openSelection('higherEducation')}
              className={`w-full px-4 py-3.5 border rounded-xl flex items-center justify-between text-sm transition-all ${
                profileWatch('higherEducation') ? 'text-gray-800 font-bold' : 'text-gray-400 hover:border-gray-300'
              }`}
            >
              <span>{profileWatch('higherEducation') || 'Select Qualification'}</span>
              <span className="material-symbols-rounded text-gray-400">expand_more</span>
            </button>
            <input type="hidden" {...profileReg('higherEducation')} />
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
          <AuthSubmitButton
            loading={loading}
            className="w-full bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white py-4 rounded-xl font-black text-sm shadow-lg hover:shadow-xl"
          >
            Save & Continue
          </AuthSubmitButton>
        </div>
      </form>
    </div>
  );

  return (
    <>
      <AuthLayout>
        {step === 'login' && renderLoginStep()}
        {step === 'otp' && renderOtpStep()}
        {step === 'signup' && renderSignupStep()}
        {step === 'profile' && renderProfileStep()}
        {step === 'forgot-password' && renderForgotStep()}
        {step === 'reset-otp' && renderResetOtpStep()}
        {step === 'new-password' && renderNewPasswordStep()}
        {step === 'signup-otp' && renderSignupOtpStep()}
      </AuthLayout>
      <SelectionModal
        isOpen={selectionModal.isOpen}
        type={selectionModal.type}
        onClose={() => setSelectionModal({ isOpen: false, type: null })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        options={selectionModal.type === 'state'
          ? Object.keys(indiaStateDistrictMap).sort()
          : selectionModal.type === 'district'
            ? availableDistricts.sort()
            : selectionModal.type === 'higherEducation'
              ? ['10th Pass', '12th Pass', 'Graduate', 'Post Graduate', 'Other']
              : categories.length > 0 ? categories.map(c => c.title) : ['9th', '10th', '11th', '12th', 'Neet','iit-Jee','Nursing-CET', 'Dropper']
        }
        selectedValue={selectionModal.type === 'state' ? selectedState : selectionModal.type === 'district' ? profileWatch('district') : selectionModal.type === 'higherEducation' ? profileWatch('higherEducation') : profileWatch('class')}
        onSelect={handleSelection}
      />
    </>
  );
};

export default StudentLogin;
