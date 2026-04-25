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
  let isInvalid = false;
  let invalidReason = '';

  if (coupon) {
    if (!coupon.code) {
      isInvalid = true;
      invalidReason = 'Invalid coupon data';
    }

    const now = new Date();
    const expiryDate = new Date(coupon.validUpto);
    expiryDate.setHours(23, 59, 59, 999);

    if (coupon.status !== 'active') {
      isInvalid = true;
      invalidReason = 'Coupon is inactive';
    } else if (coupon.validUpto && expiryDate < now) {
      isInvalid = true;
      invalidReason = 'Coupon has expired';
    } else if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) {
      isInvalid = true;
      invalidReason = 'Coupon usage limit reached';
    } else if (coupon.applicableToAllBatches === false && Array.isArray(coupon.batchIds) && coupon.batchIds.length > 0) {
      const courseIdStr = normalizeId(course.id || course._id);
      const isBatchMatch = coupon.batchIds.some(bid => normalizeId(bid) === courseIdStr);
      
      // Check if this coupon is explicitly whitelisted for this course
      const allowedCodes = Array.isArray(course.discountCodes) ? course.discountCodes : [];
      const normalize = (val) => (val || "").toString().trim().toUpperCase();
      const isWhitelisted = allowedCodes.some(code => normalize(code) === normalize(coupon.code));

      if (!isBatchMatch && !isWhitelisted) {
        isInvalid = true;
        invalidReason = 'This coupon is not applicable for this batch';
      }
    }

    // Course-level whitelist validation: Only allow coupons selected by Admin for this course
    const allowedCodes = Array.isArray(course.discountCodes) ? course.discountCodes : [];
    const normalize = (val) => (val || "").toString().trim().toUpperCase();
    const isAllowed = allowedCodes.some(code => normalize(code) === normalize(coupon.code));

    if (!isInvalid && allowedCodes.length > 0 && !isAllowed) {
      isInvalid = true;
      invalidReason = 'This coupon is not valid for this batch';
    }

    if (!isInvalid) {
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
      } else {
        isInvalid = true;
        invalidReason = `Minimum purchase of ₹${minPurchase} required`;
      }
    }
  }

  const totalAmount = Math.max(0, basePrice + gstAmount - (isInvalid ? 0 : discountAmount));

  return {
    basePrice,
    gstAmount,
    gstPercentage,
    discountAmount: isInvalid ? 0 : discountAmount,
    totalAmount,
    couponCode: coupon?.code || null,
    isInvalid,
    invalidReason
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
