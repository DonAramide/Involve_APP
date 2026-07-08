import { StructuredLogger } from './StructuredLogger';

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

export class DistributedTracer {
  private static spans: Span[] = [];

  static getSpans(): Span[] {
    return this.spans;
  }

  static clearSpans() {
    this.spans = [];
  }

  /**
   * Starts a new span.
   * If a parent span is provided, traceId is inherited, and parentId is populated.
   */
  static startSpan(name: string, parentSpan?: Span | null): Span {
    const traceId = parentSpan ? parentSpan.traceId : Math.random().toString(36).substring(2, 18);
    const spanId = Math.random().toString(36).substring(2, 10);
    const parentId = parentSpan ? parentSpan.spanId : null;

    const span: Span = {
      name,
      traceId,
      spanId,
      parentId,
      startTime: Date.now(),
      attributes: {},
      setAttributes(attrs: Record<string, any>) {
        this.attributes = { ...this.attributes, ...attrs };
      },
      end() {
        this.endTime = Date.now();
        const duration = this.endTime - this.startTime;
        DistributedTracer.spans.push(this);

        StructuredLogger.info(`Span finished: ${this.name}`, {
          traceId: this.traceId,
          spanId: this.spanId,
          parentId: this.parentId,
          durationMs: duration,
          attributes: this.attributes,
        });
      },
    };

    StructuredLogger.info(`Span started: ${span.name}`, {
      traceId: span.traceId,
      spanId: span.spanId,
      parentId: span.parentId,
    });

    return span;
  }
}
