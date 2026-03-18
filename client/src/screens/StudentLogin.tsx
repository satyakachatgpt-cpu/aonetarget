import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { indiaStateDistrictMap } from '../src/utils/indiaStates';
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
  target: z.string().optional().or(z.literal('')),
  referralCode: z.string().optional().or(z.literal('')),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

interface StudentLoginProps {
  setAuth: (auth: any) => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ setAuth }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'otp' | 'signup' | 'profile' | 'category' | 'subcategory'>('login');

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
    return (
      <div className="relative group flex-1">
        <label className="text-[10px] uppercase tracking-[0.15em] text-[#1A237E] font-black mb-2 block text-center opacity-70">{label}</label>
        <div className="relative h-36 overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
          {/* Enhanced Highlight Indicator */}
          <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 bg-[#1A237E]/5 border-y border-[#1A237E]/10 pointer-events-none z-10 mx-2 rounded-xl"></div>

          <div
            className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col items-center py-[62px]"
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              const index = Math.round(target.scrollTop / 44);
              const selectedValue = options[index]?.value || '';
              // if (selectedValue !== value) onChange(selectedValue);
            }}
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

          {/* Stronger Gradient Overlays for depth */}
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
          otp: otpValue
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

  const renderLoginStep = () => (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1A237E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-[#1A237E] text-2xl">phone_android</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Welcome Back!</h2>
          <p className="text-sm text-gray-500 mt-1">Login with OTP sent to your phone</p>
        </div>

        <form onSubmit={handleLoginSubmit(sendLoginOtp)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Phone Number</label>
            <div className="flex">
              <div className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium">
                +91
              </div>
              <input
                type="tel"
                {...loginReg('phone')}
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
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
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => setStep('signup')}
            className="text-[#1A237E] font-bold hover:underline"
          >
            Sign Up
          </button>
        </p>
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
              toast.error('You are already registered. Please login with OTP.');
              return;
            }

            setProfileValue('phone', data.phone);
            setStep('profile');
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
                {...loginReg('phone')}
                placeholder="Enter 10-digit number"
                maxLength={10}
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
        try {
          const response = await fetch('/api/students/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const resData = await response.json();
          if (!response.ok) throw new Error(resData.error || 'Registration failed');
          toast.success('Registration successful! Please login with OTP.');
          setStep('login');
        } catch (err: any) {
          toast.error(err.message);
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
                {...profileReg('whatsAppNumber')}
                placeholder="10-digit number"
                maxLength={10}
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
                {...profileReg('alternateNumber')}
                placeholder="10-digit number"
                maxLength={10}
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
          <img src="/attached_assets/alonelogo_1770810181717.jpg" alt="Aone Target" className="w-[64px] h-[64px] object-contain rounded-2xl shadow-lg border-4 border-white/20 bg-white mb-2" />
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
          </div>
        </div>
      </div>
      <SelectionModal />
    </div>
  );
};

export default StudentLogin;
