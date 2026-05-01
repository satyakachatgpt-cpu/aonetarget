import React from 'react';
import { AuthHeader } from './AuthHeader';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="max-w-md mx-auto h-screen bg-surface-100 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A237E]/5 to-[#303F9F]/10 pointer-events-none"></div>
      <div
        className="absolute top-0 w-full h-[32vh] min-h-[260px] bg-gradient-to-b from-[#1A237E] to-[#283593] shadow-lg z-0"
        style={{ borderBottomLeftRadius: '30% 10%', borderBottomRightRadius: '30% 10%' }}
      ></div>

      {/* Fixed Header Section */}
      <AuthHeader />

      {/* Main Form Container */}
      <div className="relative z-10 flex-1 px-5 pb-4 sm:pb-8 overflow-hidden">
        <div className="w-full h-full bg-white shadow-2xl rounded-[32px] border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto relative flex flex-col hide-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
