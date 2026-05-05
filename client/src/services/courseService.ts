import axios from 'axios';
import { API_BASE_URL, apiRequest, cachedFetch, getAdminHeaders, handleUnauthorized, invalidateCache } from './baseService';

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
    invalidateCache('course-detail');
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
    invalidateCache('course-detail');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete course');
    invalidateCache('courses');
    invalidateCache('course-detail');
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
    invalidateCache('home');
    invalidateCache('categories');
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
    invalidateCache('home');
    invalidateCache('categories');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/store/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete product');
    invalidateCache('home');
    invalidateCache('categories');
    return response.json();
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
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
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
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete video');
    invalidateCache('videos');
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
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
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
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
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/pdfs/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete PDF');
    invalidateCache('course-content');
    invalidateCache('study-dashboard');
    invalidateCache('course-detail');
    return response.json();
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/pdfs/reorder`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reorder PDFs');
    }
    invalidateCache('course-content');
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
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/packages/reorder`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reorder packages');
    }
    invalidateCache('packages');
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
    invalidateCache('home');
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
    invalidateCache('home');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/banners/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete banner');
    invalidateCache('banners');
    invalidateCache('home');
    return response.json();
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/banners/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reorder banners');
    }
    invalidateCache('banners');
    invalidateCache('home');
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
    return cachedFetch(`${API_BASE_URL}/quick-links`, 60000);
  },
  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/quick-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create quick link');
    invalidateCache('quick-links');
    invalidateCache('home');
    return response.json();
  },
  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/quick-links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update quick link');
    invalidateCache('quick-links');
    invalidateCache('home');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/quick-links/${id}`, { method: 'DELETE', headers: getAdminHeaders() });
    if (!response.ok) throw new Error('Failed to delete quick link');
    invalidateCache('quick-links');
    invalidateCache('home');
    return response.json();
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/quick-links/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reorder quick links');
    }
    invalidateCache('quick-links');
    invalidateCache('home');
    return response.json();
  }
};
// Instructions API
export const instructionsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/instructions`, 60000);
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
    invalidateCache('instructions');
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
    invalidateCache('instructions');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/instructions/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete instruction');
    invalidateCache('instructions');
    return response.json();
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/instructions/reorder`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reorder instructions');
    }
    invalidateCache('instructions');
    return response.json();
  }
};
