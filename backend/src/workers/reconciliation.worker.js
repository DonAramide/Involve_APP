// backend/src/workers/reconciliation.worker.js
const { Worker, Queue } = require('bullmq');
const ReconciliationService = require('../services/reconciliation.service');
const { supabase } = require('../config/supabase');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 };
const activeReconQueue = new Queue('reconciliation-queue', { connection });

/**
 * Tiered Reconciliation Worker
 */
const worker = new Worker('reconciliation-queue', async job => {
    const { tenant_id, tier } = job.data;
    
    if (tenant_id) {
        await ReconciliationService.reconcile(tenant_id, tier || 'recent');
    } else {
        // Broad sweep - find all tenants and queue per tier
        const { data: tenants } = await supabase.from('invify_tenants').select('id');
        for (const t of tenants) {
            await activeReconQueue.add(`recon-${tier}-${t.id}`, { tenant_id: t.id, tier });
        }
    }
}, { connection });

/**
 * Multi-Tiered Scheduler
 * Recent (1h window): 2 mins
 * Daily (24h window): 10 mins
 * Legacy: 60 mins
 */
async function scheduleReconciliation() {
    const repeatable = await activeReconQueue.getRepeatableJobs();
    
    // 1. Tier: Recent (Every 2 mins)
    if (!repeatable.find(j => j.name === 'recon-tier-recent')) {
        await activeReconQueue.add('recon-tier-recent', { tier: 'recent' }, {
            repeat: { pattern: '*/2 * * * *' } 
        });
    }

    // 2. Tier: Daily (Every 10 mins)
    if (!repeatable.find(j => j.name === 'recon-tier-daily')) {
        await activeReconQueue.add('recon-tier-daily', { tier: 'daily' }, {
            repeat: { pattern: '*/10 * * * *' }
        });
    }

    // 3. Tier: Legacy (Every 60 mins)
    if (!repeatable.find(j => j.name === 'recon-tier-legacy')) {
        await activeReconQueue.add('recon-tier-legacy', { tier: 'legacy' }, {
            repeat: { pattern: '0 * * * *' }
        });
    }

    console.log('[Recon Worker] Multi-tiered reconciliation strategy active.');
}

module.exports = { worker, scheduleReconciliation };
