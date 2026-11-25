import React from 'react';
import { Course } from '../../../types';

interface CourseCheckoutBarProps {
  course: Course;
  isPaidCourse: boolean;
  isEnrolled: boolean;
  enrollmentStatus: string;
  enrolling: boolean;
  progressPercent: number;
  completedVideosCount: number;
  totalVideos: number;
  onBuyNow: () => void;
  onEnroll: () => void;
  onStartLearning: () => void;
}

const CourseCheckoutBar: React.FC<CourseCheckoutBarProps> = ({
  course,
  isPaidCourse,
  isEnrolled,
  enrollmentStatus,
  enrolling,
  progressPercent,
  completedVideosCount,
  totalVideos,
  onBuyNow,
  onEnroll,
  onStartLearning,
}) => {
  const price = Number(course?.price || 0);
  const mrp = Number(course?.mrp || 0);
  const hasDiscount = mrp > price && price > 0;
  const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const testsCount = course?.tsCount || 0;

  return (
    <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-2 sm:px-3 pointer-events-none">
      <div className="pointer-events-auto relative w-full rounded-2xl sm:rounded-[22px] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_10px_35px_-4px_rgba(15,23,42,0.14),0_2px_8px_rgba(0,0,0,0.04)] px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 transition-all duration-300">
        {/* Micro gradient top border accent */}
        <div className="absolute inset-x-5 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent rounded-full" />

        {enrollmentStatus === 'expired' ? (
          /* State 1: Expired Course */
          <>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Access Expired
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-[26px] font-[900] text-slate-900 tracking-tight leading-none font-outfit">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                    ₹{mrp.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                <span className="material-symbols-rounded text-rose-500 text-xs shrink-0">history</span>
                <span className="truncate">Renew to reactivate full access</span>
              </div>
            </div>

            <button
              onClick={onBuyNow}
              className="group relative inline-flex items-center justify-center gap-2 px-4.5 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 shadow-[0_4px_18px_rgba(225,29,72,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.97] transition-all duration-200 cursor-pointer border border-white/20 shrink-0 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-180 transition-transform duration-500">
                <span className="material-symbols-rounded text-base text-rose-100">autorenew</span>
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-200">
                  Reactivate
                </span>
                <span className="text-sm sm:text-[15px] font-black tracking-wide flex items-center gap-1 text-white">
                  Renew Course
                  <span className="material-symbols-rounded text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </div>
            </button>
          </>
        ) : isEnrolled ? (
          /* State 2: Enrolled & Active */
          <>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="material-symbols-rounded text-xs text-emerald-600">verified</span>
                  Enrolled & Active
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight leading-none font-outfit">
                  {progressPercent}% Completed
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-0.5 truncate">
                <span className="material-symbols-rounded text-primary-600 text-xs shrink-0">play_circle</span>
                <span className="truncate">{completedVideosCount} of {totalVideos} lessons completed</span>
              </div>
            </div>

            <button
              onClick={onStartLearning}
              className="group relative inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-white bg-gradient-to-r from-[#1A237E] via-[#283593] to-[#3949AB] hover:from-[#151C65] hover:to-[#283593] shadow-[0_4px_18px_rgba(26,35,126,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-[0.97] transition-all duration-200 cursor-pointer border border-white/20 shrink-0 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-base text-white">play_arrow</span>
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-200">
                  Continue
                </span>
                <span className="text-sm sm:text-[15px] font-black tracking-wide flex items-center gap-1 text-white">
                  Start Learning
                  <span className="material-symbols-rounded text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </div>
            </button>
          </>
        ) : isPaidCourse ? (
          /* State 3: Unenrolled Paid Course */
          <>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {hasDiscount ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    {discountPercent}% OFF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="material-symbols-rounded text-xs text-indigo-600">verified</span>
                    Full Access
                  </span>
                )}
                {testsCount > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 truncate flex items-center gap-0.5">
                    • <span className="text-indigo-600 font-bold">+{testsCount} Tests</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-[26px] font-[900] text-slate-900 tracking-tight leading-none font-outfit">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                    ₹{mrp.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-0.5 truncate max-w-[170px] sm:max-w-[200px]">
                <span className="material-symbols-rounded text-emerald-600 text-xs shrink-0">check_circle</span>
                <span className="truncate">Instant Access • Full Syllabus</span>
              </div>
            </div>

            <button
              onClick={onBuyNow}
              className="group relative inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-600 shadow-[0_4px_18px_rgba(79,70,229,0.38),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_6px_24px_rgba(79,70,229,0.48)] active:scale-[0.97] transition-all duration-200 cursor-pointer border border-white/20 shrink-0 overflow-hidden"
            >
              {/* Dynamic light reflection sweep on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />

              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-base text-amber-300">bolt</span>
              </div>

              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-200">
                  Instant Access
                </span>
                <span className="text-sm sm:text-[15px] font-black tracking-wide flex items-center gap-1 text-white">
                  Buy Now
                  <span className="material-symbols-rounded text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </div>
            </button>
          </>
        ) : (
          /* State 4: Unenrolled Free Course */
          <>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  <span className="material-symbols-rounded text-xs text-emerald-600">card_giftcard</span>
                  100% Free
                </span>
                {testsCount > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 truncate flex items-center gap-0.5">
                    • <span className="text-indigo-600 font-bold">+{testsCount} Tests</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[26px] font-[900] text-emerald-600 tracking-tight leading-none font-outfit">
                  FREE
                </span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  No Fees
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-0.5 truncate">
                <span className="material-symbols-rounded text-emerald-600 text-xs shrink-0">check_circle</span>
                <span className="truncate">Instant Access • Free Study Material</span>
              </div>
            </div>

            <button
              onClick={onEnroll}
              disabled={enrolling}
              className="group relative inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 shadow-[0_4px_18px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_6px_24px_rgba(16,185,129,0.45)] active:scale-[0.97] transition-all duration-200 cursor-pointer border border-white/20 shrink-0 overflow-hidden disabled:opacity-60"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded text-base text-emerald-100">school</span>
              </div>

              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-200">
                  Free Batch
                </span>
                <span className="text-sm sm:text-[15px] font-black tracking-wide flex items-center gap-1 text-white">
                  {enrolling ? 'Enrolling...' : 'Enroll Free'}
                  <span className="material-symbols-rounded text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCheckoutBar;
