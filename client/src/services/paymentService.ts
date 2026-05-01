import { API_BASE_URL, getAdminHeaders, getAuthHeaders, invalidateCache } from './baseService';

// Orders API
export const ordersAPI = {
  create: async (orderData: any) => {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  getByUserId: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${userId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  }
};

// Purchases API
export const purchasesAPI = {
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create purchase');
    invalidateCache('my-courses');
    invalidateCache('courses');
    invalidateCache('course-detail');
    return response.json();
  },
  getByStudent: async (studentId: string) => {
    const response = await fetch(`${API_BASE_URL}/purchases/${studentId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch purchases');
    return response.json();
  },
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/purchases`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch all purchases');
    return response.json();
  }
};
