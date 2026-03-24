import axios from 'axios';

const RAW_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env)
  ? (import.meta.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_BACKEND_URL)
  : process.env.REACT_APP_BACKEND_URL;
export const BACKEND_URL = typeof RAW_BACKEND_URL === 'string'
  ? RAW_BACKEND_URL.replace(/\/+$/, '')
  : '';
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export const resolveMediaUrl = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const normalizedPath = trimmed.startsWith('/')
    ? trimmed
    : `/${trimmed.replace(/^\.?\//, '')}`;

  if (BACKEND_URL) {
    return `${BACKEND_URL}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalizedPath}`;
  }

  return normalizedPath;
};

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const requestPasswordResetCode = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPasswordWithCode = async ({ email, code, new_password }) => {
  const response = await api.post('/auth/reset-password', { email, code, new_password });
  return response.data;
};

export const fetchProducts = async (category = null) => {
  const params = category ? { category } : {};
  const response = await api.get('/products', { params });
  return response.data;
};

export const fetchProductsWithFilters = async (params = {}) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const fetchProduct = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createCheckoutPreference = async (orderData) => {
  const response = await api.post('/checkout/create-preference', orderData);
  return response.data;
};

export const fetchCheckoutQuote = async (orderData) => {
  const response = await api.post('/checkout/quote', orderData);
  return response.data;
};

export const fetchShippingRegions = async () => {
  const response = await api.get('/shipping/regions');
  return response.data;
};

export const fetchMyQRProfiles = async (includeDeleted = false) => {
  const response = await api.get('/qr-profiles', { params: { include_deleted: includeDeleted } });
  return response.data;
};

export const fetchQRCreationPolicy = async () => {
  const response = await api.get('/qr-profiles/creation-policy');
  return response.data;
};

export const createQRProfile = async (profileData) => {
  const response = await api.post('/qr-profiles', profileData);
  return response.data;
};

export const updateQRProfile = async (id, profileData) => {
  const response = await api.put(`/qr-profiles/${id}`, profileData);
  return response.data;
};

export const deleteQRProfile = async (id) => {
  const response = await api.delete(`/qr-profiles/${id}`);
  return response.data;
};

export const updateQRStatus = async (id, status) => {
  const response = await api.patch(`/qr-profiles/${id}/status`, { status });
  return response.data;
};

export const fetchProfileLocations = async (profileId) => {
  const response = await api.get(`/locations/${profileId}`);
  return response.data;
};

export const fetchUserStatistics = async () => {
  const response = await api.get('/statistics/overview');
  return response.data;
};

export const fetchPublicProfile = async (hash) => {
  const response = await axios.get(`${API_BASE}/public/profile/${hash}`);
  return response.data;
};

export const sendLocation = async (hash, lat, lng, userAgent) => {
  const response = await axios.post(`${API_BASE}/public/profile/${hash}/scan`, {
    lat,
    lng,
    user_agent: userAgent,
  });
  return response.data;
};

export const trackPublicProfileVisit = async (hash, payload = {}) => {
  const response = await axios.post(`${API_BASE}/public/profile/${hash}/scan`, payload);
  return response.data;
};

export const trackPublicActionClick = async (hash, payload = {}) => {
  const response = await axios.post(`${API_BASE}/public/profile/${hash}/action-click`, payload);
  return response.data;
};

export const createPublicLead = async (hash, payload = {}) => {
  const response = await axios.post(`${API_BASE}/public/profile/${hash}/lead`, payload);
  return response.data;
};

export const fetchMyOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const fetchMySubscriptions = async () => {
  const response = await api.get('/subscriptions');
  return response.data;
};

export const deleteMySubscription = async (bucketId) => {
  const response = await api.delete(`/subscriptions/${bucketId}`);
  return response.data;
};

export const fetchScanHistory = async (params = {}) => {
  const response = await api.get('/scan-history', { params });
  return response.data;
};

