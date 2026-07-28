import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env'; // Assuming there's a central env config

export interface ProvisionTenantRequest {
  businessName: string;
  email: string;
  environment: 'sandbox' | 'production';
}

export interface ProvisionTenantResponse {
  tenantId: string;
  apiKey: string;
  clientSecret: string;
  webhookSigningSecret: string;
}

export class QuasarAdminClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.QUASAR_ADMIN_API_URL || 'https://admin-api.quasar-finance.internal',
      headers: {
        'Authorization': `Bearer ${env.QUASAR_ADMIN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 seconds timeout for provisioning
    });
  }

  async createTenant(payload: ProvisionTenantRequest): Promise<ProvisionTenantResponse> {
    try {
      const response = await this.client.post('/v1/admin/tenants', payload);
      return response.data;
    } catch (error) {
      // Handle axios errors, throw custom domain error if needed
      console.error('Failed to provision Quasar tenant', error);
      throw new Error('Quasar provisioning failed');
    }
  }

  async rotateCredentials(quasarTenantId: string): Promise<{ apiKey: string; clientSecret: string; webhookSigningSecret: string }> {
    throw new Error('Method not implemented yet');
  }

  async suspendTenant(quasarTenantId: string): Promise<void> {
    throw new Error('Method not implemented yet');
  }

  async reactivateTenant(quasarTenantId: string): Promise<void> {
    throw new Error('Method not implemented yet');
  }

  async deleteTenant(quasarTenantId: string): Promise<void> {
    throw new Error('Method not implemented yet');
  }

  async getHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
