import React, { useEffect, useRef } from 'react';

interface ScrollPickerProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  label: string;
}

export const ScrollPicker: React.FC<ScrollPickerProps> = ({ value, options, onChange, label }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(value);

  useEffect(() => {
    // Only scroll programmatically if the value changed from outside (prop update)
    if (value !== lastValueRef.current && scrollRef.current) {
      const index = options.findIndex(opt => opt.value === value);
      if (index !== -1) {
        scrollRef.current.scrollTo({
          top: index * 44,
          behavior: 'smooth'
        });
        lastValueRef.current = value;
      }
    }
  }, [value, options]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / 44);
    const newValue = options[index]?.value;
    
    if (newValue && newValue !== value) {
      lastValueRef.current = newValue;
      onChange(newValue);
    }
  };

  return (
    <div className="relative group flex-1">
      <label className="text-[10px] uppercase tracking-[0.15em] text-[#1A237E] font-black mb-2 block text-center opacity-70">{label}</label>
      <div className="relative h-36 overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Selection Indicator */}
        <div className="absolute top-1/2 left-0 right-0 h-11 -translate-y-1/2 bg-[#1A237E]/5 border-y border-[#1A237E]/10 pointer-events-none z-10 mx-2 rounded-xl"></div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar flex flex-col items-center py-[50px]"
        >
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`h-11 shrink-0 flex items-center justify-center snap-center px-4 w-full transition-all duration-300 cursor-pointer z-20 ${value === opt.value
                ? 'text-[#1A237E] font-black text-lg scale-110'
                : 'text-gray-400 text-sm font-bold opacity-60'
                }`}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10"></div>
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10"></div>
      </div>
    </div>
  );
};
