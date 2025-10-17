import axios from 'axios';

// Create axios instance with base configuration
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// Enhanced cache implementation with different durations for different data types
const cache = new Map();
const CACHE_DURATIONS = {
  dishes: 10 * 60 * 1000, // 10 minutes for dishes (they don't change often)
  categories: 30 * 60 * 1000, // 30 minutes for categories
  tags: 30 * 60 * 1000, // 30 minutes for tags
  orders: 2 * 60 * 1000, // 2 minutes for orders (more dynamic)
  users: 5 * 60 * 1000, // 5 minutes for users
  default: 5 * 60 * 1000 // 5 minutes default
};

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for payment operations
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cache helper functions
const getCacheKey = (url, params = {}) => {
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {});
  return `${url}?${JSON.stringify(sortedParams)}`;
};

const getCachedData = (key, type = 'default') => {
  const cached = cache.get(key);
  const duration = CACHE_DURATIONS[type] || CACHE_DURATIONS.default;
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Clear cache for dishes-related data
const clearDishesCache = () => {
  for (const [key] of cache) {
    if (key.includes('/dishes') || key.includes('/categories') || key.includes('/tags')) {
      cache.delete(key);
    }
  }
};

// Clear all cache
const clearAllCache = () => {
  cache.clear();
};

// Retry mechanism for failed requests
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Export cache management functions
export const cacheUtils = {
  clearDishesCache,
  clearAllCache,
  getCacheSize: () => cache.size,
  retryRequest
};

// Auth API
export const authAPI = {
  // POST /api/v1/auth/register
  register: (userData) => api.post('/auth/register', userData),
  
  // POST /api/v1/auth/login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // GET /api/v1/auth/me
  getMe: () => api.get('/auth/me'),
  
  // PUT /api/v1/auth/profile
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  
  // PUT /api/v1/auth/password
  changePassword: (passwordData) => api.put('/auth/password', passwordData),
  
  // POST /api/v1/auth/logout
  logout: () => api.post('/auth/logout'),
  
  // Address management
  // GET /api/v1/auth/addresses
  getDeliveryAddresses: () => api.get('/auth/addresses'),
  
  // POST /api/v1/auth/addresses
  addDeliveryAddress: (addressData) => api.post('/auth/addresses', addressData),
  
  // PUT /api/v1/auth/addresses/:addressId
  updateDeliveryAddress: (addressId, addressData) => api.put(`/auth/addresses/${addressId}`, addressData),
  
  // DELETE /api/v1/auth/addresses/:addressId
  deleteDeliveryAddress: (addressId) => api.delete(`/auth/addresses/${addressId}`),
  
  // PUT /api/v1/auth/addresses/:addressId/default
  setDefaultAddress: (addressId) => api.put(`/auth/addresses/${addressId}/default`),
  
};

// Dishes API
export const dishesAPI = {
  // GET /api/v1/dishes
  getDishes: async (params = {}, forceRefresh = false) => {
    const cacheKey = getCacheKey('/dishes', params);
    
    // If force refresh is requested, skip cache
    if (forceRefresh) {
      const response = await api.get('/dishes', { params });
      setCachedData(cacheKey, response);
      return response;
    }
    
    const cachedData = getCachedData(cacheKey, 'dishes');
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
    const response = await api.get('/dishes', { params });
    setCachedData(cacheKey, response);
    return response;
  },
  
  // GET /api/v1/dishes/:id
  getDish: async (id) => {
    const cacheKey = getCacheKey(`/dishes/${id}`);
    const cachedData = getCachedData(cacheKey, 'dishes');
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
    const response = await api.get(`/dishes/${id}`);
    setCachedData(cacheKey, response);
    return response;
  },
  
  // GET /api/v1/dishes/categories
  getCategories: async () => {
    const cacheKey = getCacheKey('/dishes/categories');
    const cachedData = getCachedData(cacheKey, 'categories');
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
    const response = await api.get('/dishes/categories');
    setCachedData(cacheKey, response);
    return response;
  },
  
  // GET /api/v1/dishes/tags
  getTags: async () => {
    const cacheKey = getCacheKey('/dishes/tags');
    const cachedData = getCachedData(cacheKey, 'tags');
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
    const response = await api.get('/dishes/tags');
    setCachedData(cacheKey, response);
    return response;
  },
  
  // POST /api/v1/dishes (Admin only)
  createDish: async (dishData) => {
    const response = await api.post('/dishes', dishData);
    console.log('Dish created, clearing cache...');
    clearDishesCache(); // Clear cache after creating
    // Also clear all cache to ensure fresh data everywhere
    clearAllCache();
    console.log('Cache cleared, cache size:', cache.size);
    return response;
  },
  
  // PUT /api/v1/dishes/:id (Admin only)
  updateDish: async (id, dishData) => {
    const response = await api.put(`/dishes/${id}`, dishData);
    clearDishesCache(); // Clear cache after updating
    // Also clear all cache to ensure fresh data everywhere
    clearAllCache();
    return response;
  },
  
  // DELETE /api/v1/dishes/:id (Admin only)
  deleteDish: async (id) => {
    const response = await api.delete(`/dishes/${id}`);
    clearDishesCache(); // Clear cache after deleting
    // Also clear all cache to ensure fresh data everywhere
    clearAllCache();
    return response;
  },
};

// Orders API
export const ordersAPI = {
  // POST /api/v1/orders
  createOrder: (orderData) => api.post('/orders', orderData),
  
  // PUT /api/v1/orders/:id/confirm-payment
  confirmPayment: (id) => api.put(`/orders/${id}/confirm-payment`),
  
  // GET /api/v1/orders/my-orders
  getMyOrders: (params = {}) => api.get('/orders/my-orders', { params }),
  
  // GET /api/v1/orders/:id
  getOrder: (id) => api.get(`/orders/${id}`),
  
  // PUT /api/v1/orders/:id/cancel
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  
  // DELETE /api/v1/orders/:id
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  
  // PUT /api/v1/orders/:id/status (Admin only)
  updateOrderStatus: (id, statusData) => api.put(`/orders/${id}/status`, statusData),
};

// Admin API
export const adminAPI = {
  // GET /api/v1/admin/stats
  getDashboardStats: () => api.get('/admin/stats'),
  
  // GET /api/v1/admin/orders
  getAllOrders: (params = {}) => {
    // Manually construct URL with query parameters
    const queryString = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryString.append(key, params[key]);
      }
    });
    const url = queryString.toString() ? `/admin/orders?${queryString.toString()}` : '/admin/orders';
    return api.get(url);
  },
  
  // GET /api/v1/admin/users
  getAllUsers: (params = {}) => api.get('/admin/users', { params }),
  
  // GET /api/v1/admin/users/:userId/stats
  getUserStats: (userId) => api.get(`/admin/users/${userId}/stats`),
  
  // PUT /api/v1/orders/:id/status (Admin only) - Fixed endpoint
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  
  // DELETE /api/v1/admin/orders/:id (Admin only)
  deleteOrder: (id) => api.delete(`/admin/orders/${id}`),
};

