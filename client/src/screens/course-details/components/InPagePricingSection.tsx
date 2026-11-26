import React, { useState } from 'react';

interface InPagePricingSectionProps {
  price: number;
  mrp: number;
  discountAmount: number;
  gstAmount: number;
  finalAmount: number;
  appliedCoupon: string | null;
  studentState: string;
  onOpenCoupons: () => void;
  onRemoveCoupon: () => void;
  onStateClick?: () => void;
}

export const InPagePricingSection: React.FC<InPagePricingSectionProps> = ({
  price,
  mrp,
  discountAmount,
  gstAmount,
  finalAmount,
  appliedCoupon,
  studentState,
  onOpenCoupons,
  onRemoveCoupon,
  onStateClick,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="mx-4 my-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3.5">
      <h3 className="text-sm font-black text-gray-900 tracking-tight">Pricing Details</h3>

      {/* Row 1: You Pay with Expandable Breakdown */}
      <div className="border-b border-gray-100 pb-3">
        <div 
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <span className="text-xs font-semibold text-gray-700">You Pay</span>
          <div className="flex items-center gap-1.5 text-gray-900 font-extrabold text-sm group-hover:text-primary-700 transition-colors">
            <span>₹{finalAmount.toLocaleString('en-IN')}</span>
            <span className={`material-symbols-rounded text-lg text-gray-400 transition-transform duration-200 ${showBreakdown ? 'rotate-180 text-primary-600' : ''}`}>
              keyboard_arrow_down
            </span>
          </div>
        </div>

        {/* Expandable Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 text-xs space-y-1.5 animate-fade-in text-gray-600">
            {mrp > price && (
              <div className="flex justify-between">
                <span>Maximum Retail Price (MRP)</span>
                <span className="line-through text-gray-400">₹{mrp.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Course Base Price</span>
              <span>₹{price.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Coupon Discount ({appliedCoupon})</span>
                <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {gstAmount > 0 && (
              <div className="flex justify-between">
                <span>GST / Taxes</span>
                <span>+₹{gstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Coupon Apply / Applied matching Screenshot 8 */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        {appliedCoupon ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-emerald-600 text-lg">check_circle</span>
              <span className="text-xs font-bold text-emerald-700">
                '{appliedCoupon}' applied (-₹{discountAmount.toLocaleString('en-IN')})
              </span>
            </div>
            <button
              onClick={onRemoveCoupon}
              className="text-xs font-bold text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <div 
            onClick={onOpenCoupons}
            className="flex items-center justify-between w-full cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-rounded text-amber-500 text-base">sell</span>
              <span className="text-xs font-medium text-gray-600">
                Have a coupon code? <strong className="text-primary-700 font-bold">Apply here</strong>
              </span>
            </div>
            <span className="material-symbols-rounded text-gray-400 text-lg">chevron_right</span>
          </div>
        )}
      </div>

      {/* Row 3: State location matching Screenshot 8 */}
      <div 
        onClick={onStateClick}
        className="flex items-center justify-between border-b border-gray-100 pb-3 cursor-pointer hover:opacity-80 active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-blue-500 text-base">location_on</span>
          <span className="text-xs font-medium text-gray-700">
            Purchasing in <strong className="text-gray-900 font-bold">{studentState || 'Haryana'}</strong>
          </span>
        </div>
        <span className="material-symbols-rounded text-gray-400 text-lg">chevron_right</span>
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-gray-400 leading-normal">
        * Amount payable is inclusive of taxes. Terms & Conditions apply.
      </p>
    </div>
  );
};
