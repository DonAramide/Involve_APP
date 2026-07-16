export interface ApiRegistryEntry {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  cacheTTL: number;
}
export const ApiRegistry: Record<string, ApiRegistryEntry> = {};
