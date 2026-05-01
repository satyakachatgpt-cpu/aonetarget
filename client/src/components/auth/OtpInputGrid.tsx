import React from 'react';

interface OtpInputGridProps {
  otp: string[];
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent) => void;
  variant?: 'navy' | 'brandBlue';
}

export const OtpInputGrid: React.FC<OtpInputGridProps> = ({
  otp,
  otpRefs,
  onChange,
  onKeyDown,
  variant = 'navy'
}) => {
  const activeColorClass = variant === 'brandBlue' ? 'border-brandBlue bg-brandBlue/5 text-brandBlue shadow-[0_4px_12px_rgba(58,119,255,0.1)]' : 'border-[#1A237E] bg-[#1A237E]/5 text-[#1A237E] shadow-[0_4px_12px_rgba(26,35,126,0.1)]';
  const focusColorClass = variant === 'brandBlue' ? 'focus:border-brandBlue focus:bg-white focus:shadow-[0_0_20px_rgba(58,119,255,0.15)]' : 'focus:border-[#1A237E] focus:bg-white focus:shadow-[0_0_20px_rgba(26,35,126,0.15)]';

  return (
    <div className="flex justify-center gap-1.5 sm:gap-3">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { otpRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => onChange(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e)}
          className={`w-10 sm:w-12 h-14 sm:h-16 text-center text-xl sm:text-2xl font-black border-2 rounded-xl sm:rounded-2xl focus:outline-none transition-all ${
            digit 
              ? activeColorClass 
              : `border-gray-200 bg-gray-50 ${focusColorClass} text-gray-400`
          }`}
        />
      ))}
    </div>
  );
};
