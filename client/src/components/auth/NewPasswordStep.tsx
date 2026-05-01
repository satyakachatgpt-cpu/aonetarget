import React from 'react';
import { AuthSubmitButton } from './AuthSubmitButton';

interface NewPasswordStepProps {
  loading: boolean;
  newPasswordData: { password: string; confirm: string };
  setNewPasswordData: (data: any) => void;
  resetPasswordSubmit: (e: React.FormEvent) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
}

export const NewPasswordStep: React.FC<NewPasswordStepProps> = ({
  loading,
  newPasswordData,
  setNewPasswordData,
  resetPasswordSubmit,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
}) => {
  return (
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
        <AuthSubmitButton
          loading={loading}
          loadingText="Saving..."
          className="w-full h-14 bg-brandBlue text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-brandBlue/20"
        >
          Reset Password
        </AuthSubmitButton>
      </form>
    </div>
  );
};
