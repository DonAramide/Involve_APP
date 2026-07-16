export declare class DashboardService {
    static getOverviewKPIs(): Promise<{
        label: string;
        action: string;
        value: any;
        status: string;
        statusBg: string;
        statusColor: string;
        icon: string;
        colorName: string;
        color: string;
        sparkline: string;
        trendUp: boolean;
        trendColor: string;
        comparison: string;
    }[]>;
    static getHardwareResources(): Promise<{
        status: string;
        reason: string;
    }>;
    static getActiveModules(): Promise<{
        name: string;
        icon: string;
        usage: number;
    }[]>;
    static getAlerts(): Promise<any[]>;
    static getGovernance(): Promise<{
        label: any;
        value: any;
        icon: any;
        color: any;
        route: any;
        comparison: any;
        badgeBg: string;
    }[]>;
    static getTenantIntelligence(): Promise<any[]>;
    static getSystemHealth(): Promise<{
        status: string;
        reason: string;
    }>;
    static getRecommendations(): Promise<{
        title: string;
        description: string;
        impact: string;
        icon: string;
        color: string;
    }[]>;
    static getInfraChartSeries(): Promise<{
        status: string;
        reason: string;
    }>;
}
