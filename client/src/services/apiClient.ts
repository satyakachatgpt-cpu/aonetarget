import axios from 'axios';

const API_BASE_URL = '/api';

if (typeof window !== 'undefined') {
  console.log('Hostname:', window.location.hostname);
  console.log('Port:', window.location.port);
  console.log('API Base URL:', API_BASE_URL);
}

const apiCache: Record<string, { data: any; timestamp: number }> = {};
const pendingRequests: Record<string, Promise<any>> = {};
const CACHE_TTL = 30000;

export function getAdminHeaders(): Record<string, string> {
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    return { 'Authorization': `Bearer ${adminToken}`, 'x-admin-id': localStorage.getItem('adminId') || '' };
  }
  return {};
}

export function getAuthHeaders(): Record<string, string> {
  const studentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
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
  // Attempt cookie clear for subdomains if needed
  document.cookie = "accessToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
};

export const clearStudentSession = () => {
  localStorage.removeItem('isStudentAuthenticated');
  localStorage.removeItem('studentData');
  localStorage.removeItem('studentSessionToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('deviceId');
  localStorage.removeItem('token');
  // Attempt cookie clear
  document.cookie = "accessToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  document.cookie = "refreshToken=; Path=/api/auth/refresh; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
};

const handleUnauthorized = async (response: Response | { status: number; data?: any }, url: string) => {
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

    const isTokenError = data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN' || data.code === 'NO_AUTH';
    const isAdminPath = url.includes('/admin/') || url.includes('/v2/upload') || url.includes('/courses/import') || url.includes('/v1/apk') || url.includes('/dashboard/stats');

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

/**
 * Standard Authenticated Request Wrapper
 * Reduces boilerplate for 401 handling and JSON parsing
 */
async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  await handleUnauthorized(response, url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `API error (${response.status})`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

async function cachedFetch(url: string, ttl = CACHE_TTL): Promise<any> {
  const now = Date.now();
  const cached = apiCache[url];
  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }

  if (pendingRequests[url]) {
    return pendingRequests[url];
  }

  const promise = fetch(url, { headers: getAuthHeaders() }).then(async (response) => {
    await handleUnauthorized(response, url);

    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const data = await response.json();
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

// Courses API
export const coursesAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/courses`);
  },

  getById: async (id: string) => {
    return cachedFetch(`${API_BASE_URL}/courses/${id}`, 15000);
  },

  create: async (courseData: any) => {
    const data = await apiRequest(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(courseData),
    });
    invalidateCache('courses');
    return data;
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || 'Failed to update course');
    }
    invalidateCache('courses');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete course');
    invalidateCache('courses');
    return response.json();
  }
};

// Instructors API
export const instructorsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/instructors`);
    if (!response.ok) throw new Error('Failed to fetch instructors');
    return response.json();
  }
};

// Curriculum API
export const curriculumAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/curriculum`);
    if (!response.ok) throw new Error('Failed to fetch curriculum');
    return response.json();
  },

  getByCourseId: async (courseId: string) => {
    const response = await fetch(`${API_BASE_URL}/curriculum/${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch curriculum');
    return response.json();
  }
};

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
  }
};

