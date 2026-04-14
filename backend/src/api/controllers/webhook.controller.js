// backend/src/api/controllers/webhook.controller.js
const crypto = require('crypto');
const { Queue } = require('bullmq');
const { supabase } = require('../../config/supabase');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 };
const webhookQueue = new Queue('webhook-queue', { connection });

/**
 * Fintech-grade Webhook Entry Point
 * Fast ingest, async processing.
 */
async function monnifyWebhook(req, res) {
    const signature = req.headers['monnify-signature'];
    const RAW_KEY = process.env.MONNIFY_SECRET_KEY;

    // 1. Verification (Synchronous)
    const expectedSignature = crypto
        .createHmac('sha512', RAW_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== expectedSignature) return res.status(401).send();

    const { transactionReference, paymentStatus } = req.body;
    if (paymentStatus !== 'PAID') return res.status(200).send();

    try {
        // 2. Initial Idempotency & Log (Supabase)
        // Check if already processed to avoid double queueing
        const { data: existing } = await supabase
            .from('webhook_logs')
            .select('id')
            .eq('external_reference', transactionReference)
            .single();
        
        if (existing) return res.status(200).json({ message: 'Duplicate' });

        // Insert into log as pending
        await supabase.from('webhook_logs').insert([{
            provider: 'monnify',
            external_reference: transactionReference,
            payload: JSON.stringify(req.body),
            status: 'pending'
        }]);

        // 3. Queue for processing
        await webhookQueue.add('process-payment', {
            provider: 'monnify',
            payload: req.body
        });

        // 4. Return 200 immediately
        return res.status(200).send('Queued');
    } catch (err) {
        console.error('Webhook ingest error:', err);
        return res.status(500).send();
    }
}

/**
 * Quaser Webhook Entry Point
 * Signature verification using HMAC SHA256
 */
async function quaserWebhook(req, res) {
    const signature = req.headers['x-quaser-signature'];
    const { schoolId } = req.body.data || {};
    
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId in payload' });

    try {
        // 1. Fetch school secret
        const { data: school, error } = await supabase
            .from('schools')
            .select('webhook_secret')
            .eq('id', schoolId)
            .single();

        if (error || !school) return res.status(404).json({ error: 'School not found' });

        // 2. Verification using Raw Body
        const expectedSignature = crypto
            .createHmac('sha256', school.webhook_secret)
            .update(req.rawBody)
            .digest('hex');


        if (signature !== expectedSignature) return res.status(401).send('Invalid signature');

        const { transactionReference, event } = req.body;
        if (event !== 'payment.success') return res.status(200).send('Ignoring non-success event');

        // 3. Idempotency & Log
        const { data: existing } = await supabase
            .from('webhook_logs')
            .select('id')
            .eq('external_reference', transactionReference)
            .single();
        
        if (existing) return res.status(200).json({ message: 'Duplicate' });

        await supabase.from('webhook_logs').insert([{
            provider: 'quaser',
            external_reference: transactionReference,
            payload: JSON.stringify(req.body),
            status: 'pending'
        }]);

        // 4. Queue for processing
        await webhookQueue.add('process-payment', {
            provider: 'quaser',
            payload: req.body
        });

        return res.status(200).send('Queued');
    } catch (err) {
        console.error('Quaser Webhook error:', err);
        return res.status(500).send();
    }
}

module.exports = { monnifyWebhook, quaserWebhook };
