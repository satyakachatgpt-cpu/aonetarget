import { API_BASE_URL } from './baseService';

// Admin Authentication API
export const adminAPI = {
  login: async (adminId: string, password: string) => {
    try {
      const url = `${API_BASE_URL}/admin/login`;
      console.log('API URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Backend API not available. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  },

  verify: async (adminId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verify`, {
        headers: { 'x-admin-id': adminId },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Verification failed');
    }
  }
};
