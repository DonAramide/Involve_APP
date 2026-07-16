"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedTracer = void 0;
const StructuredLogger_1 = require("./StructuredLogger");
class DistributedTracer {
    static spans = [];
    static getSpans() {
        return this.spans;
    }
    static clearSpans() {
        this.spans = [];
    }
    /**
     * Starts a new span.
     * If a parent span is provided, traceId is inherited, and parentId is populated.
     */
    static startSpan(name, parentSpan) {
        const traceId = parentSpan ? parentSpan.traceId : Math.random().toString(36).substring(2, 18);
        const spanId = Math.random().toString(36).substring(2, 10);
        const parentId = parentSpan ? parentSpan.spanId : null;
        const span = {
            name,
            traceId,
            spanId,
            parentId,
            startTime: Date.now(),
            attributes: {},
            setAttributes(attrs) {
                this.attributes = { ...this.attributes, ...attrs };
            },
            end() {
                this.endTime = Date.now();
                const duration = this.endTime - this.startTime;
                DistributedTracer.spans.push(this);
                StructuredLogger_1.StructuredLogger.info(`Span finished: ${this.name}`, {
                    traceId: this.traceId,
                    spanId: this.spanId,
                    parentId: this.parentId,
                    durationMs: duration,
                    attributes: this.attributes,
                });
            },
        };
        StructuredLogger_1.StructuredLogger.info(`Span started: ${span.name}`, {
            traceId: span.traceId,
            spanId: span.spanId,
            parentId: span.parentId,
        });
        return span;
    }
}
exports.DistributedTracer = DistributedTracer;
//# sourceMappingURL=DistributedTracer.js.map