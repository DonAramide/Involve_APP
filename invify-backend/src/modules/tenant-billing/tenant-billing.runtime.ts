import { MemoryTenantBillingStore, TenantBillingService } from './tenant-billing.service';
import { SupabaseTenantBillingStore } from './tenant-billing.supabase-store';

let singleton: TenantBillingService | null = null;

function supabaseUrl(): string {
  return process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

export function shouldUseSupabaseBillingStore(): boolean {
  const url = supabaseUrl();
  if (url.includes('jjixrywfnaijvahmvcwj')) return false;
  if (process.env.TENANT_BILLING_STORE === 'memory') return false;
  if (process.env.TENANT_BILLING_STORE === 'supabase') {
    return url.includes('rpcjelhacmkhzguljdgi');
  }
  const env = process.env.APP_ENV || process.env.NODE_ENV || '';
  return env === 'staging' && url.includes('rpcjelhacmkhzguljdgi');
}

export function getTenantBillingService(): TenantBillingService {
  if (!singleton) {
    const store = shouldUseSupabaseBillingStore()
      ? new SupabaseTenantBillingStore()
      : new MemoryTenantBillingStore();
    singleton = new TenantBillingService(store);
  }
  return singleton;
}

export function resetTenantBillingServiceForTests(): TenantBillingService {
  singleton = new TenantBillingService(new MemoryTenantBillingStore());
  return singleton;
}
