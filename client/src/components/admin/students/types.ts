export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  course: string;
  state?: string;
  city: string;
  registrationDate: string;
  registrationType: string;
  status: 'active' | 'inactive';
  paymentStatus: 'paid' | 'pending' | 'failed';
  notes?: string;
  userId?: string;
  isBanned?: boolean;
  suspiciousActivityCount?: number;
  blockedAt?: string;
  hasPassword?: boolean;
  gender?: string;
  district?: string;
  whatsAppNumber?: string;
  alternateWhatsAppNumber?: string;
  alternateNumber?: string;
  class?: string;
  address?: string;
  highQualification?: string;
  height?: string;
  qualification?: string;

  admission?: {
    fatherName: string;
    motherName: string;
    gender: string;
    alternatePhone: string;
    fullAddress: string;
    batchTiming: string;
    admissionDate: string;
  };
  fees?: {
    totalFees: number;
    paidAmount: number;
    remainingAmount: number;
  };
  academic?: {
    previousClass: string;
    schoolName: string;
    marksPercentage: string;
    passingYear: string;
  };
  documents?: {
    aadharCard: string;
    marksheet: string;
    photo: string;
    profilePhoto: string;
  };
  deviceId?: string;
  activeDeviceId?: string;
  activeDeviceName?: string;
  activeDeviceType?: string;
  activeDeviceIP?: string;
  activeDeviceUserAgent?: string;
  activeDeviceRegisteredAt?: string;
  activeDeviceLastLoginAt?: string;

  pendingDeviceId?: string;
  pendingDeviceName?: string;
  pendingDeviceType?: string;
  pendingDeviceIP?: string;
  pendingDeviceUserAgent?: string;
  pendingDeviceRequestedAt?: string;
  pendingDeviceStatus?: string;

  deviceIP?: string;
  lastIP?: string;

  deviceLocked?: boolean;
  enrolledCourses?: string[];
  _id?: string;
  createdAt?: string;
}
