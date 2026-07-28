import { api } from 'boot/axios' // Assuming Quasar boot/axios is used

export default {
  /**
   * Fetch the current status of the financial platform for the specified tenant.
   */
  async getStatus(tenantId) {
    return api.get(`/api/v1/tenants/${tenantId}/financial-platform/health`)
  },

  /**
   * Initiate the activation of the financial platform.
   */
  async activate(tenantId) {
    return api.post(`/api/v1/tenants/${tenantId}/financial-platform/activate`)
  },

  /**
   * Test the connection to the Quasar financial platform.
   */
  async testConnection(tenantId) {
    return api.get(`/api/v1/tenants/${tenantId}/financial-platform/health`)
  },

  /**
   * Rotate the API keys/credentials for the Quasar tenant.
   */
  async rotateCredentials(tenantId) {
    return api.post(`/api/v1/tenants/${tenantId}/financial-platform/rotate`)
  },

  /**
   * Fetch the paginated audit history for this tenant's financial platform.
   */
  async getHistory(tenantId, page = 1, limit = 10) {
    return api.get(`/api/v1/tenants/${tenantId}/financial-platform/audit`, { params: { page, limit } })
  },

  /**
   * Initiate the deactivation of the financial platform.
   */
  async deactivate(tenantId, reason) {
    return api.post(`/api/v1/tenants/${tenantId}/financial-platform/deactivate`, { reason })
  }
}

