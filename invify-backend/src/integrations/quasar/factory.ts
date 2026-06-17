// src/integrations/quasar/factory.ts
import { QuasarService } from "./quasar.service";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Factory function to retrieve a correctly initialized QuasarService for a specific tenant.
 * RULE: ALWAYS resolve tenantApiKey per request. NEVER use a global API key.
 */
export const getQuasarService = async (tenantId: string): Promise<QuasarService> => {
  try {
    const LOCAL_TENANTS_DB_PATH = path.join(process.cwd(), 'tenants_db.json');
    if (!fs.existsSync(LOCAL_TENANTS_DB_PATH)) {
      throw new Error('Local tenants DB not found');
    }
    const tenants = JSON.parse(fs.readFileSync(LOCAL_TENANTS_DB_PATH, 'utf-8'));
    const tenant = tenants.find((t: any) => t.id === tenantId);

    if (!tenant) {
      throw new Error(`Database error fetching tenant`);
    }

    if (!tenant.quasar || !tenant.quasar.sk_secret) {
      throw new Error(`Tenant ${tenantId} does not have a Quasar API key configured.`);
    }

    const decryptedKey = tenant.quasar.sk_secret; 
    
    // We only need the key to init QuasarService
    const service = new QuasarService(decryptedKey, tenant.quasar.webhookSecret || '');
    return service;
  } catch (error: any) {
    console.error(`[Quasar Factory] Multi-tenant resolution failed for ${tenantId}:`, error.message);
    throw error;
  }
};
