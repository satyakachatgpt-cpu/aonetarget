import { getDb } from '../config/db.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000;

/**
 * State Management Service for Authentication & OTPs - Phase 18A -> Hardened
 * Now uses MongoDB persistence for restart safety.
 */

/**
 * Generic OTP Save
 */
export async function saveOtp(phone, purpose, otp) {
  const db = getDb();
  await db.collection('otps').updateOne(
    { phone, purpose },
    {
      $set: {
        phone,
        purpose,
        otp,
        verified: false,
        attempts: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
      }
    },
    { upsert: true }
  );
}

/**
 * Generic OTP Get (Valid only)
 */
export async function getValidOtp(phone, purpose) {
  const db = getDb();
  return db.collection('otps').findOne({
    phone,
    purpose,
    expiresAt: { $gt: new Date() }
  });
}

/**
 * Generic OTP Mark Verified
 */
export async function markOtpVerified(phone, purpose) {
  const db = getDb();
  await db.collection('otps').updateOne(
    { phone, purpose },
    { $set: { verified: true, verifiedAt: new Date() } }
  );
}

/**
 * Generic OTP Consume (Delete)
 */
export async function consumeOtp(phone, purpose) {
  const db = getDb();
  await db.collection('otps').deleteOne({ phone, purpose });
}

/**
 * Registration/Signup OTPs (Legacy Aliases for backward compatibility if needed)
 */
export const setOtp = async (phone, data) => {
  await saveOtp(phone, 'signup', data.otp);
};

export const getOtp = async (phone) => {
  return getValidOtp(phone, 'signup');
};

export const deleteOtp = async (phone) => {
  await consumeOtp(phone, 'signup');
};

/**
 * Password Reset OTPs (Compatibility Aliases)
 */
export const setResetOtp = async (phone, data) => {
  await saveOtp(phone, 'reset', data.otp);
};

export const getResetOtp = async (phone) => {
  return getValidOtp(phone, 'reset');
};

export const verifyResetOtp = async (phone, otp) => {
  const stored = await getValidOtp(phone, 'reset');
  if (!stored) return false;
  return String(stored.otp) === String(otp);
};

export const deleteResetOtp = async (phone) => {
  await consumeOtp(phone, 'reset');
};

export const setResetVerified = async (phone) => {
  await markOtpVerified(phone, 'reset');
};
