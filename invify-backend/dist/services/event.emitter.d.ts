import { EventEmitter as NodeEventEmitter } from 'events';
declare class DomainEventEmitter extends NodeEventEmitter {
    emitEvent<T>(topic: string, tenantId: string, payload: T): void;
}
export declare const eventEmitter: DomainEventEmitter;
export {};