// Buyers API
export const buyersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/buyers`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch buyers');
    return response.json();
  },

  create: async (buyerData: any) => {
    const response = await fetch(`${API_BASE_URL}/buyers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(buyerData),
    });
    if (!response.ok) throw new Error('Failed to create buyer');
    return response.json();
  },

  update: async (id: string, buyerData: any) => {
    const response = await fetch(`${API_BASE_URL}/buyers/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(buyerData),
    });
    if (!response.ok) throw new Error('Failed to update buyer');
    return response.json();
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/buyers/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete buyer');
    return response.json();
  }
};

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

// Upload API
export const uploadAPI = {
  uploadImage: async (file: File, options: any = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      headers: { ...getAdminHeaders() },
      onUploadProgress: options.onUploadProgress
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/v2/upload/image`, formData, config);
      return res.data;
    } catch (err: any) {
      await handleUnauthorized(err.response, `${API_BASE_URL}/v2/upload/image`);
      const errMsg = err.response?.data?.error || 'Image upload failed';
      throw new Error(errMsg);
    }
  },

  uploadVideo: async (file: File, options: any = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: { ...getAdminHeaders() },
      onUploadProgress: options.onUploadProgress,
      timeout: 300000 // 5 min timeout for videos
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/v2/upload/video`, formData, config);
      return res.data;
    } catch (err: any) {
      await handleUnauthorized(err.response, `${API_BASE_URL}/v2/upload/video`);
      const errMsg = err.response?.data?.error || 'Video upload failed';
      throw new Error(errMsg);
    }
  },

  uploadDocument: async (file: File, options: any = {}) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: { ...getAdminHeaders() },
      onUploadProgress: options.onUploadProgress
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/v2/upload/pdf`, formData, config);
      return res.data;
    } catch (err: any) {
      await handleUnauthorized(err.response, `${API_BASE_URL}/v2/upload/pdf`);
      const errMsg = err.response?.data?.error || 'Document upload failed';
      throw new Error(errMsg);
    }
  },
  // Alias for backward compatibility
  uploadPDF: async (file: File, options: any = {}) => {
    return uploadAPI.uploadDocument(file, options);
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

      // Check content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        // Response is not JSON, likely an error from server/proxy
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

// Store API
export const storeAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/store`);
    if (!response.ok) throw new Error('Failed to fetch store products');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/store`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/store/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/store/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete product');
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

// Questions API
export const questionsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/questions`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  },
  create: async (data: any) => {
    return apiRequest(`${API_BASE_URL}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest(`${API_BASE_URL}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest(`${API_BASE_URL}/questions/${id}`, {
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
  },
  bulkDelete: async (ids: string[]) => {
    const response = await fetch(`${API_BASE_URL}/questions/bulk-delete`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ questionIds: ids })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error || 'Failed to bulk delete questions';
      const details = errorData.details ? `: ${errorData.details}` : '';
      throw new Error(`${msg}${details}`);
    }
    return response.json();
  },
  updateAll: async (updates: any[]) => {
    const response = await fetch(`${API_BASE_URL}/questions/update-all`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ updates })
    });
    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.error || 'Failed to update questions order');
    }
    invalidateCache('tests');
    return response.json();
  }
};

// Tests API
export const testsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/tests`);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/tests`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create test');
    invalidateCache('tests');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update test');
    invalidateCache('tests');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete test');
    invalidateCache('tests');
    return response.json();
  },
  getById: async (id: string) => {
    return cachedFetch(`${API_BASE_URL}/tests/${id}`, 10000);
  },
  getQuestions: async (id: string): Promise<any[]> => {
    const data = await cachedFetch(`${API_BASE_URL}/tests/${id}`, 10000);
    return data.questions || [];
  },
  publish: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}/publish`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      }
    });
    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.error || 'Failed to publish test');
    }
    invalidateCache('tests');
    return response.json();
  },
  duplicate: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}/duplicate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      }
    });
    if (!response.ok) throw new Error('Failed to duplicate test');
    invalidateCache('tests');
    return response.json();
  },
  reevaluate: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}/reevaluate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      }
    });
    if (!response.ok) throw new Error('Failed to recompute results');
    return response.json();
  },
  export: async (id: string, solution = true) => {
    const response = await fetch(`${API_BASE_URL}/tests/${id}/export?solution=${solution}`);
    if (!response.ok) throw new Error('Failed to export PDF');
    return response.blob();
  }
};

// Test Series API
export const testSeriesAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/test-series`);
  },
  create: async (data: any) => {
    try {
      console.log('Creating test series with data:', data);
    const response = await fetch(`${API_BASE_URL}/test-series`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('Server error response:', error);
        throw new Error(error.error || error.details || `Failed to create test series (${response.status})`);
      }
      invalidateCache('test-series');
      const result = await response.json();
      console.log('Test series created successfully:', result);
      return result;
    } catch (error) {
      console.error('Test Series create error:', error);
      throw error;
    }
  },
  update: async (id: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/test-series/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAdminHeaders()
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || 'Failed to update test series');
      }
      invalidateCache('test-series');
      return response.json();
    } catch (error) {
      console.error('Test Series update error:', error);
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/test-series/${id}`, { 
        method: 'DELETE',
        headers: { ...getAdminHeaders() }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || 'Failed to delete test series');
      }
      invalidateCache('test-series');
      return response.json();
    } catch (error) {
      console.error('Test Series delete error:', error);
      throw error;
    }
  }
};

