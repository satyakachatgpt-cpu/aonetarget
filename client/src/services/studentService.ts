import { API_BASE_URL, apiRequest, getAdminHeaders } from './baseService';

// Users API
export const usersAPI = {
  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  create: async (userData: any) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  }
};

// Students API
export const studentsAPI = {
  getAll: async () => {
    return apiRequest(`${API_BASE_URL}/students`, { headers: getAdminHeaders() });
  },

  getById: async (id: string) => {
    return apiRequest(`${API_BASE_URL}/students/${id}`, { headers: getAdminHeaders() });
  },

  create: async (studentData: any) => {
    return apiRequest(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(studentData),
    });
  },

  update: async (id: string, studentData: any) => {
    return apiRequest(`${API_BASE_URL}/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(studentData),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
  },

  approveDevice: async (studentId: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/approve-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ studentId })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to approve device');
    }
    return response.json();
  },

  rejectDevice: async (studentId: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/reject-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ studentId })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reject device');
    }
    return response.json();
  },

  resetDevice: async (studentId: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/reset-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ studentId })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reset device');
    }
    return response.json();
  },

  banUser: async (userId: string, reason: string) => {
    const response = await fetch(`${API_BASE_URL}/security-admin/ban-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ userId, reason })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to ban user');
    }
    return response.json();
  },

  enroll: async (studentId: string, courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ courseId })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to enroll student');
    }
    return response.json();
  },

  unenroll: async (studentId: string, courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/unenroll/${courseId}`, {
      method: 'DELETE',
      headers: {
        ...getAdminHeaders()
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to unenroll student');
    }
    return response.json();
  }
};

// Referrals Admin API
export const referralsAdminAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/referrals`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch referrals');
    return response.json();
  },
  getSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/referral-settings`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch referral settings');
    return response.json();
  },
  updateSettings: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/admin/referral-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update referral settings');
    return response.json();
  },
  updateStatus: async (referralCode: string, referredStudentId: string, status: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/referrals/update-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify({ referralCode, referredStudentId, status }),
    });
    if (!response.ok) throw new Error('Failed to update referral status');
    return response.json();
  }
};
