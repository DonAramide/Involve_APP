import { BaseEcsProvider } from './base.provider';
export declare class EcsProviderRegistry {
    private static instance;
    private providers;
    private constructor();
    static getInstance(): EcsProviderRegistry;
    registerProvider(provider: BaseEcsProvider): void;
    getProvider(namespace: string): BaseEcsProvider | undefined;
    getAllProviders(): BaseEcsProvider[];
}