// Subjective Tests API
export const subjectiveTestsAPI = {
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subjective-tests`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || 'Failed to fetch subjective tests');
      }
      return response.json();
    } catch (error) {
      console.error('Subjective Tests getAll error:', error);
      throw error;
    }
  },
  create: async (data: any) => {
    try {
      console.log('Creating subjective test with data:', data);
      const response = await fetch(`${API_BASE_URL}/subjective-tests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAdminHeaders()
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('Server error response:', error);
        throw new Error(error.error || error.details || `Failed to create subjective test (${response.status})`);
      }
      const result = await response.json();
      console.log('Subjective test created successfully:', result);
      return result;
    } catch (error) {
      console.error('Subjective Test create error:', error);
      throw error;
    }
  },
  update: async (id: string, data: any) => {
    try {
    const response = await fetch(`${API_BASE_URL}/subjective-tests/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || 'Failed to update subjective test');
      }
      return response.json();
    } catch (error) {
      console.error('Subjective Test update error:', error);
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
    const response = await fetch(`${API_BASE_URL}/subjective-tests/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error.error || 'Failed to delete subjective test');
      }
      return response.json();
    } catch (error) {
      console.error('Subjective Test delete error:', error);
      throw error;
    }
  }
};

// Videos API
export const videosAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/videos`);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/videos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create video');
    invalidateCache('videos');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update video');
    invalidateCache('videos');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete video');
    invalidateCache('videos');
    return response.json();
  }
};

// Live Videos API
export const liveVideosAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/live-videos`);
  },
  getByStudentId: async (studentId: string) => {
    return cachedFetch(`${API_BASE_URL}/students/${studentId}/live-classes`, 15000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/live-videos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create live video');
    invalidateCache('live-videos');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/live-videos/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to update live video');
    }
    invalidateCache('live-videos');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/live-videos/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to delete live video');
    }
    invalidateCache('live-videos');
    return response.json();
  }
};

// PDFs API
export const pdfsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/pdfs`);
    if (!response.ok) throw new Error('Failed to fetch PDFs');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/pdfs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create PDF');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/pdfs/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update PDF');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/pdfs/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete PDF');
    return response.json();
  }
};

// Packages API
export const packagesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/packages`);
    if (!response.ok) throw new Error('Failed to fetch packages');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/packages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create package');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/packages/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || 'Failed to update package');
    }
    // Invalidate courses and test-series cache as packages often contain both
    invalidateCache('courses');
    invalidateCache('packages'); 
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/packages/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete package');
    return response.json();
  }
};

// Messages API
export const messagesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create message');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update message');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/messages/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete message');
    return response.json();
  }
};

// Blog API
export const blogAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/blog`);
    if (!response.ok) throw new Error('Failed to fetch blog posts');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/blog`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create blog post');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/blog/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update blog post');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/blog/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete blog post');
    return response.json();
  }
};

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

// Banners API
export const bannersAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/banners`, 60000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/banners`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create banner');
    invalidateCache('banners');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/banners/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update banner');
    invalidateCache('banners');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/banners/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete banner');
    invalidateCache('banners');
    return response.json();
  }
};

// Subjects API
export const subjectsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/subjects`);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subject');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subject');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete subject');
    return response.json();
  }
};

// Topics API
export const topicsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/topics`);
    if (!response.ok) throw new Error('Failed to fetch topics');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/topics`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create topic');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update topic');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete topic');
    return response.json();
  }
};

// Subcourses API
export const subcoursesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/subcourses`);
    if (!response.ok) throw new Error('Failed to fetch subcourses');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/subcourses`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subcourse');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/subcourses/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subcourse');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/subcourses/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete subcourse');
    return response.json();
  }
};

// Instructions API
export const instructionsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/instructions`);
    if (!response.ok) throw new Error('Failed to fetch instructions');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/instructions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create instruction');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/instructions/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update instruction');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/instructions/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete instruction');
    return response.json();
  }
};

