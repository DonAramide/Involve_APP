// backend/src/workers/webhook.worker.js
const { Worker } = require('bullmq');
const LedgerService = require('../services/ledger.service');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 };

/**
 * Hardened Webhook Worker
 * Implements: Retries, Backoff, and Failure Auditing
 */
const worker = new Worker('webhook-queue', async job => {
    const { tenant_id, provider, payload, reference } = job.data;
    
    console.log(`[Worker] Processing reference ${reference} for Tenant ${tenant_id} (Attempt ${job.attemptsMade + 1})`);

    try {
        // 1. Data Mapping
        const amount = payload.data?.amount || payload.amount;
        const status = (payload.event === 'payment.success') ? 'succeeded' : 'failed';

        // 2. Hardened Upsert (SELECT FOR UPDATE logic is inside service)
        const result = await LedgerService.upsertLedgerEntry({
            tenant_id,
            reference,
            provider,
            type: 'credit',
            amount,
            status,
            source: 'quasar',
            metadata: { ...payload, job_id: job.id }
        });

        if (!result.success) {
            // If the error is a provider mismatch, do NOT retry. It's a terminal logic error.
            if (result.error.includes('Provider mismatch')) {
                console.error(`[Worker] Terminal Error: ${result.error}`);
                await job.discard(); // Do not retry
                return;
            }
            throw new Error(result.error);
        }

        console.log(`[Worker] Success for reference ${reference}`);
    } catch (err) {
        console.error(`[Worker] Error for reference ${reference}:`, err.message);
        throw err; // BullMQ retries based on worker configuration
    }
}, { 
    connection,
    settings: {
        backoffStrategies: {
            exponential: (attempts) => Math.pow(2, attempts) * 1000 // 2s, 4s, 8s, 16s...
        }
    }
});

// Final Failure Auditing
worker.on('failed', async (job, err) => {
    console.error(`[Worker] Critical Failure for job ${job.id} after ${job.attemptsMade} attempts: ${err.message}`);
    // Here we would ideally notify engineers via Slack/Datadog
});

module.exports = { worker };
