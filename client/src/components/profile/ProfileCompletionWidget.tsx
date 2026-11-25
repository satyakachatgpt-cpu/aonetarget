import React from 'react';

export interface ProfileCompletionResult {
  percent: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
}

export const getProfileCompletion = (student: any): ProfileCompletionResult => {
  if (!student) {
    return { percent: 0, completedCount: 0, totalCount: 10, missingFields: [] };
  }

  const fieldsToCheck = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { 
      key: 'higherEducation', 
      label: 'Higher Education',
      check: (s: any) => s.higherEducation || s.highQualification
    },
    { key: 'class', label: 'Class / Target' },
    { 
      key: 'address', 
      label: 'Address',
      check: (s: any) => s.address || s.admission?.fullAddress
    },
    { key: 'state', label: 'State' },
    { 
      key: 'district', 
      label: 'District',
      check: (s: any) => s.district || s.city
    },
  ];

  const missingFields: string[] = [];
  let completedCount = 0;

  fieldsToCheck.forEach((field) => {
    let hasValue = false;
    if (field.check) {
      hasValue = Boolean(field.check(student) && String(field.check(student)).trim().length > 0);
    } else {
      const val = student[field.key];
      hasValue = Boolean(val && String(val).trim().length > 0);
    }

    if (hasValue) {
      completedCount++;
    } else {
      missingFields.push(field.label);
    }
  });

  const totalCount = fieldsToCheck.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return {
    percent,
    completedCount,
    totalCount,
    missingFields
  };
};

interface ProfileCompletionCardProps {
  student: any;
  onEditClick: () => void;
  className?: string;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
  student,
  onEditClick,
  className = ''
}) => {
  const { percent, missingFields } = getProfileCompletion(student);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const isComplete = percent === 100;

  return (
    <div
      className={`bg-white rounded-3xl p-5 shadow-sm border border-indigo-100/80 transition-all ${className}`}
    >
      <div className="flex items-center gap-4">
        {/* SVG Circular Progress Ring */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 76 76">
            {/* Background Track */}
            <circle
              cx="38"
              cy="38"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-indigo-50"
            />
            {/* Animated Progress Circle */}
            <circle
              cx="38"
              cy="38"
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1A237E" />
                <stop offset="100%" stopColor="#5C59E8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Percentage */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-slate-800 leading-none">
              {percent}%
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
              Done
            </span>
          </div>
        </div>

        {/* Text & Action */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-slate-900 tracking-tight">
              Profile Completion
            </h4>
            {isComplete ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                100% Completed
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                In Progress
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">
            {isComplete
              ? 'Awesome! Your profile has all verified student details.'
              : `Complete remaining details (${missingFields.slice(0, 2).join(', ')}${
                  missingFields.length > 2 ? '...' : ''
                }) to reach 100%.`}
          </p>

          {!isComplete && (
            <button
              type="button"
              onClick={onEditClick}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-black text-[#1A237E] hover:text-indigo-600 active:scale-95 transition-all cursor-pointer"
            >
              <span>Fill Profile Details</span>
              <span className="material-symbols-rounded text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface AvatarProgressRingProps {
  student: any;
  size?: number;
  children: React.ReactNode;
}

export const AvatarProgressRing: React.FC<AvatarProgressRingProps> = ({
  student,
  size = 96,
  children
}) => {
  const { percent } = getProfileCompletion(student);
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90 transform pointer-events-none"
        style={{ width: size, height: size }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4ADE80" // Vibrant emerald on dark background
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Content / Avatar */}
      <div className="relative z-10 flex items-center justify-center">
        {children}
      </div>
      {/* Percentage Pill Badge */}
      <span className="absolute -bottom-1 bg-white text-[#1A237E] text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-indigo-100 z-20">
        {percent}%
      </span>
    </div>
  );
};
