import React from 'react';

interface CourseBottomBarProps {
  price: number;
  isPaidCourse: boolean;
  isEnrolled: boolean;
  enrollmentStatus: string;
  enrolling: boolean;
  processingPayment: boolean;
  onBuyNow: () => void;
  onStartLearning: () => void;
}

export const CourseBottomBar: React.FC<CourseBottomBarProps> = ({
  price,
  isPaidCourse,
  isEnrolled,
  enrollmentStatus,
  enrolling,
  processingPayment,
  onBuyNow,
  onStartLearning,
}) => {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Formatted Price Matching Screenshot 6, 7, 8 */}
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Total Price</span>
          <span className="text-2xl font-[900] text-gray-900 tracking-tight leading-tight">
            {isPaidCourse ? `₹ ${price.toLocaleString('en-IN')}` : 'FREE'}
          </span>
        </div>

        {/* Right Side: Action Button Matching Screenshot 6, 7, 8 */}
        {isEnrolled ? (
          <button
            onClick={onStartLearning}
            className="flex-1 max-w-[200px] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>Start Learning</span>
            <span className="material-symbols-rounded text-base">arrow_forward</span>
          </button>
        ) : (
          <button
            disabled={processingPayment || enrolling}
            onClick={onBuyNow}
            className="flex-1 max-w-[200px] py-3 rounded-xl bg-[#008BDC] hover:bg-[#0077BC] active:scale-95 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            {processingPayment ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </span>
            ) : enrolling ? (
              <span>Enrolling...</span>
            ) : (
              <span>Buy now</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
