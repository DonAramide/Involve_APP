import { SyncHandler, SyncEvent } from './registry';
import { supabase } from '../../db/supabase';

export class CustomerCreatedHandler implements SyncHandler {
  async handle(event: SyncEvent, context: { tenantId: string; deviceId?: string }): Promise<void> {
    const payload = event.payload;

    const { error } = await supabase.from('customers').upsert({
      id: payload.syncId || event.aggregateId,
      tenant_id: context.tenantId,
      name: payload.name,
      phone: payload.phone || null,
      address: payload.address || null,
      balance: payload.balance || 0,
      created_at: payload.createdAt || event.createdAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id, tenant_id' });

    if (error) {
      throw new Error(`Customer upsert failed: ${error.message}`);
    }
  }
}
