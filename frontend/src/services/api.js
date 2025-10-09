import axios from 'axios';

// Create axios instance with base configuration
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
console.log('API Base URL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
};

// Dishes API
export const dishesAPI = {
  // GET /api/v1/dishes
  getDishes: (params = {}) => api.get('/dishes', { params }),
  
  // GET /api/v1/dishes/:id
  getDish: (id) => api.get(`/dishes/${id}`),
  
  // GET /api/v1/dishes/categories
  getCategories: () => api.get('/dishes/categories'),
  
  // GET /api/v1/dishes/tags
  getTags: () => api.get('/dishes/tags'),
  
  // POST /api/v1/dishes (Admin only)
  createDish: (dishData) => api.post('/dishes', dishData),
  
  // PUT /api/v1/dishes/:id (Admin only)
  updateDish: (id, dishData) => api.put(`/dishes/${id}`, dishData),
  
  // DELETE /api/v1/dishes/:id (Admin only)
  deleteDish: (id) => api.delete(`/dishes/${id}`),
};

// Orders API
export const ordersAPI = {
  // POST /api/v1/orders
  createOrder: (orderData) => api.post('/orders', orderData),
  
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
  getAllOrders: (params = {}) => api.get('/admin/orders', { params }),
  
  // GET /api/v1/admin/users
  getAllUsers: (params = {}) => api.get('/admin/users', { params }),
  
  // PUT /api/v1/orders/:id/status (Admin only) - Fixed endpoint
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  
  // DELETE /api/v1/admin/orders/:id (Admin only)
  deleteOrder: (id) => api.delete(`/admin/orders/${id}`),
};

// Payment API
export const paymentAPI = {
  // POST /api/v1/payments/create-payment-intent
  createPaymentIntent: (orderId) => api.post('/payments/create-payment-intent', { orderId }),
  
  // GET /api/v1/payments/details/:orderId
  getPaymentDetails: (orderId) => api.get(`/payments/details/${orderId}`),
  
  // PUT /api/v1/payments/status/:orderId
  updatePaymentStatus: (orderId, paymentIntentId, status) => api.put(`/payments/status/${orderId}`, { paymentIntentId, status }),
  
  // POST /api/v1/payments/refund
  processRefund: (orderId, reason) => api.post('/payments/refund', { orderId, reason }),
};

// Health check
export const healthAPI = {
  // GET /api/v1/health
  checkHealth: () => api.get('/health'),
};

export default api;
