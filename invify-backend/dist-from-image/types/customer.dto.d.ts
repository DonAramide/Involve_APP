export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'BLOCKED' | 'SUSPENDED';
export interface CustomerDTO {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    email?: string;
    status: CustomerStatus;
    balance?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}
export interface CustomerStatisticsDTO {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    newThisMonth: number;
    highValueCustomers: number;
    averageLifetimeValue: number;
    outstandingReceivables: number;
}
export interface CustomerFinanceSummaryDTO {
    walletBalance: number;
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
}
export interface CustomerProfileDTO extends CustomerDTO {
    finance: CustomerFinanceSummaryDTO;
    businessModeProjection: any;
}
export interface CustomerSearchResponseDTO {
    data: CustomerDTO[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}
