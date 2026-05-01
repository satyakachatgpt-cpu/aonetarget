import React from 'react';
import { AuthBackButton } from './AuthBackButton';
import { AuthSubmitButton } from './AuthSubmitButton';

interface ForgotStepProps {
  loading: boolean;
  resetPhone: string;
  setResetPhone: (val: string) => void;
  handleForgotStep1: (e: React.FormEvent) => void;
  onBackToLogin: () => void;
}

export const ForgotStep: React.FC<ForgotStepProps> = ({
  loading,
  resetPhone,
  setResetPhone,
  handleForgotStep1,
  onBackToLogin,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
      <div className="w-full p-6 sm:p-8">
        <AuthBackButton 
          onClick={onBackToLogin} 
          label="Back to Login" 
          className="mb-6 font-bold" 
        />
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
          <AuthSubmitButton
            loading={loading}
            loadingText="Sending OTP..."
            className="w-full h-14 bg-[#111] text-white rounded-2xl font-black text-sm shadow-xl shadow-black/10 hover:bg-black"
          >
            Send OTP
          </AuthSubmitButton>
        </form>
      </div>
    </div>
  );
};
