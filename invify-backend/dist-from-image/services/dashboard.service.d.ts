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
        cpu: {
            label: string;
            value: number;
            color: string;
        };
        memory: {
            label: string;
            value: number;
            color: string;
        };
        disk: {
            label: string;
            value: number;
            color: string;
        };
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
    }[] | {
        title: string;
        value: string;
        status: string;
        icon: string;
        color: string;
        action: string;
        badgeBg: string;
    }[]>;
    static getTenantIntelligence(): Promise<{
        id: any;
        name: any;
        revenue: string;
        score: number;
        risk: any;
        growth: any;
        status: any;
        country: any;
        state: any;
        city: any;
        location: any;
        activity24h: number;
    }[]>;
    static getSystemHealth(): Promise<{
        series: {
            name: string;
            data: number[];
        }[];
        options: {
            categories: string[];
        };
    }>;
    static getRecommendations(): Promise<{
        title: string;
        description: string;
        impact: string;
        icon: string;
        color: string;
    }[]>;
    static getInfraChartSeries(): Promise<{
        name: string;
        data: number[];
    }[]>;
}
