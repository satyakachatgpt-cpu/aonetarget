import React, { useState, useEffect } from 'react';

interface CouponBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  appliedCoupon: string | null;
  onApplyCoupon: (code: string) => Promise<{ success: boolean; message?: string }>;
  onRemoveCoupon: () => void;
}

export const CouponBottomSheet: React.FC<CouponBottomSheetProps> = ({
  isOpen,
  onClose,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setCouponInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;

    setApplying(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await onApplyCoupon(code);
      if (res.success) {
        setSuccessMsg(res.message || 'Coupon applied successfully!');
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setErrorMsg(res.message || 'Invalid or expired coupon code');
      }
    } catch {
      setErrorMsg('Failed to apply coupon. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-t-[28px] shadow-2xl p-5 pb-8 overflow-hidden animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-amber-500 text-2xl">loyalty</span>
            <h3 className="text-base font-black text-gray-900 tracking-tight font-outfit">Apply Coupons</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        {/* Coupon Input Box Matching Screenshot 9 */}
        <div className="mt-4">
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-100 transition-all bg-gray-50/60">
            <input
              type="text"
              placeholder="ENTER A COUPON CODE"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(e.target.value.toUpperCase());
                setErrorMsg('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none uppercase tracking-wider py-1.5"
            />
            <button
              disabled={!couponInput.trim() || applying}
              onClick={() => handleApply()}
              className="text-xs font-black tracking-wider text-primary-700 hover:text-primary-800 uppercase px-2 py-1 disabled:opacity-40 disabled:hover:text-primary-700 transition-all active:scale-95 cursor-pointer"
            >
              {applying ? 'Applying...' : 'APPLY'}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-red-500 mt-2 px-1 flex items-center gap-1 animate-fade-in">
              <span className="material-symbols-rounded text-sm">error</span>
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <p className="text-xs font-bold text-emerald-600 mt-2 px-1 flex items-center gap-1 animate-fade-in">
              <span className="material-symbols-rounded text-sm">check_circle</span>
              {successMsg}
            </p>
          )}
        </div>

        {/* Active Applied Coupon Info */}
        {appliedCoupon && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-emerald-600 text-lg">verified</span>
              <div>
                <span className="text-xs font-black text-emerald-800 tracking-wide uppercase">{appliedCoupon}</span>
                <p className="text-[10px] text-emerald-600 font-bold">Coupon currently applied</p>
              </div>
            </div>
            <button 
              onClick={() => {
                onRemoveCoupon();
                setSuccessMsg('');
              }}
              className="text-xs font-bold text-red-500 hover:text-red-700 underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}

        {/* Clean Ticket Illustration & Helper Text (Matching Reference Screenshot 9) */}
        <div className="flex flex-col items-center justify-center py-7 text-center px-4 mt-2">
          <div className="w-20 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-amber-200 mb-3 shadow-xs">
            <span className="material-symbols-rounded text-3xl text-amber-500">confirmation_number</span>
          </div>
          <h4 className="text-sm font-black text-gray-800 tracking-tight">Have a promo or discount code?</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-[280px] leading-relaxed">
            Enter your coupon code above and click APPLY to claim your special discount on this course.
          </p>
        </div>
      </div>
    </div>
  );
};
