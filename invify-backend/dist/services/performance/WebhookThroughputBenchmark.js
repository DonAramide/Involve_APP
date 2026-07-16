"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookThroughputBenchmark = void 0;
const QueueEngine_1 = require("../queue/QueueEngine");
const LatencyProfiler_1 = require("./LatencyProfiler");
class WebhookThroughputBenchmark {
    /**
     * Enqueues `count` WEBHOOK messages and processes them measuring throughput.
     * Simulates webhook delivery payload with event type and tenant context.
     */
    static async run(count = 200) {
        QueueEngine_1.QueueEngine.registerHandler('WEBHOOK', async (_payload) => {
            // Simulate lightweight webhook validation (no network I/O)
        });
        const ids = [];
        for (let i = 0; i < count; i++) {
            const id = await QueueEngine_1.QueueEngine.enqueue('WEBHOOK', {
                event: 'payment.completed',
                tenantId: `tenant-${(i % 10) + 1}`,
                amount: 5000 + i,
                ref: `REF-WH-${i.toString().padStart(5, '0')}`,
            }, 1);
            ids.push(id);
        }
        const latencySamples = [];
        const start = performance.now();
        const BATCH = 50;
        for (let b = 0; b < ids.length; b += BATCH) {
            const batch = ids.slice(b, b + BATCH);
            await Promise.all(batch.map(async (id) => {
                const t0 = performance.now();
                await QueueEngine_1.QueueEngine.processMessage(id);
                latencySamples.push(parseFloat((performance.now() - t0).toFixed(3)));
            }));
        }
        const elapsedMs = parseFloat((performance.now() - start).toFixed(3));
        const throughput = parseFloat(((count / elapsedMs) * 1000).toFixed(2));
        return {
            messagesProcessed: count,
            elapsedMs,
            throughput,
            latency: LatencyProfiler_1.LatencyProfiler.compute(latencySamples),
        };
    }
}
exports.WebhookThroughputBenchmark = WebhookThroughputBenchmark;
//# sourceMappingURL=WebhookThroughputBenchmark.js.map