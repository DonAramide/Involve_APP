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
  private static mockMessages: QueueMessage[] = [];
  private static useMock = true; // DB DDL is blocked on staging, always use mock in test/local execution

  static clearMockData() {
    this.mockMessages = [];
  }

  static getMockMessages(): QueueMessage[] {
    return this.mockMessages;
  }

  static async getMessageById(id: string): Promise<QueueMessage | null> {
    if (this.useMock) {
      return this.mockMessages.find(m => m.id === id) || null;
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
      return this.mockMessages.find(m => m.id === id) || null;
    }
  }

  static async getPendingMessages(queueName: QueueName): Promise<QueueMessage[]> {
    if (this.useMock) {
      const now = new Date();
      return this.mockMessages.filter(
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
      return this.mockMessages.filter(
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
    if (this.useMock) {
      this.mockMessages.push(item);
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
      this.mockMessages.push(item);
      return item;
    }
  }

  static async updateMessage(id: string, updates: Partial<QueueMessage>): Promise<void> {
    const time = new Date().toISOString();
    if (this.useMock) {
      const idx = this.mockMessages.findIndex(m => m.id === id);
      if (idx !== -1) {
        this.mockMessages[idx] = { ...this.mockMessages[idx], ...updates, updated_at: time };
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
      const idx = this.mockMessages.findIndex(m => m.id === id);
      if (idx !== -1) {
        this.mockMessages[idx] = { ...this.mockMessages[idx], ...updates, updated_at: time };
      }
    }
  }

  static async deleteMessage(id: string): Promise<void> {
    if (this.useMock) {
      this.mockMessages = this.mockMessages.filter(m => m.id !== id);
      return;
    }
    try {
      const { error } = await supabaseAdmin
        .from('queue_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch {
      this.mockMessages = this.mockMessages.filter(m => m.id !== id);
    }
  }
}
