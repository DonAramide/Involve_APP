export class EventDispatcher {
  private static listeners: Record<string, Function[]> = {};

  static subscribe(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  static publish(event: string, payload: any) {
    console.log(`[EventDispatcher] Emitting event: ${event}`, payload);
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(payload));
  }
}
