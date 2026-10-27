import api from './index'

export const schoolIdCardsApi = {
  templates: () => api.get('/api/school/id-cards/templates'),
  settings: () => api.get('/api/school/id-cards/settings'),
  saveSettings: (settings) => api.put('/api/school/id-cards/settings', settings),
  eligible: () => api.get('/api/school/id-cards/eligible'),
  cards: () => api.get('/api/school/id-cards'),
  preview: (subjectType, subjectId) => api.get('/api/school/id-cards/preview', { params: { subjectType, subjectId } }),
  issue: (subjectType, subjectId) => api.post('/api/school/id-cards/issue', { subjectType, subjectId }),
  replace: (cardId) => api.post(`/api/school/id-cards/${cardId}/replace`),
  revoke: (cardId, reason) => api.post(`/api/school/id-cards/${cardId}/revoke`, { reason }),
  batch: (people) => api.post('/api/school/id-cards/batch', { people }),
  signature: () => api.post('/api/school/id-cards/signature', {})
}
