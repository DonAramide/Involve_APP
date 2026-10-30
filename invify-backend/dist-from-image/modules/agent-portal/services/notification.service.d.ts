export declare class NotificationService {
    list(agentId: string, unreadOnly: boolean): Promise<any[]>;
    markRead(id: string): Promise<any>;
}
export declare const notificationService: NotificationService;
