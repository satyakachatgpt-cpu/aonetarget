import { API_BASE_URL, getAdminHeaders } from './baseService';

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },
  update: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update settings');
    return response.json();
  }
};

// Dashboard Stats API
export const dashboardAPI = {
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  }
};
