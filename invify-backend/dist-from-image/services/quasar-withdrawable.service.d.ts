export declare function withTenantWithdrawLock<T>(tenantId: string, task: () => Promise<T>): Promise<T>;
/**
 * Shared card + spent virtual-account pool.
 * Devices upload the settleable slices. Pending and successful payouts reduce it
 * so two devices cannot each take the full amount.
 */
export declare class QuasarWithdrawableService {
    static sync(tenantId: string, credits: any[]): Promise<number>;
    static available(tenantId: string): Promise<number>;
    static publish(tenantId: string, available: number): Promise<void>;
}
