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

  return (
    <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-2 sm:px-3 pointer-events-none">
      <div className="pointer-events-auto relative w-full rounded-[28px] bg-white/90 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/50 via-white/90 to-white/95 backdrop-blur-2xl border-2 border-white/80 shadow-[0_15px_40px_rgba(147,51,234,0.12),0_4px_16px_rgba(0,0,0,0.06)] px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 transition-all duration-300">
        
        {enrollmentStatus === 'expired' ? (
          /* State 1: Expired Course */
          <>
            {/* Top-Right Floating Badge */}
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-rose-400 to-amber-400 text-rose-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/50">
              <span>⚡</span>
              <span>Reactivate</span>
            </div>

            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-rose-500 via-red-500 to-amber-600 shadow-[0_8px_20px_rgba(225,29,72,0.35)] flex items-center justify-center shrink-0 border border-white/30">
              <span className="material-symbols-rounded text-white text-2xl sm:text-3xl">autorenew</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section (Price & Status) */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight">Subscription Ended</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight font-outfit leading-none">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                <span className="bg-rose-50 text-rose-600 border border-rose-100/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-xs shrink-0">
                  ⚠️ Expired
                </span>
              </div>
            </div>

            {/* Right Action Button */}
            <button
              onClick={onBuyNow}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 shadow-[0_8px_25px_rgba(225,29,72,0.45)] hover:shadow-[0_10px_30px_rgba(225,29,72,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0"
            >
              <span className="material-symbols-rounded text-xl text-white">autorenew</span>
              <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">Renew</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                <span className="material-symbols-rounded text-white text-base">arrow_forward</span>
              </div>
            </button>
          </>
        ) : isEnrolled ? (
          /* State 2: Enrolled & Active */
          <>
            {/* Top-Right Floating Badge */}
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/50">
              <span>📚</span>
              <span>Active Student</span>
            </div>

            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-[#1A237E] via-[#283593] to-[#3949AB] shadow-[0_8px_20px_rgba(26,35,126,0.35)] flex items-center justify-center shrink-0 border border-white/30">
              <span className="material-symbols-rounded text-white text-2xl sm:text-3xl">play_arrow</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight">Enrolled & Active</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight font-outfit leading-none">
                  {progressPercent}%
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-xs shrink-0">
                  {completedVideosCount}/{totalVideos} Done
                </span>
              </div>
            </div>

            {/* Right Action Button */}
            <button
              onClick={onStartLearning}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-[#1A237E] via-[#283593] to-[#3949AB] shadow-[0_8px_25px_rgba(26,35,126,0.45)] hover:shadow-[0_10px_30px_rgba(26,35,126,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0"
            >
              <span className="material-symbols-rounded text-xl text-white">play_arrow</span>
              <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">Resume</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                <span className="material-symbols-rounded text-white text-base">arrow_forward</span>
              </div>
            </button>
          </>
        ) : isPaidCourse ? (
          /* State 3: Unenrolled Paid Course (EXACT MOCKUP DESIGN) */
          <>
            {/* Top-Right Floating Crown Badge */}
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-300 to-amber-400 text-amber-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-amber-200/50">
              <span>👑</span>
              <span>Best Deal</span>
            </div>

            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#D946EF] shadow-[0_8px_20px_rgba(124,58,237,0.35)] flex items-center justify-center shrink-0 border border-white/30">
              <span className="material-symbols-rounded text-white text-2xl sm:text-3xl">shopping_bag</span>
            </div>

            {/* Subtle Vertical Divider */}
            <div className="h-10 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section (Price & Limited Offer) */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-xs sm:text-[13px] font-bold text-slate-500 leading-tight">Total Price</span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight font-outfit leading-none">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                    ₹{mrp.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="bg-red-50 text-red-500 border border-red-100/80 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                  <span>🔥</span>
                  <span>Limited Offer</span>
                </span>
              </div>
            </div>

            {/* Right Section (Buy Now Button) */}
            <button
              onClick={onBuyNow}
              className="px-4.5 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] via-[#A855F7] to-[#EC4899] shadow-[0_8px_25px_rgba(168,85,247,0.45)] hover:shadow-[0_10px_30px_rgba(168,85,247,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0"
            >
              <span className="material-symbols-rounded text-lg sm:text-xl text-white">shopping_cart</span>
              <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">Buy Now</span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                <span className="material-symbols-rounded text-white text-sm sm:text-base">arrow_forward</span>
              </div>
            </button>
          </>
        ) : (
          /* State 4: Unenrolled Free Course */
          <>
            {/* Top-Right Floating Badge */}
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-300 to-teal-400 text-emerald-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20 border border-white/50">
              <span>🎉</span>
              <span>100% Free</span>
            </div>

            {/* Left Squircle Icon Box */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_8px_20px_rgba(16,185,129,0.35)] flex items-center justify-center shrink-0 border border-white/30">
              <span className="material-symbols-rounded text-white text-2xl sm:text-3xl">school</span>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-[1.5px] bg-slate-200/80 mx-0.5 shrink-0" />

            {/* Middle Section */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              <span className="text-xs sm:text-[13px] font-bold text-slate-500 leading-tight">Total Price</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-[900] text-emerald-600 tracking-tight font-outfit leading-none">
                  FREE
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 shadow-xs shrink-0">
                  <span>✨</span>
                  <span>Free Batch</span>
                </span>
              </div>
            </div>

            {/* Right Action Button */}
            <button
              onClick={onEnroll}
              disabled={enrolling}
              className="px-4.5 sm:px-6 py-2.5 sm:py-3 rounded-full font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_8px_25px_rgba(16,185,129,0.45)] hover:shadow-[0_10px_30px_rgba(16,185,129,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/25 overflow-hidden shrink-0 disabled:opacity-60"
            >
              <span className="material-symbols-rounded text-lg sm:text-xl text-white">school</span>
              <span className="text-sm sm:text-base font-black tracking-tight text-white whitespace-nowrap">
                {enrolling ? 'Enrolling...' : 'Enroll Free'}
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 ml-0.5">
                <span className="material-symbols-rounded text-white text-sm sm:text-base">arrow_forward</span>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CourseCheckoutBar;
