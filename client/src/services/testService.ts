import { API_BASE_URL, apiRequest, cachedFetch, getAdminHeaders, getAuthHeaders, invalidateCache } from './baseService';

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
// Results API
export const resultsAPI = {
  getAll: async (filters: any = {}) => {
    const params = new URLSearchParams();
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.testId) params.append('testId', filters.testId);

    const response = await fetch(`${API_BASE_URL}/admin/test-results?${params.toString()}`, {
      headers: getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch test results');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/test-results/${id}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete test result');
    return response.json();
  },
  reevaluate: async (testId: string) => {
    const response = await fetch(`${API_BASE_URL}/tests/${testId}/reevaluate`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to re-evaluate test');
    return response.json();
  }
};
