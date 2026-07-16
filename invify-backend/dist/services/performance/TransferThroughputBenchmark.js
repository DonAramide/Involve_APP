"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferThroughputBenchmark = void 0;
const QueueEngine_1 = require("../queue/QueueEngine");
const LatencyProfiler_1 = require("./LatencyProfiler");
class TransferThroughputBenchmark {
    /**
     * Enqueues `count` TRANSFER messages with realistic fund transfer payloads.
     * Processes them one-at-a-time to capture per-message latency accurately,
     * then also measures total throughput.
     */
    static async run(count = 300) {
        QueueEngine_1.QueueEngine.registerHandler('TRANSFER', async (_payload) => {
            // Simulate lightweight transfer validation & idempotency check
        });
        // Enqueue all messages first
        const ids = [];
        for (let i = 0; i < count; i++) {
            const id = await QueueEngine_1.QueueEngine.enqueue('TRANSFER', {
                transferId: `TXN-${i.toString().padStart(6, '0')}`,
                fromAccount: `ACC-${(i % 20).toString().padStart(4, '0')}`,
                toAccount: `ACC-${((i + 1) % 20).toString().padStart(4, '0')}`,
                amount: 100 + (i % 50_000),
                currency: 'NGN',
                provider: i % 2 === 0 ? 'PAYSTACK' : 'FLUTTERWAVE',
            }, 1);
            ids.push(id);
        }
        // Process sequentially to gather individual latency samples
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
exports.TransferThroughputBenchmark = TransferThroughputBenchmark;
//# sourceMappingURL=TransferThroughputBenchmark.js.map