import api from './index'

export const terminalApi = {
  getTablets(params) {
    return api.get('/api/admin/inventory/tablets', { params })
  },
  updateTablet(id, data) {
    return api.patch(`/api/admin/inventory/tablets/${id}`, data)
  },
  getMpos(params) {
    return api.get('/api/admin/inventory/mpos', { params })
  },
  updateMpos(id, data) {
    return api.patch(`/api/admin/inventory/mpos/${id}`, data)
  },
  getPrinters(params) {
    return api.get('/api/admin/inventory/printers', { params })
  },
  updatePrinter(id, data) {
    return api.patch(`/api/admin/inventory/printers/${id}`, data)
  },
  getTids(params) {
    return api.get('/api/admin/inventory/tids', { params })
  },
  updateTid(id, data) {
    return api.patch(`/api/admin/inventory/tids/${id}`, data)
  },
  getAssignments(params) {
    return api.get('/api/admin/inventory/assignments', { params })
  },
  assignHardware(data) {
    return api.post('/api/admin/inventory/assignments', data)
  },
  unassignHardware(id) {
    return api.post(`/api/admin/inventory/assignments/${id}/unassign`)
  },
  getStats() {
    return api.get('/api/terminals/stats')
  },
  getTerminal(id) {
    return api.get(`/api/terminals/${id}`)
  },
  updateTerminal(id, data) {
    return api.patch(`/api/terminals/${id}`, data)
  },
  importTerminals(files, importType) {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('importType', importType)
    return api.post('/api/terminals/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  exportTerminals(filters, format = 'xlsx') {
    return api.post('/api/terminals/export', { filters, format }, {
      responseType: 'blob'
    })
  },
  getAuditLog(params) {
    return api.get('/api/terminals/audit', { params })
  },
  unassignTerminal(id) {
    return api.post('/api/terminals/unassign', { terminalId: id })
  },
  transferTerminal(id, newTenantId) {
    return api.post('/api/terminals/transfer', { terminalId: id, newTenantId })
  },
  suspendTerminal(id, reason) {
    return api.post('/api/terminals/suspend', { terminalId: id, reason })
  }
}
