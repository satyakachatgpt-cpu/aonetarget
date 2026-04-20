import { API_BASE_URL, cachedFetch, getAdminHeaders, getAuthHeaders, invalidateCache } from './baseService';

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
    if (!response.ok) throw new Error('Failed to mark chat as read');
    return response.json();
  },
  editMessage: async (chatId: string, messageId: string, message: string) => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ message })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to edit message');
    }
    return response.json();
  }
};
