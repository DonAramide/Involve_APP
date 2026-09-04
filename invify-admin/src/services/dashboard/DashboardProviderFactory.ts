import type { DashboardDataProvider } from './DashboardDataProvider';

import { StagingDashboardProvider } from './StagingDashboardProvider';
import { ProdDashboardProvider } from './ProdDashboardProvider';
import { getBuildVariant, BuildVariant } from '../../config/buildVariant';

export class DashboardProviderFactory {
  private static instance: DashboardDataProvider | null = null;

  static getInstance(): DashboardDataProvider {
    if (!this.instance) {
      let variant: BuildVariant = BuildVariant.STAGING
      try {
        variant = getBuildVariant()
      } catch {
        variant = BuildVariant.STAGING
      }

      this.instance =
        variant === BuildVariant.PROD
          ? new ProdDashboardProvider()
          : new StagingDashboardProvider()
      console.log(`[DashboardProviderFactory] Initialized provider for variant: ${variant}`)
    }

    return this.instance
  }
}
