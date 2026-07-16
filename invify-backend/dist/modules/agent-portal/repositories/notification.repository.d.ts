export declare class NotificationRepository {
    list(agentId: string, unreadOnly: boolean): Promise<any[]>;
    markRead(id: string): Promise<any>;
}
export declare const notificationRepository: NotificationRepository;
