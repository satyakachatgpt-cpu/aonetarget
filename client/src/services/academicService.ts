import { API_BASE_URL, cachedFetch, getAdminHeaders, invalidateCache } from './baseService';

// Instructors API
export const instructorsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/instructors`, 60000);
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
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/categories/reorder`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder categories');
    invalidateCache('categories');
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
  },
  reorder: async (orderedIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/subcategories/reorder`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminHeaders()
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (!response.ok) throw new Error('Failed to reorder subcategories');
    invalidateCache('subcategories');
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
    invalidateCache('subjects');
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
    invalidateCache('subjects');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/subjects/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete subject');
    invalidateCache('subjects');
    return response.json();
  }
};

// Topics API
export const topicsAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/topics`, 60000);
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
    invalidateCache('topics');
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
    invalidateCache('topics');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/topics/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete topic');
    invalidateCache('topics');
    return response.json();
  }
};

// Subcourses API
export const subcoursesAPI = {
  getAll: async () => {
    return cachedFetch(`${API_BASE_URL}/subcourses`, 60000);
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
    invalidateCache('subcourses');
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
    invalidateCache('subcourses');
    return response.json();
  },
  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/subcourses/${id}`, { 
      method: 'DELETE',
      headers: { ...getAdminHeaders() }
    });
    if (!response.ok) throw new Error('Failed to delete subcourse');
    invalidateCache('subcourses');
    return response.json();
  }
};
