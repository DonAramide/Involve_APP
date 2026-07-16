import { EnterpriseEventV1 } from '../../../domains/core/events/enterprise.event';

export type EventCallback = (event: EnterpriseEventV1) => void;

export interface RealtimeProvider {
  /** Provider identifier (e.g., 'supabase', 'websocket', 'sse') */
  readonly name: string;
  
  /** Connects to the underlying transport */
  connect(): Promise<void>;
  
  /** Disconnects from the transport */
  disconnect(): Promise<void>;
  
  /** Subscribes to a multiplexed channel */
  subscribe(channel: string, callback: EventCallback): void;
  
  /** Unsubscribes from a channel */
  unsubscribe(channel: string): void;
  
  /** Requests a replay of missed events starting from the given sequence or lastEventId */
  requestReplay(channel: string, lastEventId: string): Promise<void>;

  /** Returns true if currently connected */
  isConnected(): boolean;
}
