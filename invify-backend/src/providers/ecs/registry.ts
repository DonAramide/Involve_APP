import { BaseEcsProvider } from './base.provider';
import { QipEcsProvider } from './qip/provider';
import { ContaboEcsProvider } from './contabo/provider';

export class EcsProviderRegistry {
  private static instance: EcsProviderRegistry;
  private providers: Map<string, BaseEcsProvider> = new Map();

  private constructor() {
    this.registerProvider(new QipEcsProvider());
    this.registerProvider(new ContaboEcsProvider());
  }

  public static getInstance(): EcsProviderRegistry {
    if (!EcsProviderRegistry.instance) {
      EcsProviderRegistry.instance = new EcsProviderRegistry();
    }
    return EcsProviderRegistry.instance;
  }

  public registerProvider(provider: BaseEcsProvider) {
    this.providers.set(provider.namespace, provider);
  }

  public getProvider(namespace: string): BaseEcsProvider | undefined {
    return this.providers.get(namespace);
  }

  public getAllProviders(): BaseEcsProvider[] {
    return Array.from(this.providers.values());
  }
}
