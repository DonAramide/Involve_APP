export declare class EventDispatcher {
    private static listeners;
    static subscribe(event: string, callback: Function): void;
    static publish(event: string, payload: any): void;
}
