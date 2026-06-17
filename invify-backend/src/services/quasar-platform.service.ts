import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const QUASAR_BASE_URL = process.env.QUASAR_BASE_URL || 'http://localhost:4000/api/v1';

export class QuasarPlatformService {
  static getClientCredentials(vertical: string) {
    switch (vertical) {
      case 'invify_school':
        return {
          clientId: process.env.INVIFY_SCHOOL_CLIENT_ID,
          clientSecret: process.env.INVIFY_SCHOOL_CLIENT_SECRET,
        };
      case 'invify_services':
        return {
          clientId: process.env.INVIFY_SERVICES_CLIENT_ID,
          clientSecret: process.env.INVIFY_SERVICES_CLIENT_SECRET,
        };
      case 'invify_retail':
      default:
        return {
          clientId: process.env.INVIFY_RETAIL_CLIENT_ID,
          clientSecret: process.env.INVIFY_RETAIL_CLIENT_SECRET,
        };
    }
  }

  static async provisionTenant(tenant: any): Promise<{ tenantId: string; tenantSlug: string; sk_secret: string } | null> {
    try {
      const vertical = tenant.type === 'school' ? 'invify_school' : (tenant.type === 'services' ? 'invify_services' : 'invify_retail');
      const { clientId, clientSecret } = this.getClientCredentials(vertical);

      if (!clientId || !clientSecret) {
        throw new Error('Missing Quasar Platform Credentials for vertical: ' + vertical);
      }

      // 1. Create Tenant
      const slug = tenant.slug || `tenant-${tenant.id.substring(0, 8)}`;
      const tenantPayload = {
        name: tenant.name,
        slug: slug,
        vertical: vertical,
        defaultCurrency: "NGN"
      };

      const tenantResponse = await axios.post(`${QUASAR_BASE_URL}/integration/platform/tenants`, tenantPayload, {
        headers: {
          'X-Quasar-Client-Id': clientId,
          'X-Quasar-Client-Secret': clientSecret,
          'Content-Type': 'application/json'
        }
      });

      const quasarTenantId = tenantResponse.data?.data?.data?.id || tenantResponse.data?.data?.id;

      if (!quasarTenantId) {
        throw new Error('Failed to extract Quasar Tenant ID from response');
      }

      // 2. Create API Key
      const apiKeyPayload = {
        name: `Invify MPOS - ${tenant.name}`,
        environment: process.env.QUASAR_ENV || 'test'
      };

      const apiKeyResponse = await axios.post(`${QUASAR_BASE_URL}/integration/platform/tenants/${quasarTenantId}/api-keys`, apiKeyPayload, {
        headers: {
          'X-Quasar-Client-Id': clientId,
          'X-Quasar-Client-Secret': clientSecret,
          'Content-Type': 'application/json'
        }
      });

      const sk_secret = apiKeyResponse.data?.data?.secretKey;

      if (!sk_secret) {
        throw new Error('Failed to extract Quasar Secret Key from response');
      }

      return {
        tenantId: quasarTenantId,
        tenantSlug: slug,
        sk_secret: sk_secret
      };
    } catch (error: any) {
      console.error('[QuasarPlatformService] Provisioning failed:', error?.response?.data || error.message);
      return null;
    }
  }
}
