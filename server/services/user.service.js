import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

/**
 * Get internal DB instance
 */
const getDb = () => mongoose.connection.db;

/**
 * Find Student by ID variants
 */
export async function findStudent(studentId) {
  if (!studentId) return null;
  const db = getDb();
  
  return await db.collection('students').findOne({
    $or: [
      { id: studentId },
      { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null },
      { phone: studentId }
    ].filter(f => f.id || f._id || f.phone)
  });
}

/**
 * Find Admin by ID variants
 */
export async function findAdmin(adminId) {
  if (!adminId) return null;
  const db = getDb();

  return await db.collection('admins').findOne({
    $or: [
      { adminId: adminId },
      { _id: ObjectId.isValid(adminId) ? new ObjectId(adminId) : null }
    ].filter(f => f.adminId || f._id)
  });
}

/**
 * Generic User Search (Student or Admin)
 * Useful for auth-related operations
 */
export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const db = getDb();

  // Try Student first
  const cleanPhone = identifier.replace(/\D/g, '');
  const student = await db.collection('students').findOne({
    $or: [
      { email: identifier.toLowerCase().trim() },
      { phone: identifier },
      { phone: cleanPhone },
      { id: identifier }
    ].filter(Boolean)
  });
  if (student) return { ...student, role: 'student' };

  // Try Admin
  const admin = await db.collection('admins').findOne({
    $or: [
      { adminId: identifier },
      { email: identifier.toLowerCase().trim() }
    ].filter(Boolean)
  });
  if (admin) return { ...admin, role: 'admin' };

  return null;
}
