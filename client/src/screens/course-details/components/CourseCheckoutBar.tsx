import React from 'react';
import { Course } from '../../../types';

interface CourseCheckoutBarProps {
  course: Course;
  isPaidCourse: boolean;
  isEnrolled: boolean;
  enrollmentStatus: string;
  enrolling: boolean;
  processing?: boolean;
  payableAmount?: number;
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
  processing,
  payableAmount,
  progressPercent,
  completedVideosCount,
  totalVideos,
  onBuyNow,
  onEnroll,
  onStartLearning,
}) => {
  const price = payableAmount !== undefined ? payableAmount : Number(course?.price || 0);
  const mrp = Number(course?.mrp || 0);
  const hasDiscount = mrp > price && price > 0;

  return (
    <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-3 pointer-events-none">
      <div className="pointer-events-auto relative w-full rounded-[28px] bg-white/95 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/40 via-white/95 to-white backdrop-blur-2xl border-2 border-white/90 shadow-[0_14px_38px_rgba(147,51,234,0.12),0_4px_16px_rgba(0,0,0,0.06)] px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-2.5 transition-all duration-300">
        
        {enrollmentStatus === 'expired' ? (
          /* State 1: Expired Course */
          <>
            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-amber-600 shadow-[0_6px_16px_rgba(225,29,72,0.3)] flex items-center justify-center shrink-0 border border-white/35">
              <span className="material-symbols-rounded text-white text-2xl">autorenew</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-9 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section (Price & Status) */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-[11px] font-bold text-slate-500 leading-tight mb-0.5">Subscription Ended</span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight font-outfit leading-none shrink-0">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                <span className="bg-rose-50 text-rose-600 border border-rose-100/80 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap">
                  ⚠️ Expired
                </span>
              </div>
            </div>

            {/* Right Action Button Container with pinned badge */}
            <div className="relative shrink-0">
              <div className="absolute -top-3 right-3 bg-gradient-to-r from-rose-400 to-amber-400 text-rose-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/60 whitespace-nowrap">
                <span>⚡</span>
                <span>Reactivate</span>
              </div>
              <button
                onClick={onBuyNow}
                className="px-4.5 sm:px-5 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-[0_8px_25px_rgba(225,29,72,0.45)] hover:shadow-[0_10px_30px_rgba(225,29,72,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0"
              >
                <span className="material-symbols-rounded text-lg text-white">autorenew</span>
                <span className="text-sm font-black tracking-tight text-white whitespace-nowrap">Renew</span>
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                  <span className="material-symbols-rounded text-white text-sm">arrow_forward</span>
                </div>
              </button>
            </div>
          </>
        ) : isEnrolled ? (
          /* State 2: Enrolled & Active */
          <>
            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#1A237E] via-[#283593] to-[#3949AB] shadow-[0_6px_16px_rgba(26,35,126,0.3)] flex items-center justify-center shrink-0 border border-white/35">
              <span className="material-symbols-rounded text-white text-2xl">play_arrow</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-9 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-[11px] font-bold text-slate-500 leading-tight mb-0.5">Enrolled & Active</span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight font-outfit leading-none shrink-0">
                  {progressPercent}%
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap">
                  {completedVideosCount}/{totalVideos} Done
                </span>
              </div>
            </div>

            {/* Right Action Button Container with pinned badge */}
            <div className="relative shrink-0">
              <div className="absolute -top-3 right-3 bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/60 whitespace-nowrap">
                <span>📚</span>
                <span>Active Student</span>
              </div>
              <button
                onClick={onStartLearning}
                className="px-4.5 sm:px-5 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-[#1A237E] via-[#283593] to-[#3949AB] shadow-[0_8px_25px_rgba(26,35,126,0.45)] hover:shadow-[0_10px_30px_rgba(26,35,126,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0"
              >
                <span className="material-symbols-rounded text-lg text-white">play_arrow</span>
                <span className="text-sm font-black tracking-tight text-white whitespace-nowrap">Resume</span>
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                  <span className="material-symbols-rounded text-white text-base">arrow_forward</span>
                </div>
              </button>
            </div>
          </>
        ) : isPaidCourse ? (
          /* State 3: Unenrolled Paid Course (EXACT MOCKUP DESIGN) */
          <>
            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#D946EF] shadow-[0_6px_16px_rgba(124,58,237,0.3)] flex items-center justify-center shrink-0 border border-white/35">
              <span className="material-symbols-rounded text-white text-2xl">shopping_bag</span>
            </div>

            {/* Subtle Vertical Divider */}
            <div className="h-9 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section (Price & Limited Offer) */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              {/* Upper row: Total Price label + Limited Offer badge */}
              <div className="flex items-center gap-1.5 mb-1 flex-nowrap">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight">Total Price</span>
                <span className="bg-[#FEF2F2] text-[#EF4444] border border-[#FEE2E2] px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap">
                  <span className="text-[10px]">🔥</span>
                  <span>{(course?.settings as any)?.offerTag || (course as any)?.offerTag || 'Limited Offer'}</span>
                </span>
              </div>
              {/* Lower row: Huge bold price + strikethrough MRP */}
              <div className="flex items-baseline gap-1.5 sm:gap-2 flex-nowrap">
                <span className="text-2xl sm:text-[28px] font-[900] text-slate-900 tracking-tight font-outfit leading-none shrink-0">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through shrink-0">
                    ₹{mrp.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Right Section (Buy Now Button + Pinned Crown Badge) */}
            <div className="relative shrink-0">
              <div className="absolute -top-3 right-3 bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#EAB308] text-[#713F12] font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/60 whitespace-nowrap">
                <span className="text-[10px]">👑</span>
                <span>{(course?.settings as any)?.customBadge || (course as any)?.customBadge || 'Best Deal'}</span>
              </div>
              <button
                disabled={processing || enrolling}
                onClick={onBuyNow}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] via-[#A855F7] to-[#EC4899] shadow-[0_8px_25px_rgba(168,85,247,0.45)] hover:shadow-[0_10px_30px_rgba(168,85,247,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0 disabled:opacity-60"
              >
                {processing ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-black text-white">Processing...</span>
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-lg text-white">shopping_cart</span>
                    <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">Buy Now</span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                      <span className="material-symbols-rounded text-white text-sm sm:text-base">arrow_forward</span>
                    </div>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* State 4: Unenrolled Free Course */
          <>
            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_6px_16px_rgba(16,185,129,0.3)] flex items-center justify-center shrink-0 border border-white/35">
              <span className="material-symbols-rounded text-white text-2xl">school</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-9 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight mb-0.5">Total Price</span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="text-2xl sm:text-3xl font-[900] text-emerald-600 tracking-tight font-outfit leading-none shrink-0">
                  FREE
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0 whitespace-nowrap">
                  <span>✨</span>
                  <span>Free Batch</span>
                </span>
              </div>
            </div>

            {/* Right Action Button Container with pinned badge */}
            <div className="relative shrink-0">
              <div className="absolute -top-3 right-3 bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/60 whitespace-nowrap">
                <span>🎉</span>
                <span>100% Free</span>
              </div>
              <button
                onClick={onEnroll}
                disabled={enrolling}
                className="px-4.5 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_8px_25px_rgba(16,185,129,0.45)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0 disabled:opacity-60"
              >
                <span className="material-symbols-rounded text-lg text-white">school</span>
                <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">
                  {enrolling ? 'Enrolling...' : 'Enroll Free'}
                </span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                  <span className="material-symbols-rounded text-white text-sm sm:text-base">arrow_forward</span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCheckoutBar;
