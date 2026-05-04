// src/integrations/quasar/factory.ts
import { supabase } from "../../db/supabase";
import { QuasarService } from "./quasar.service";

/**
 * Factory function to retrieve a correctly initialized QuasarService for a specific tenant.
 * RULE: ALWAYS resolve tenantApiKey per request. NEVER use a global API key.
 */
export const getQuasarService = async (tenantId: string): Promise<QuasarService> => {
  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('quasar_api_key, quasar_tenant_id, quasar_webhook_secret')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error fetching tenant: ${error.message}`);
    }

    if (!tenant || !tenant.quasar_api_key) {
      throw new Error(`Tenant ${tenantId} does not have a Quasar API key configured.`);
    }

    // Resolve the tenant's API key (Decryption logic should be applied here if encrypted)
    const decryptedKey = tenant.quasar_api_key; 

    // Return the instance, optionally passing the Quasar-specific Tenant ID if needed by SDK
    const service = new QuasarService(decryptedKey, tenant.quasar_webhook_secret);
    
    return service;
  } catch (error: any) {
    console.error(`[Quasar Factory] Multi-tenant resolution failed for ${tenantId}:`, error.message);
    throw error;
  }
};