export const fetchMyLeads = async (params = {}) => {
  const response = await api.get('/leads', { params });
  return response.data;
};

export const updateMyLeadStatus = async (leadId, status) => {
  const response = await api.patch(`/leads/${leadId}/status`, { status });
  return response.data;
};

export const downloadMyLeadsCsv = async (params = {}) => {
  const response = await api.get('/leads/export', { params, responseType: 'blob' });
  return response.data;
};

export const fetchCampaignStatistics = async (days = 30) => {
  const response = await api.get('/statistics/campaigns', { params: { days } });
  return response.data;
};

export const fetchExecutiveReport = async (days = 30) => {
  const response = await api.get('/statistics/executive-report', { params: { days } });
  return response.data;
};

export const downloadExecutiveReportPdf = async (days = 30) => {
  const response = await api.get('/statistics/executive-report', {
    params: { days, format: 'pdf' },
    responseType: 'blob',
  });
  return response.data;
};

export const fetchLoyaltySummary = async () => {
  const response = await api.get('/loyalty/summary');
  return response.data;
};

export const redeemLoyaltyPoints = async (points = null) => {
  const response = await api.post('/loyalty/redeem', { points });
  return response.data;
};

export const fetchQRProfileDetails = async (profileId) => {
  const response = await api.get(`/qr-profiles/${profileId}/details`);
  return response.data;
};

