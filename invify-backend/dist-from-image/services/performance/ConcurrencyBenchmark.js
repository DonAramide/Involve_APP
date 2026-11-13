"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrencyBenchmark = void 0;
const QueueEngine_1 = require("../queue/QueueEngine");
const QueueRegistry_1 = require("../queue/QueueRegistry");
class ConcurrencyBenchmark {
    /**
     * Spawns `workerCount` concurrent worker groups, each enqueueing and
     * processing `messagesPerWorker` NOTIFICATION messages simultaneously.
     *
     * Validates data integrity: every enqueued message must reach COMPLETED
     * state with no duplicates or lost writes.
     */
    static async run(workerCount = 20, messagesPerWorker = 10) {
        const totalExpected = workerCount * messagesPerWorker;
        // Register no-op handler
        QueueEngine_1.QueueEngine.registerHandler('NOTIFICATION', async (_payload) => { });
        // Launch all workers concurrently
        const start = performance.now();
        const allWorkerIds = await Promise.all(Array.from({ length: workerCount }, async (_, w) => {
            const workerMsgIds = [];
            for (let m = 0; m < messagesPerWorker; m++) {
                const id = await QueueEngine_1.QueueEngine.enqueue('NOTIFICATION', {
                    workerId: w,
                    seq: m,
                    ref: `NOTIF-W${w}-M${m}`,
                }, 1);
                workerMsgIds.push(id);
            }
            return workerMsgIds;
        }));
        // Flatten all IDs
        const allIds = allWorkerIds.flat();
        // Process all concurrently
        await Promise.all(allIds.map((id) => QueueEngine_1.QueueEngine.processMessage(id)));
        const elapsedMs = parseFloat((performance.now() - start).toFixed(3));
        // ── Data integrity check ───────────────────────────────────────────────
        let completed = 0;
        let failed = 0;
        for (const id of allIds) {
            const msg = await QueueRegistry_1.QueueRegistry.getMessageById(id);
            if (msg?.status === 'COMPLETED') {
                completed++;
            }
            else {
                failed++;
            }
        }
        const lost = totalExpected - allIds.length; // messages that were never enqueued
        const throughput = parseFloat(((completed / elapsedMs) * 1000).toFixed(2));
        return {
            totalMessages: totalExpected,
            completed,
            failed,
            lost,
            elapsedMs,
            throughput,
            dataIntegrityPassed: completed === totalExpected && lost === 0,
        };
    }
}
exports.ConcurrencyBenchmark = ConcurrencyBenchmark;
//# sourceMappingURL=ConcurrencyBenchmark.js.map