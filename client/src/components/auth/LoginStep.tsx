import React from 'react';
import { AuthSubmitButton } from './AuthSubmitButton';

interface LoginStepProps {
  loading: boolean;
  passwordFormData: { loginId: string; password: string };
  setPasswordFormData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  handlePasswordLogin: (e: React.FormEvent) => void;
  onSignupClick: () => void;
  onForgotPasswordClick: () => void;
}

export const LoginStep: React.FC<LoginStepProps> = ({
  loading,
  passwordFormData,
  setPasswordFormData,
  showPassword,
  setShowPassword,
  handlePasswordLogin,
  onSignupClick,
  onForgotPasswordClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-start w-full">
      <div className="w-full p-6 sm:p-8 pb-10 sm:pb-8">
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
                onClick={onForgotPasswordClick}
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

          <AuthSubmitButton
            loading={loading}
            loadingText="Logging in..."
            className="w-full h-14 bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white rounded-xl font-black text-sm shadow-xl shadow-blue-900/20 hover:shadow-2xl"
          >
            Login Now
          </AuthSubmitButton>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSignupClick}
            className="text-[#1A237E] font-black hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};
