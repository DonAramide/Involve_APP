export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  capability?: string[];
  businessModes?: string[];
}
export interface NavigationRegistryEntry {
  Sidebar: NavigationItem[];
  TopNavigation: NavigationItem[];
  QuickActions: NavigationItem[];
  FloatingActions: NavigationItem[];
}
export const NavigationRegistry: NavigationRegistryEntry = { Sidebar: [], TopNavigation: [], QuickActions: [], FloatingActions: [] };
