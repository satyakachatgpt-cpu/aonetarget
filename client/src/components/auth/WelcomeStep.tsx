import React from 'react';

interface WelcomeStepProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onBack?: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onLoginClick,
  onSignupClick,
  onBack,
}) => {
  return (
    <div className="flex flex-col h-full w-full min-h-[520px] justify-between p-6 sm:p-8 bg-gradient-to-b from-indigo-50/40 via-white to-white">
      {/* Top Bar with optional Back Button */}
      <div className="flex items-center justify-between w-full">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition-all cursor-pointer"
            aria-label="Back"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-[11px] font-bold text-[#1A237E]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Admissions Open 2026</span>
        </div>
      </div>

      {/* Main Branding & Hero Section */}
      <div className="flex flex-col items-center text-center my-auto py-4">
        {/* Logo with Glow */}
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl" />
          <img
            src="/attach-assist/alonelogo_1770810181717.jpg"
            alt="Aone Target Institute"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-3xl bg-white p-2 shadow-xl border border-indigo-100 relative z-10"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Aone Target
        </h1>
        <p className="text-[11px] sm:text-xs font-black tracking-widest text-indigo-700 uppercase mt-0.5">
          Academic Excellence
        </p>

        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mt-3 leading-relaxed">
          Your premier coaching destination for NEET, IIT-JEE & Medical Entrance success.
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <span className="material-symbols-rounded text-sm text-indigo-600">verified</span>
            Expert Faculty
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <span className="material-symbols-rounded text-sm text-indigo-600">quiz</span>
            Mock Tests
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-semibold">
            <span className="material-symbols-rounded text-sm text-indigo-600">live_tv</span>
            Live Classes
          </span>
        </div>
      </div>

      {/* Action Buttons: Login & Sign Up */}
      <div className="space-y-3 w-full pt-4">
        {/* Primary Login Button */}
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full h-14 bg-gradient-to-r from-[#1A237E] via-[#283593] to-[#303F9F] hover:opacity-95 active:scale-[0.99] text-white rounded-2xl font-black text-sm tracking-wide shadow-xl shadow-indigo-900/25 flex items-center justify-between px-6 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-xl">lock_open</span>
            <span>Login to Account</span>
          </div>
          <span className="material-symbols-rounded text-xl">arrow_forward</span>
        </button>

        {/* Secondary Sign Up Button */}
        <button
          type="button"
          onClick={onSignupClick}
          className="w-full h-14 bg-white hover:bg-indigo-50/60 active:scale-[0.99] text-[#1A237E] border-2 border-[#1A237E] rounded-2xl font-black text-sm tracking-wide flex items-center justify-between px-6 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-xl">person_add</span>
            <span>Create New Account</span>
          </div>
          <span className="material-symbols-rounded text-xl">arrow_forward</span>
        </button>

        {/* Footer Security Note */}
        <p className="text-[11px] text-slate-400 text-center font-medium pt-2">
          Secure & Encrypted Student Portal • Aone Target
        </p>
      </div>
    </div>
  );
};
