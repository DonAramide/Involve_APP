import { HealthContext } from '../types';
export declare class HealthSettingsService {
    /**
     * Get settings for a tenant. If none exist, returns default unconfigured state.
     */
    static getSettings(ctx: HealthContext): Promise<{
        tenantId: string;
        enabled: boolean;
        schoolEnabled: boolean;
        retailEnabled: boolean;
        servicesEnabled: boolean;
        retentionMonths: number;
        isConfigured: boolean;
        enabledAt?: undefined;
    } | {
        tenantId: any;
        enabled: any;
        schoolEnabled: any;
        retailEnabled: any;
        servicesEnabled: any;
        retentionMonths: any;
        enabledAt: any;
        isConfigured: boolean;
    }>;
    /**
     * Configure health settings for a tenant.
     */
    static updateSettings(ctx: HealthContext, updates: {
        enabled?: boolean;
        schoolEnabled?: boolean;
        retailEnabled?: boolean;
        servicesEnabled?: boolean;
        retentionMonths?: number;
    }): Promise<any>;
}
