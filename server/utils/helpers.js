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
 * Normalize any date format (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO) to YYYY-MM-DD
 */
export const normalizeDateStr = (dateStr) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // Handle YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // Fallback for ISO or other formats
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return str;
};

/**
 * Check if a purchase has expired based on course validity settings
 */
export const isPurchaseExpired = (purchase, course) => {
  if (!purchase || !course) return false;

  // Early return for lifetime access or missing mode
  if (!course.expiryMode || course.expiryMode === 'Lifetime Access' || course.expiryMode === 'lifetime') {
    return false;
  }
  
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
      validityValue = val.value; 
    } else if (val.tab === 'lifetime') {
      currentExpiryMode = 'Lifetime Access';
    }
  }

  // Secondary check after resolving validity object
  if (currentExpiryMode === 'Lifetime Access' || currentExpiryMode === 'lifetime') {
    return false;
  }

  if (currentExpiryMode === 'End Date' && validityValue) {
    const normalizedDate = normalizeDateStr(validityValue);
    const expiryDate = new Date(normalizedDate);
    if (!isNaN(expiryDate.getTime())) {
      // Set to end of day to include the full last day
      expiryDate.setHours(23, 59, 59, 999);
      return new Date() > expiryDate;
    }
  } else if (currentExpiryMode === 'Validity' && validityValue) {
    const months = parseInt(validityValue);
    if (!isNaN(months)) {
      const createdAt = purchase.createdAt ? new Date(purchase.createdAt) : new Date();
      const expiryDate = new Date(createdAt);
      expiryDate.setMonth(expiryDate.getMonth() + months);
      // Set to end of day to include the full last day
      expiryDate.setHours(23, 59, 59, 999);
      return new Date() > expiryDate;
    }
  }
  
  return false;
};

/**
 * Check if an individual test has expired based on its closeDate
 */
export const isTestExpired = (test) => {
  if (!test) return false;
  
  // Use closeDate or endDate or validity
  const expiryDateStr = test.closeDate || test.endDate || test.validity;
  if (!expiryDateStr) return false;
  
  const expiryDate = new Date(expiryDateStr);
  if (isNaN(expiryDate.getTime())) return false;
  
  return new Date() > expiryDate;
};

