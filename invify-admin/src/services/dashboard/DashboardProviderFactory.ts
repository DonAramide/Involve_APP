import type { DashboardDataProvider } from './DashboardDataProvider';
import { MockDashboardProvider } from './MockDashboardProvider';
import { DevDashboardProvider } from './DevDashboardProvider';
import { StagingDashboardProvider } from './StagingDashboardProvider';
import { ProdDashboardProvider } from './ProdDashboardProvider';

export class DashboardProviderFactory {
  private static instance: DashboardDataProvider | null = null;

  static getInstance(): DashboardDataProvider {
    if (!this.instance) {
      const mode = import.meta.env.VITE_DASHBOARD_DATA_MODE;
      
      switch (mode) {
        case 'MOCK':
          this.instance = new MockDashboardProvider();
          break;
        case 'DEV':
          this.instance = new DevDashboardProvider();
          break;
        case 'STAGING':
          this.instance = new StagingDashboardProvider();
          break;
        case 'PROD':
          this.instance = new ProdDashboardProvider();
          break;
        default:
          console.warn(`[DashboardProviderFactory] Unknown or missing VITE_DASHBOARD_DATA_MODE: '${mode}'. Defaulting to MOCK provider for safety.`);
          this.instance = new MockDashboardProvider();
          break;
      }
      console.log(`[DashboardProviderFactory] Initialized provider for mode: ${mode || 'DEFAULT_MOCK'}`);
    }
    
    return this.instance;
  }
}
