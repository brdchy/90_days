import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Создаем базовый экземпляр axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Интерсептор для добавления Basic Auth для админских запросов
apiClient.interceptors.request.use(
  (config) => {
    if (config.requiresAuth) {
      const credentials = btoa('admin:admin')
      config.headers.Authorization = `Basic ${credentials}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient

// API методы
export const api = {
  // Участники
  getParticipants: () => apiClient.get('/api/participants'),
  getParticipant: (userId) => apiClient.get(`/api/participants/${userId}`),
  
  // Отчеты
  getReports: (userId = null) => {
    const params = userId ? { user_id: userId } : {}
    return apiClient.get('/api/reports', { params })
  },
  
  // Статистика
  getUserStats: (userId) => apiClient.get(`/api/stats/${userId}`),
  getCurrentDay: () => apiClient.get('/api/current-day'),
  getBotStatus: () => apiClient.get('/api/admin/bot-status', { requiresAuth: true }),
  getCommunityStats: () => apiClient.get('/api/community/stats'),
  
  // Админские методы
  getAdminStats: () => apiClient.get('/api/admin/stats', { requiresAuth: true }),
  getSettings: () => apiClient.get('/api/admin/settings', { requiresAuth: true }),
  updateSettings: (settings) => apiClient.put('/api/admin/settings', settings, { requiresAuth: true }),
  triggerRemind: () => apiClient.post('/api/admin/remind', {}, { requiresAuth: true }),
  testChat: () => apiClient.post('/api/admin/test-chat', {}, { requiresAuth: true }),
  triggerRemoveInactive: () => apiClient.post('/api/admin/remove-inactive', {}, { requiresAuth: true }),
  
  // Управление участниками
  createParticipant: (participant) => apiClient.post('/api/admin/participants', participant, { requiresAuth: true }),
  updateParticipant: (userId, data) => apiClient.put(`/api/admin/participants/${userId}`, data, { requiresAuth: true }),
  deleteParticipant: (userId) => apiClient.delete(`/api/admin/participants/${userId}`, { requiresAuth: true }),
  
  // Управление отчетами
  createReport: (report) => apiClient.post('/api/admin/reports', report, { requiresAuth: true }),
  updateReport: (userId, day, data) => apiClient.put(`/api/admin/reports/${userId}/${day}`, data, { requiresAuth: true }),
  deleteReport: (userId, day) => apiClient.delete(`/api/admin/reports/${userId}/${day}`, { requiresAuth: true }),
  
  // Экспорт/импорт
  exportData: () => apiClient.get('/api/admin/export', { requiresAuth: true }),
  importData: (data) => apiClient.post('/api/admin/import', data, { requiresAuth: true }),
  
  // Управление днем игры
  setGameDay: (day) => apiClient.post('/api/admin/game-day', { day }, { requiresAuth: true }),
  
  // Методы для участников (с токеном)
  createUserReport: (report, token) => apiClient.post('/api/user/reports', report, {
    params: { token },
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }),
  updateUserReport: (day, report, token) => apiClient.put(`/api/user/reports/${day}`, report, {
    params: { token },
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }),
  updateUserGoals: (goals, token) => apiClient.put('/api/user/goals', { goals }, {
    params: { token },
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }),
  
  // Механизм начала игры
  getGameStartStatus: () => apiClient.get('/api/game/start-status'),
  agreeToStartGame: (userId, token) => apiClient.post('/api/game/agree-start', {
    user_id: userId,
    token: token
  }),
}

