export interface ModuleRegistryEntry {
  id: string;
  businessModes: string[];
  subscription: string[];
  permissions: string[];
  widgets: string[];
}
export const ModuleRegistry: Record<string, ModuleRegistryEntry> = {};
