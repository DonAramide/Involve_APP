import { supabaseAdmin } from '../../db/supabase';

export type QueueName = 'WEBHOOK' | 'SETTLEMENT' | 'TRANSFER' | 'NOTIFICATION' | 'RETRY' | 'DLQ' | 'RECOVERY' | 'REPLAY';
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface QueueMessage {
  id: string;
  queue_name: QueueName;
  payload: string; // JSON payload
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export class QueueRegistry {
  private static inMemoryMessages: QueueMessage[] = [];
  // Bypass in-memory in production to enable horizontal scaling and durability.
  private static useInMemory = process.env.NODE_ENV !== 'production';

  static clearInMemoryData() {
    this.inMemoryMessages = [];
  }

  static getInMemoryMessages(): QueueMessage[] {
    return this.inMemoryMessages;
  }

  static async getMessageById(id: string): Promise<QueueMessage | null> {
    if (this.useInMemory) {
      return this.inMemoryMessages.find(m => m.id === id) || null;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('queue_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch {
      return this.inMemoryMessages.find(m => m.id === id) || null;
    }
  }

  static async getPendingMessages(queueName: QueueName): Promise<QueueMessage[]> {
    if (this.useInMemory) {
      const now = new Date();
      return this.inMemoryMessages.filter(
        m => m.queue_name === queueName &&
             m.status === 'PENDING' &&
             now >= new Date(m.next_attempt_at)
      );
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('queue_messages')
        .select('*')
        .eq('queue_name', queueName)
        .eq('status', 'PENDING')
        .lte('next_attempt_at', new Date().toISOString());
      if (error) throw error;
      return data || [];
    } catch {
      const now = new Date();
      return this.inMemoryMessages.filter(
        m => m.queue_name === queueName &&
             m.status === 'PENDING' &&
             now >= new Date(m.next_attempt_at)
      );
    }
  }

  static async insertMessage(msg: Partial<QueueMessage>): Promise<QueueMessage> {
    const item: QueueMessage = {
      id: msg.id || Math.random().toString(36).substring(2),
      queue_name: msg.queue_name!,
      payload: msg.payload || '{}',
      status: msg.status || 'PENDING',
      attempts: msg.attempts !== undefined ? msg.attempts : 0,
      max_attempts: msg.max_attempts !== undefined ? msg.max_attempts : 3,
      next_attempt_at: msg.next_attempt_at || new Date().toISOString(),
      error_message: msg.error_message || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (this.useInMemory) {
      this.inMemoryMessages.push(item);
      return item;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('queue_messages')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch {
      this.inMemoryMessages.push(item);
      return item;
    }
  }

  static async updateMessage(id: string, updates: Partial<QueueMessage>): Promise<void> {
    const time = new Date().toISOString();
    if (this.useInMemory) {
      const idx = this.inMemoryMessages.findIndex(m => m.id === id);
      if (idx !== -1) {
        this.inMemoryMessages[idx] = { ...this.inMemoryMessages[idx], ...updates, updated_at: time };
      }
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('queue_messages')
        .update({ ...updates, updated_at: time })
        .eq('id', id);
      if (error) throw error;
    } catch {
      const idx = this.inMemoryMessages.findIndex(m => m.id === id);
      if (idx !== -1) {
        this.inMemoryMessages[idx] = { ...this.inMemoryMessages[idx], ...updates, updated_at: time };
      }
    }
  }

  static async deleteMessage(id: string): Promise<void> {
    if (this.useInMemory) {
      this.inMemoryMessages = this.inMemoryMessages.filter(m => m.id !== id);
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('queue_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch {
      this.inMemoryMessages = this.inMemoryMessages.filter(m => m.id !== id);
    }
  }
}
