export enum EventPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

export interface EnterpriseEventV1<T = any> {
  eventId: string;
  event: string;
  version: 1;
  timestamp: string;
  sequenceNumber: number;
  correlationId: string;
  causationId?: string;
  requestId?: string;
  tenantId: string;
  priority?: EventPriority; // Added for Governance Congestion Control
  payload: T;
}
