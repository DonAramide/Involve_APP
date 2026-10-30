import { BaseEcsProvider, EcsConfigurationDefinition, EcsHealthStatus } from '../base.provider';
export declare class QipEcsProvider implements BaseEcsProvider {
    namespace: string;
    displayName: string;
    description: string;
    supportsSecrets: boolean;
    metadata(): {
        namespace: string;
        displayName: string;
        category: string;
        supportsSecrets: boolean;
        supportsHealthChecks: boolean;
        version: string;
    };
    getDefinitions(): EcsConfigurationDefinition[];
    validate(values: Record<string, any>): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    healthCheck(resolvedConfig: Record<string, any>): Promise<EcsHealthStatus>;
    migrate(): Promise<void>;
}
