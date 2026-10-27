import api from './index'

export const schoolGateApi = {
  sessions: (params) => api.get('/api/school/gate/sessions', { params })
}
