import React from 'react';

interface AuthSubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export const AuthSubmitButton: React.FC<AuthSubmitButtonProps> = ({
  loading,
  disabled,
  onClick,
  type = 'submit',
  children,
  loadingText,
  className = ""
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>{loadingText || children}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
