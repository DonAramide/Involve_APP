export type ServiceJobBucket = 'active' | 'ready' | 'other';
export declare function serviceJobStatusBucket(raw: unknown): ServiceJobBucket;
export declare function isMissingRelationError(error: {
    message?: string;
    code?: string;
} | null | undefined): boolean;
