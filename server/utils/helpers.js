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

/**
 * Check if a purchase has expired based on course validity settings
 */
export const isPurchaseExpired = (purchase, course) => {
  if (!purchase || !course) return false;
  
  const mode = course.expiryMode;
  const val = course.validity;
  
  let validityValue = val;
  let currentExpiryMode = mode;

  // Handle Course validity object structure
  if (typeof val === 'object' && val !== null) {
    if (val.tab === 'end') {
      currentExpiryMode = 'End Date';
      validityValue = val.endDate;
    } else if (val.tab === 'set') {
      currentExpiryMode = 'Validity';
      validityValue = val.value; // Assuming value is in months or matching unit
    } else if (val.tab === 'lifetime') {
      currentExpiryMode = 'Lifetime Access';
    }
  }

  if (currentExpiryMode === 'End Date' && validityValue) {
    // Expected format: DD-MM-YYYY or ISO
    let dateStr = validityValue;
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        // If it's DD-MM-YYYY (last part is 4 digits), convert to YYYY-MM-DD
        if (parts[2].length === 4) {
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        // If it's already YYYY-MM-DD (first part is 4 digits), keep it as is
      }
    }
    const expiryDate = new Date(dateStr);
    if (!isNaN(expiryDate.getTime())) {
      return new Date() > expiryDate;
    }
  } else if (currentExpiryMode === 'Validity' && validityValue) {
    const months = parseInt(validityValue);
    if (!isNaN(months)) {
      const createdAt = purchase.createdAt ? new Date(purchase.createdAt) : new Date();
      const expiryDate = new Date(createdAt);
      expiryDate.setMonth(expiryDate.getMonth() + months);
      return new Date() > expiryDate;
    }
  }
  
  return false;
};
