import { EnterpriseRealtimeKernel } from './engines/kernel';
import { SupabaseRealtimeProvider } from './providers/supabase.provider';
import { globalEventBus } from './engines/event.bus';

// Initialize the core enterprise realtime infrastructure
const provider = new SupabaseRealtimeProvider();
export const realtimeKernel = new EnterpriseRealtimeKernel(provider);
export const eventBus = globalEventBus;

// Expose strongly typed hooks for Vue components / Stores
export function useEventBus() {
  return eventBus;
}

export function useRealtimeKernel() {
  return realtimeKernel;
}
