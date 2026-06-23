import axios from 'axios'

// Detect API base URL based on environment
const getAPIBase = () => {
  // In Docker, use service name; locally use localhost
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  return isDev ? 'http://localhost:8000' : 'http://flag_platform_api:8000'
}

const API_BASE = getAPIBase()
const ECOMMERCE_BASE = 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Feature Flag APIs
export const flagAPI = {
  getAll: () => api.get('/api/v1/flags'),
  create: (data) => api.post('/api/v1/flags', data),
  getByKey: (key) => api.get(`/api/v1/flags/${key}`),
  update: (key, data) => api.put(`/api/v1/flags/${key}`, data),
  delete: (key) => api.delete(`/api/v1/flags/${key}`),
  getVersions: (key) => api.get(`/api/v1/flags/${key}/versions`),
  rollback: (key, versionId, reason) =>
    api.post(`/api/v1/flags/${key}/rollback`, {
      version_id: versionId,
      reason,
    }),
}

// SDK APIs
export const sdkAPI = {
  getAllFlags: () => api.get('/sdk/flags'),
  evaluate: (flagKey, userId) =>
    api.get('/sdk/evaluate', { params: { flag_key: flagKey, user_id: userId } }),
}

// Ecommerce Status
export const ecommerceAPI = {
  getCheckoutStatus: (userId, flagKey) =>
    axios.get(`${ECOMMERCE_BASE}/__flags`, { params: { user_id: userId, flag: flagKey } }),
  getFlags: () => axios.get(`${ECOMMERCE_BASE}/__flags`),
}

export default api
