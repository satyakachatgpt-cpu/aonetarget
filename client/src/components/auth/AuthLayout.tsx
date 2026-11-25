import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="w-full h-full max-w-md mx-auto flex flex-col relative overflow-hidden bg-white shadow-2xl">
      {/* Top Header Section with safe-area spacing */}
      <div 
        className="w-full bg-gradient-to-b from-[#1A237E] to-[#283593] shrink-0 relative z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
      >
        <div className="px-4 pt-2 pb-5 flex items-center justify-between relative">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white active:scale-95 transition-all shadow-sm border border-white/20 cursor-pointer shrink-0"
            aria-label="Back to Home"
            title="Back to Home"
          >
            <span className="material-symbols-rounded text-2xl">arrow_back</span>
          </button>

          {/* Centered Brand Header */}
          <div className="flex-1 flex flex-col items-center pr-10">
            <div className="flex items-center gap-2">
              <img 
                src="/attach-assist/alonelogo_1770810181717.jpg" 
                alt="Aone Target" 
                className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 shadow-md border border-white/30" 
              />
              <span className="text-lg font-black text-white tracking-tight drop-shadow-sm">Aone Target</span>
            </div>
            <span className="text-white/80 text-[8.5px] font-bold tracking-widest uppercase mt-0.5">
              Academic Excellence
            </span>
          </div>
        </div>
      </div>

      {/* Main Form Container - Edge to Edge without side gaps */}
      <div className="flex-1 w-full bg-white relative z-20 -mt-3 rounded-t-[24px] flex flex-col overflow-hidden shadow-lg">
        <div className="flex-1 overflow-y-auto relative flex flex-col hide-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
