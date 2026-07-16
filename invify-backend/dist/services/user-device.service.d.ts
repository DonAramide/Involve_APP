interface UserDeviceRecord {
    id: string;
    user_id: string;
    email: string;
    device_id: string;
    device_name: string;
    status: 'approved' | 'pending' | 'blocked';
    ip_address?: string;
    user_agent?: string;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    approved_by?: string;
}
export declare class UserDeviceService {
    static getDevices(filters?: {
        status?: string;
        search?: string;
        page?: string;
        limit?: string;
    }): Promise<{
        data: UserDeviceRecord[];
        total: number;
    }>;
    static registerDevice(params: {
        userId: string;
        email: string;
        deviceId: string;
        deviceName?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<UserDeviceRecord>;
    static verifyDevice(userId: string, deviceId: string, email: string, context?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        isApproved: boolean;
        record: UserDeviceRecord;
    }>;
    static approveDevice(id: string, approvedBy: string): Promise<boolean>;
    static blockDevice(id: string, blockedBy: string): Promise<boolean>;
}
export {};
