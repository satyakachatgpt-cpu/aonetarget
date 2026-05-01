import React from 'react';

interface AuthBackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'navy' | 'gray' | 'circle';
  className?: string;
}

export const AuthBackButton: React.FC<AuthBackButtonProps> = ({
  onClick,
  label,
  variant = 'navy',
  className = ""
}) => {
  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-[#1A237E] hover:bg-gray-100 transition-colors ${className}`}
      >
        <span className="material-symbols-rounded text-xl">arrow_back</span>
      </button>
    );
  }

  const baseClass = variant === 'navy' 
    ? 'text-[#1A237E] text-sm' 
    : 'text-gray-400 font-bold text-[12px] uppercase tracking-widest';

  const iconClass = variant === 'navy' ? 'text-lg' : 'text-[18px]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 group ${baseClass} ${className}`}
    >
      <span className={`material-symbols-rounded ${iconClass} transition-transform group-hover:-translate-x-1`}>
        arrow_back
      </span>
      {label && <span>{label}</span>}
    </button>
  );
};
