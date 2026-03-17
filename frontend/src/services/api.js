import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============ AUTH ============
export const login = (username, password) =>
  apiClient.post('/auth/login', { username, password });

export const register = (userData) =>
  apiClient.post('/auth/register', userData);

export const getProfile = () =>
  apiClient.get('/auth/profile');

export const logout = () =>
  apiClient.post('/auth/logout');

export const refreshToken = () =>
  apiClient.post('/auth/refresh-token');

// ============ PRODUCTS ============
export const getProducts = () =>
  apiClient.get('/products');

export const getCategories = () =>
  apiClient.get('/products/categories/list');

export const getUnits = () =>
  apiClient.get('/products/units/list');

export const getProductByBarcode = (barcode) =>
  apiClient.get(`/products/barcode/${barcode}`);

export const createProduct = (productData) =>
  apiClient.post('/products', productData);

export const updateProduct = (id, productData) =>
  apiClient.put(`/products/${id}`, productData);

export const deleteProduct = (id) =>
  apiClient.delete(`/products/${id}`);

// ============ SALES ============
export const getSales = () =>
  apiClient.get('/sales');

export const getTodaysSales = () =>
  apiClient.get('/sales/today');

export const createSale = (saleData) =>
  apiClient.post('/sales', saleData);

export const getSaleById = (id) =>
  apiClient.get(`/sales/${id}`);

export const updateSale = (id, saleData) =>
  apiClient.put(`/sales/${id}`, saleData);

export const deleteSale = (id) =>
  apiClient.delete(`/sales/${id}`);

// ============ PURCHASES ============
export const getPurchases = () =>
  apiClient.get('/purchases');

export const createPurchase = (purchaseData) =>
  apiClient.post('/purchases', purchaseData);

export const getPurchaseById = (id) =>
  apiClient.get(`/purchases/${id}`);

export const updatePurchase = (id, purchaseData) =>
  apiClient.put(`/purchases/${id}`, purchaseData);

export const deletePurchase = (id) =>
  apiClient.delete(`/purchases/${id}`);

// ============ SUPPLIERS ============
export const getSuppliers = () =>
  apiClient.get('/suppliers');

export const createSupplier = (supplierData) =>
  apiClient.post('/suppliers', supplierData);

export const updateSupplier = (id, supplierData) =>
  apiClient.put(`/suppliers/${id}`, supplierData);

export const deleteSupplier = (id) =>
  apiClient.delete(`/suppliers/${id}`);
// ============ INVENTORY ============
export const getInventory = () =>
  apiClient.get('/inventory');

export const updateInventory = (id, inventoryData) =>
  apiClient.put(`/inventory/${id}`, inventoryData);

// ============ USERS ============
export const getUsers = () =>
  apiClient.get('/users');

export const getAllUsers = () =>
  apiClient.get('/users');

export const getUserById = (id) =>
  apiClient.get(`/users/${id}`);

export const createUser = (userData) =>
  apiClient.post('/users', userData);

export const updateUser = (id, userData) =>
  apiClient.put(`/users/${id}`, userData);

export const deleteUser = (id) =>
  apiClient.delete(`/users/${id}`);

export const updateUserRole = (id, role) =>
  apiClient.put(`/users/${id}/role`, { role });

export const updateUserStatus = (id, status) =>
  apiClient.put(`/users/${id}/status`, { status });

export const resetUserPassword = (id, newPassword) =>
  apiClient.post(`/users/${id}/reset-password`, { newPassword });

// ============ SETTINGS ============
export const getSettings = () =>
  apiClient.get('/settings');

export const updateProfile = (data) =>
  apiClient.put('/settings/profile', data);

export const changePassword = (data) =>
  apiClient.post('/settings/change-password', data);

export const updateAppSettings = (data) =>
  apiClient.put('/settings/app', data);

export const updateNotifications = (data) =>
  apiClient.put('/settings/notifications', data);

// ============ ANALYTICS ============
export const getAnalyticsStats = () =>
  apiClient.get('/analytics/stats');

export const getDailySales = () =>
  apiClient.get('/analytics/daily-sales');

export const getSalesByUser = () =>
  apiClient.get('/analytics/sales-by-user');

export const getLowStock = () =>
  apiClient.get('/analytics/low-stock');



export default apiClient;