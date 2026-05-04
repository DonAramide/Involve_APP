// backend/src/api/controllers/webhook.controller.js
const crypto = require('crypto');
const { Queue } = require('bullmq');
const { supabase } = require('../../config/supabase');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 };
const webhookQueue = new Queue('webhook-queue', { connection });

/**
 * ⚡ Lightning-Fast Webhook Ingest
 * Pattern: RESPOND IMMEDIATELY after queueing.
 */
async function quaserWebhook(req, res) {
    const signature = req.headers['x-quaser-signature'];
    const { reference } = req.body;
    
    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    try {
        // 1. Resolve Tenant Identity (Do NOT trust payload)
        // Check local transaction anchor for mapping
        let { data: tx } = await supabase
            .from('transactions')
            .select('tenant_id')
            .eq('reference', reference)
            .maybeSingle();

        let tenant_id = tx?.tenant_id || req.headers['x-tenant-id'];
        if (!tenant_id) return res.status(401).send('Identity resolution failed');

        // 2. Perform Quick Security Signature verification
        const { data: tenant } = await supabase
            .from('invify_tenants')
            .select('webhook_secret')
            .eq('id', tenant_id)
            .single();

        if (!tenant) return res.status(401).send('Tenant not identified');

        const expectedSignature = crypto
            .createHmac('sha256', tenant.webhook_secret)
            .update(req.rawBody)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).send('Invalid signature');
        }

        // 3. Queue for Idempotent processing
        // DO NOT AWAIT full worker processing - Return 202 immediately.
        webhookQueue.add('process-quaser-payment', {
            tenant_id,
            provider: 'quaser',
            payload: req.body,
            reference
        });

        // FAST RETURN (Standard fintech best practice)
        return res.status(202).json({ message: 'Accepted for processing' });
    } catch (err) {
        console.error('[Webhook] Ingest Error:', err.message);
        return res.status(500).send();
    }
}

async function monnifyWebhook(req, res) {
    // Placeholder for Monnify webhook logic
    return res.status(200).send('Event received');
}

module.exports = { quaserWebhook, monnifyWebhook };
