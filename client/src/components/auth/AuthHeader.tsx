import React from 'react';

export const AuthHeader: React.FC = () => {
  return (
    <div className="relative z-20 pt-6 sm:pt-10 px-5 flex flex-col items-center flex-shrink-0">
      <div className="mb-4 sm:mb-6 flex flex-col items-center">
        <img 
          src="/attach-assist/alonelogo_1770810181717.jpg" 
          alt="Aone Target" 
          className="w-[48px] h-[48px] sm:w-[64px] sm:h-[64px] object-contain rounded-2xl shadow-lg border-4 border-white/20 bg-white mb-2" 
        />
        <h1 className="text-[20px] font-black text-white drop-shadow-md tracking-tight leading-none text-center">Aone Target</h1>
        <p className="text-white/80 text-[9px] font-bold tracking-widest mt-1 uppercase">Academic Excellence</p>
      </div>
    </div>
  );
};
