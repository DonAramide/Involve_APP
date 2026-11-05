export interface ResponseEnvelope<T> {
    success: boolean;
    data: T | null;
    meta: {
        requestId: string;
        timestamp: string;
        total?: number;
        page?: number;
        pageSize?: number;
        hasMore?: boolean;
        [key: string]: any;
    };
    links?: {
        self: string;
        next?: string;
        prev?: string;
    };
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface DomainEvent<T = any> {
    id: string;
    topic: string;
    tenantId: string;
    timestamp: string;
    payload: T;
}
