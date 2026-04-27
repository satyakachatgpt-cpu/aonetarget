import { API_BASE_URL, getAdminHeaders } from './baseService';


// Tokens API
export const tokensAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/tokens`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch tokens');
    return response.json();
  },

  create: async (tokenData: any) => {
    const response = await fetch(`${API_BASE_URL}/tokens`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(tokenData),
    });
    if (!response.ok) throw new Error('Failed to create token');
    return response.json();
  },

  update: async (id: string, tokenData: any) => {
    const response = await fetch(`${API_BASE_URL}/tokens/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(tokenData),
    });
    if (!response.ok) throw new Error('Failed to update token');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tokens/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete token');
    return response.json();
  }
};

// Coupons API
export const couponsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/coupons`);
    if (!response.ok) throw new Error('Failed to fetch coupons');
    return response.json();
  },

  create: async (couponData: any) => {
    const response = await fetch(`${API_BASE_URL}/coupons`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(couponData),
    });
    if (!response.ok) throw new Error('Failed to create coupon');
    return response.json();
  },

  update: async (id: string, couponData: any) => {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(couponData),
    });
    if (!response.ok) throw new Error('Failed to update coupon');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete coupon');
    return response.json();
  }
};

// Institute API
export const instituteAPI = {
  get: async () => {
    const response = await fetch(`${API_BASE_URL}/institute`);
    if (!response.ok) throw new Error('Failed to fetch institute settings');
    return response.json();
  },
  update: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/institute`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update institute settings');
    return response.json();
  }
};
