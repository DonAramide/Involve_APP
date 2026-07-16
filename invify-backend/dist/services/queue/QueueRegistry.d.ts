export type QueueName = 'WEBHOOK' | 'SETTLEMENT' | 'TRANSFER' | 'NOTIFICATION' | 'RETRY' | 'DLQ' | 'RECOVERY' | 'REPLAY';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export interface QueueMessage {
    id: string;
    queue_name: QueueName;
    payload: string;
    status: QueueStatus;
    attempts: number;
    max_attempts: number;
    next_attempt_at: string;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}
export declare class QueueRegistry {
    private static inMemoryMessages;
    private static useInMemory;
    static clearInMemoryData(): void;
    static getInMemoryMessages(): QueueMessage[];
    static getMessageById(id: string): Promise<QueueMessage | null>;
    static getPendingMessages(queueName: QueueName): Promise<QueueMessage[]>;
    static insertMessage(msg: Partial<QueueMessage>): Promise<QueueMessage>;
    static updateMessage(id: string, updates: Partial<QueueMessage>): Promise<void>;
    static deleteMessage(id: string): Promise<void>;
}
