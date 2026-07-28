import { BaseEcsProvider, EcsConfigurationDefinition, EcsHealthStatus } from '../base.provider';
import { ContaboEcsDefinitions } from './schema';
import { validateContaboConfig } from './validator';
import { checkContaboHealth } from './health';

export class ContaboEcsProvider implements BaseEcsProvider {
  public namespace = 'contabo';
  public displayName = 'Contabo Object Storage';
  public description = 'S3-compatible global storage endpoints';
  public supportsSecrets = true;

  metadata() {
    return {
      namespace: this.namespace,
      displayName: this.displayName,
      category: 'Cloud Storage',
      supportsSecrets: this.supportsSecrets,
      supportsHealthChecks: true,
      version: '1.0'
    };
  }

  getDefinitions(): EcsConfigurationDefinition[] {
    return ContaboEcsDefinitions;
  }

  async validate(values: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    return validateContaboConfig(values);
  }

  async healthCheck(resolvedConfig: Record<string, any>): Promise<EcsHealthStatus> {
    return checkContaboHealth(resolvedConfig);
  }

  async migrate(): Promise<void> {
    // Contabo configuration migration logic would go here
    return Promise.resolve();
  }
}

