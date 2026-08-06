import type { DashboardDataProvider } from './DashboardDataProvider';

import { StagingDashboardProvider } from './StagingDashboardProvider';
import { ProdDashboardProvider } from './ProdDashboardProvider';
import { getBuildVariant, BuildVariant } from '../../config/buildVariant';

export class DashboardProviderFactory {
  private static instance: DashboardDataProvider | null = null;

  static getInstance(): DashboardDataProvider {
    if (!this.instance) {
      const variant = getBuildVariant();
      
      switch (variant) {
        case BuildVariant.LOCAL:
          this.instance = new StagingDashboardProvider();
          break;
        case BuildVariant.STAGING:
          this.instance = new StagingDashboardProvider();
          break;
        case BuildVariant.PROD:
          this.instance = new ProdDashboardProvider();
          break;
      }
      console.log(`[DashboardProviderFactory] Initialized provider for variant: ${variant}`);
    }
    
    return this.instance;
  }
}