// Payment API
export const paymentAPI = {
  // POST /api/v1/payments/create-payment-intent
  createPaymentIntent: (orderId) => api.post('/payments/create-payment-intent', { orderId }),
  
  // POST /api/v1/payments/create-payment-intent-for-order
  createPaymentIntentForOrder: (orderData) => api.post('/payments/create-payment-intent-for-order', { orderData }),
  
  // GET /api/v1/payments/details/:orderId
  getPaymentDetails: (orderId) => api.get(`/payments/details/${orderId}`),
  
  // GET /api/v1/payments/verify/:orderId (secure server-side verification)
  verifyPaymentStatus: (orderId) => api.get(`/payments/verify/${orderId}`),
  
  // POST /api/v1/payments/refund
  processRefund: (orderId, reason) => api.post('/payments/refund', { orderId, reason }),

  // POST /api/v1/payments/request-refund
  requestRefund: (orderId, reason) => api.post('/payments/request-refund', { orderId, reason }),
};

// Notifications API
export const notificationsAPI = {
  // GET /api/v1/notifications
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  
  // GET /api/v1/notifications/unread-count
  getUnreadCount: () => api.get('/notifications/unread-count'),
  
  // PUT /api/v1/notifications/mark-read
  markAsRead: (notificationIds) => api.put('/notifications/mark-read', { notificationIds }),
  
  // PUT /api/v1/notifications/mark-all-read
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  
  // DELETE /api/v1/notifications/:notificationId
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  
  // GET /api/v1/notifications/stats (Admin only)
  getNotificationStats: () => api.get('/notifications/stats'),
};

// Newsletter API
export const newsletterAPI = {
  // POST /api/v1/newsletter/subscribe
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
  
  // POST /api/v1/newsletter/unsubscribe
  unsubscribe: (email, token) => api.post('/newsletter/unsubscribe', { email, token }),
  
  // GET /api/v1/newsletter/stats (Admin only)
  getStats: () => api.get('/newsletter/stats'),
};

// Health check
export const healthAPI = {
  // GET /api/v1/health
  checkHealth: () => api.get('/health'),
};

export default api;
