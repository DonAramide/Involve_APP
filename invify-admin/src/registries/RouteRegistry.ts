export interface RouteRegistryEntry {
  path: string;
  workspace: string;
  permission: string[];
  subscription: string[];
  capability: string[];
  preload: string[];
}
export const RouteRegistry: Record<string, RouteRegistryEntry> = {};
