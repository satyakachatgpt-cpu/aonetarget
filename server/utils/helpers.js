/**
 * Helper to normalize IDs for comparison (handling ObjectId and strings)
 */
export const normalizeId = (id) => {
  if (!id) return '';
  if (typeof id === 'object' && id.toString) return id.toString().trim();
  return String(id).trim();
};

/**
 * Calculate Price Breakdown for Courses with Coupons
 */
export const calculatePriceBreakdown = (course, coupon = null) => {
  const basePrice = parseFloat(course.price) || 0;
  const gstIncluded = course.settings?.gstIncluded || false;
  const gstPercentage = parseFloat(course.settings?.gstPercentage) || 0;

  let gstAmount = 0;
  if (gstIncluded && gstPercentage > 0) {
    gstAmount = (basePrice * gstPercentage) / 100;
  }

  let discountAmount = 0;
  if (coupon && coupon.status === 'active') {
    // Check minPurchase if exists
    const minPurchase = parseFloat(coupon.minPurchase || 0);
    if (basePrice >= minPurchase) {
      if (coupon.discountType === 'percentage' || coupon.type === 'percentage') {
        const val = parseFloat(coupon.discountValue || coupon.value || 0);
        discountAmount = (basePrice * val) / 100;
        // Check maxDiscount if exists
        const maxDiscount = parseFloat(coupon.maxDiscount || 0);
        if (maxDiscount > 0 && discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
      } else {
        discountAmount = parseFloat(coupon.discountValue || coupon.value || 0);
      }
    }
  }

  const totalAmount = Math.max(0, basePrice + gstAmount - discountAmount);

  return {
    basePrice,
    gstAmount,
    gstPercentage,
    discountAmount,
    totalAmount,
    couponCode: coupon?.code || null
  };
};
