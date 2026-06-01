import axios from 'axios';
import { toast } from 'sonner';



export const API_BASE_URL = '/api';

console.log('[API_BASE_URL]', API_BASE_URL, window.location.href);

export const apiCache: Record<string, { data: any; timestamp: number }> = {};
export const pendingRequests: Record<string, Promise<any>> = {};
export const CACHE_TTL = 30000;

// Axios Global Interceptor for 401, 429, and requestId
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    
    if (status === 401) {
      handleUnauthorized({ status, data }, error.config?.url || '').catch(() => {});
    } else if (status === 429) {
      toast.error('Too many requests, please wait');
    }
    
    const requestId = data?.requestId;
    if (requestId && status !== 401 && status !== 429) {
      toast.error(`Error occurred (Ref: ${requestId})`);
    }

    return Promise.reject(error);
  }
);

export function getAdminHeaders(): Record<string, string> {
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    return { 'Authorization': `Bearer ${adminToken}`, 'x-admin-id': localStorage.getItem('adminId') || '' };
  }
  return {};
}

export function getAuthHeaders(): Record<string, string> {
  // Primary: localStorage (normal browser)
  let studentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  
  // Fallback: sessionStorage (PWA auto-login edge case where localStorage not yet persisted)
  if (!studentToken) {
    studentToken = sessionStorage.getItem('accessToken') || sessionStorage.getItem('token');
  }
  
  // Fallback: authStore Zustand state via window (PWA memory-only token)
  if (!studentToken) {
    try {
      const raw = localStorage.getItem('studentData');
      if (raw) {
        const parsed = JSON.parse(raw);
        studentToken = parsed?.accessToken || parsed?.token || null;
      }
    } catch (e) {}
  }

  if (studentToken) {
    return { 'Authorization': `Bearer ${studentToken}` };
  }
  return {};
}

export const clearAdminSession = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminId');
  localStorage.removeItem('adminName');
  localStorage.removeItem('isAdminAuthenticated');
  localStorage.removeItem('adminLoginTimestamp');
  document.cookie = "accessToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
};

export const clearStudentSession = () => {
  localStorage.removeItem('isStudentAuthenticated');
  localStorage.removeItem('studentData');
  localStorage.removeItem('studentSessionToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  document.cookie = "accessToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  document.cookie = "refreshToken=; Path=/api/auth/refresh; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
};

export const handleUnauthorized = async (response: Response | { status: number; data?: any }, url: string) => {
  const status = 'status' in response ? response.status : (response as any).response?.status;
  
  if (status === 401) {
    let data: any = {};
    try {
      if ('json' in response && typeof response.json === 'function') {
        data = await response.clone().json().catch(() => ({}));
      } else if ('data' in response) {
        data = response.data;
      }
    } catch (e) { /* ignore parse errors */ }

    const isTokenError = data.code === 'INVALID_TOKEN' || data.code === 'NO_AUTH';
    const isAdminPath = url.includes('/admin/') || url.includes('/v2/upload') || url.includes('/courses/import') || url.includes('/v1/apk') || url.includes('/dashboard/stats');

    if (data.code === 'TOKEN_EXPIRED' && !isAdminPath) {
      // Do NOT clear session here. authStore's checkAuth or interceptor will handle the refresh.
      // If refresh fails, authStore will clear the session.
      return;
    }

    if (isTokenError || status === 401) {
      if (isAdminPath && (localStorage.getItem('adminToken') || localStorage.getItem('isAdminAuthenticated'))) {
        clearAdminSession();
        if (window.location.hash !== '#/admin-login') window.location.hash = '#/admin-login';
        throw new Error(data.error || 'Admin session expired. Please login again.');
      } else if (localStorage.getItem('accessToken') || localStorage.getItem('isStudentAuthenticated')) {
        clearStudentSession();
        if (window.location.hash !== '#/student-login' && window.location.hash !== '#/login') {
          window.location.hash = '#/student-login';
        }
        throw new Error(data.error || 'Session expired. Please login again.');
      }
    }
  }
};

export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  await handleUnauthorized(response, url);
  
  if (response.status === 429) {
    toast.error('Too many requests, please wait');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.requestId && response.status !== 401 && response.status !== 429) {
      toast.error(`Error occurred (Ref: ${errorData.requestId})`);
    }
    throw new Error(errorData.error || errorData.details || `API error (${response.status})`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export async function cachedFetch(url: string, ttl = CACHE_TTL): Promise<any> {
  const now = Date.now();
  const cached = apiCache[url];
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }

  if (pendingRequests[url]) {
    return pendingRequests[url];
  }

  const headers = { ...getAuthHeaders(), ...getAdminHeaders() };
  const promise = fetch(url, { headers }).then(async (response) => {
    await handleUnauthorized(response, url);

    if (response.status === 429) {
      toast.error('Too many requests, please wait');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.requestId && response.status !== 401 && response.status !== 429) {
        toast.error(`Error occurred (Ref: ${errorData.requestId})`);
      }
      throw new Error(errorData.error || errorData.details || `Failed to fetch ${url}`);
    }
    
    const data = await response.json().catch(() => ({}));
    apiCache[url] = { data, timestamp: Date.now() };
    delete pendingRequests[url];
    return data;
  }).catch((err) => {
    delete pendingRequests[url];
    throw err;
  });

  pendingRequests[url] = promise;
  return promise;
}

export function invalidateCache(urlPattern?: string) {
  if (urlPattern) {
    Object.keys(apiCache).forEach(key => {
      if (key.includes(urlPattern)) delete apiCache[key];
    });
  } else {
    Object.keys(apiCache).forEach(key => delete apiCache[key]);
  }
}