// Exam Documents API
export const examDocumentsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/exam-documents`);
    if (!response.ok) throw new Error('Failed to fetch exam documents');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/exam-documents`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create exam document');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/exam-documents/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update exam document');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/exam-documents/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete exam document');
    return response.json();
  }
};

// News API
export const newsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/news`, 60000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/news`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create news');
    invalidateCache('news');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/news/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update news');
    invalidateCache('news');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/news/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete news');
    invalidateCache('news');
    return response.json();
  }
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/notifications`);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create notification');
    invalidateCache('notifications');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update notification');
    invalidateCache('notifications');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete notification');
    invalidateCache('notifications');
    return response.json();
  },
  deleteAll: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete all notifications');
    invalidateCache('notifications');
    return response.json();
  },
  bulkCreate: async (data: any[]) => {
    const response = await fetch(`${API_BASE_URL}/notifications/bulk`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ notifications: data }),
    });
    if (!response.ok) throw new Error('Failed to bulk create notifications');
    invalidateCache('notifications');
    return response.json();
  },
  updateAll: async (data: any[]) => {
    const response = await fetch(`${API_BASE_URL}/notifications/bulk-update`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ updates: data }),
    });
    if (!response.ok) throw new Error('Failed to update all notifications');
    invalidateCache('notifications');
    return response.json();
  },
  saveSubscription: async (subscription: any) => {
    const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) throw new Error('Failed to save subscription');
    return response.json();
  }
};

// Chats API
export const chatsAPI = {
  getUnreadCount: async () => {
    const response = await fetch(`${API_BASE_URL}/chats/unread/admin`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },
  getChats: async (studentId?: string) => {
    const url = studentId ? `${API_BASE_URL}/chats?studentId=${studentId}` : `${API_BASE_URL}/chats`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch chats');
    return response.json();
  },
  startChat: async (studentId: string, studentName: string) => {
    const response = await fetch(`${API_BASE_URL}/chats/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ studentId, studentName }),
    });
    if (!response.ok) throw new Error('Failed to start chat');
    return response.json();
  },
  getMessages: async (chatId: string) => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },
  sendMessage: async (chatId: string, messageData: any) => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(messageData),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },
  markRead: async (chatId: string, readerType: 'student' | 'admin') => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ readerType }),
    });
    if (!response.ok) throw new Error('Failed to mark as read');
    return response.json();
  }
};

// Categories API
export const categoriesAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/categories`, 60000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create category');
    invalidateCache('categories');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update category');
    invalidateCache('categories');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete category');
    invalidateCache('categories');
    return response.json();
  },
  seed: async () => {
    const response = await fetch(`${API_BASE_URL}/categories/seed`, { 
      method: 'POST',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to seed categories');
    invalidateCache('categories');
    invalidateCache('subcategories');
    return response.json();
  }
};

// SubCategories API
export const subcategoriesAPI = {
  getAll: async (categoryId?: string) => {
    const url = categoryId ? `${API_BASE_URL}/subcategories?categoryId=${categoryId}` : `${API_BASE_URL}/subcategories`;
    return cachedFetch(url, 60000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/subcategories`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subcategory');
    invalidateCache('subcategories');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/subcategories/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subcategory');
    invalidateCache('subcategories');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/subcategories/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete subcategory');
    invalidateCache('subcategories');
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

// Purchases API
export const purchasesAPI = {
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create purchase');
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

// Dashboard Stats API
export const dashboardAPI = {
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, { headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  }
};

// Splash Screen API
export const splashScreenAPI = {
  get: async () => {
    return cachedFetch(`${API_BASE_URL}/splash-screen`, 120000);
  },
  update: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/splash-screen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update splash screen settings');
    return response.json();
  }
};

// Quick Links API
export const quickLinksAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/quick-links`);
    if (!response.ok) throw new Error('Failed to fetch quick links');
    return response.json();
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/quick-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create quick link');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/quick-links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update quick link');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/quick-links/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to delete quick link');
    return response.json();
  }
};

// Reported Questions API
export const reportedQuestionsAPI = {
  report: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/reported-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to report question');
    return response.json();
  },
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/reported-questions`, {
      headers: getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch reported questions');
    return response.json();
  },
  updateStatus: async (id: string, status: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/reported-questions/${id}`, {
      method: 'PATCH',
      headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update report status');
    return response.json();
  }
};