export const fetchProfileTypesConfig = async () => {
  const response = await api.get('/profile-types-config', {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
  return response.data;
};

export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/uploads/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadImageFile = async (file, scope = 'general') => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/uploads/image', formData, {
    params: { scope },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const fetchAdminUsers = async (paramsOrSearch = null) => {
  let params = {};
  if (typeof paramsOrSearch === 'string') {
    params = paramsOrSearch ? { search: paramsOrSearch } : {};
  } else if (paramsOrSearch && typeof paramsOrSearch === 'object') {
    params = paramsOrSearch;
  }
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const createAdminUser = async (userData) => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

export const fetchAdminUserDetail = async (userId) => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

export const fetchAdminUserSubscriptions = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/subscriptions`);
  return response.data;
};

export const grantAdminUserSubscription = async (userId, payload) => {
  const response = await api.post(`/admin/users/${userId}/subscriptions/grant`, payload);
  return response.data;
};

export const revokeAdminUserSubscription = async (userId, bucketId) => {
  const response = await api.delete(`/admin/users/${userId}/subscriptions/${bucketId}`);
  return response.data;
};

export const updateAdminUser = async (userId, userData) => {
  const response = await api.put(`/admin/users/${userId}`, userData);
  return response.data;
};

export const updateAdminUserStatus = async (userId, accountStatus) => {
  const response = await api.patch(`/admin/users/${userId}/status`, { account_status: accountStatus });
  return response.data;
};

export const deleteAdminUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const fetchAdminTrash = async (params = {}) => {
  const response = await api.get('/admin/trash', { params });
  return response.data;
};

export const deleteAdminTrashUser = async (userId) => {
  const response = await api.delete(`/admin/trash/users/${userId}`);
  return response.data;
};

export const deleteAdminTrashQRProfile = async (profileId) => {
  const response = await api.delete(`/admin/trash/qr-profiles/${profileId}`);
  return response.data;
};

export const deleteAdminTrashProduct = async (productId) => {
  const response = await api.delete(`/admin/trash/products/${productId}`);
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/account/profile', profileData);
  return response.data;
};

export const updateMyPassword = async (newPassword) => {
  const response = await api.put('/account/password', { new_password: newPassword });
  return response.data;
};

export const fetchMySubaccounts = async () => {
  const response = await api.get('/subaccounts');
  return response.data;
};

export const createSubaccount = async (subaccountData) => {
  const response = await api.post('/subaccounts', subaccountData);
  return response.data;
};

export const updateSubaccount = async (subaccountId, subaccountData) => {
  const response = await api.put(`/subaccounts/${subaccountId}`, subaccountData);
  return response.data;
};

export const updateSubaccountStatus = async (subaccountId, accountStatus) => {
  const response = await api.patch(`/subaccounts/${subaccountId}/status`, { account_status: accountStatus });
  return response.data;
};

export const deleteSubaccount = async (subaccountId) => {
  const response = await api.delete(`/subaccounts/${subaccountId}`);
  return response.data;
};

export const fetchAdminQRProfiles = async (params = {}) => {
  const response = await api.get('/admin/qr-profiles', { params });
  return response.data;
};

export const createAdminQRProfile = async (profileData) => {
  const response = await api.post('/admin/qr-profiles', profileData);
  return response.data;
};

export const updateAdminQRProfile = async (id, profileData) => {
  const response = await api.put(`/admin/qr-profiles/${id}`, profileData);
  return response.data;
};

export const reassignAdminQRProfile = async (id, newUserId) => {
  const response = await api.patch(`/admin/qr-profiles/${id}/reassign`, { new_user_id: newUserId });
  return response.data;
};

export const deleteAdminQRProfile = async (id) => {
  const response = await api.delete(`/admin/qr-profiles/${id}`);
  return response.data;
};

export const fetchAdminScans = async (params = {}) => {
  const response = await api.get('/admin/scans', { params });
  return response.data;
};

export const fetchAdminAnalytics = async () => {
  const response = await api.get('/admin/analytics');
  return response.data;
};

export const fetchAdminLeads = async (params = {}) => {
  const response = await api.get('/admin/leads', { params });
  return response.data;
};

export const updateAdminLeadStatus = async (leadId, status) => {
  const response = await api.patch(`/admin/leads/${leadId}/status`, { status });
  return response.data;
};

export const downloadAdminLeadsCsv = async (params = {}) => {
  const response = await api.get('/admin/leads/export', { params, responseType: 'blob' });
  return response.data;
};

export const adminUpdateQRStatus = async (id, status) => {
  const response = await api.patch(`/admin/qr-profiles/${id}/status`, { status });
  return response.data;
};

export const fetchAdminSettings = async () => {
  const response = await api.get('/admin/settings');
  return response.data;
};

export const updateAdminSettings = async (settingsData) => {
  const response = await api.put('/admin/settings', settingsData);
  return response.data;
};

export const fetchAdminStoreProducts = async (params = {}) => {
  const response = await api.get('/admin/store/products', { params });
  return response.data;
};

export const createAdminStoreProduct = async (productData) => {
  const response = await api.post('/admin/store/products', productData);
  return response.data;
};

export const updateAdminStoreProduct = async (productId, productData) => {
  const response = await api.put(`/admin/store/products/${productId}`, productData);
  return response.data;
};

export const deleteAdminStoreProduct = async (productId, hardDelete = false) => {
  const response = await api.delete(`/admin/store/products/${productId}`, { params: hardDelete ? { hard_delete: true } : {} });
  return response.data;
};

export const fetchAdminCoupons = async (params = {}) => {
  const response = await api.get('/admin/store/coupons', { params });
  return response.data;
};

export const createAdminCoupon = async (couponData) => {
  const response = await api.post('/admin/store/coupons', couponData);
  return response.data;
};

export const updateAdminCoupon = async (couponCode, couponData) => {
  const response = await api.put(`/admin/store/coupons/${couponCode}`, couponData);
  return response.data;
};

export const deleteAdminCoupon = async (couponCode) => {
  const response = await api.delete(`/admin/store/coupons/${couponCode}`);
  return response.data;
};

export const seedFreeCoupon = async () => {
  const response = await api.post('/admin/store/coupons/seed-free');
  return response.data;
};

export const seedFreeCouponFromSettings = async () => {
  const response = await api.post('/admin/settings/seed-free-coupon');
  return response.data;
};
