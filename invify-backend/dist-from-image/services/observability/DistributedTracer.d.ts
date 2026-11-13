export interface Span {
    name: string;
    traceId: string;
    spanId: string;
    parentId: string | null;
    startTime: number;
    endTime?: number;
    attributes: Record<string, any>;
    setAttributes(attrs: Record<string, any>): void;
    end(): void;
}
export declare class DistributedTracer {
    private static spans;
    static getSpans(): Span[];
    static clearSpans(): void;
    /**
     * Starts a new span.
     * If a parent span is provided, traceId is inherited, and parentId is populated.
     */
    static startSpan(name: string, parentSpan?: Span | null): Span;
}
