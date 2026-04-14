// backend/src/workers/webhook.worker.js
require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const { recordTransaction } = require('../services/ledger.service');
const { allocatePayment } = require('../services/allocation.service');
const { sendPushToUser } = require('../services/notification.service');
const { supabase } = require('../config/supabase');

const connection = { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 };

const webhookQueue = new Queue('webhook-queue', { connection });

const worker = new Worker('webhook-queue', async job => {
    const { provider, payload } = job.data;
    
    // Normalized variables
    let transactionReference, amountPaid, metaData, studentName;

    if (provider === 'quaser') {
        transactionReference = payload.transactionReference;
        amountPaid = payload.data.amount;
        metaData = payload.data; // schoolId, studentId, etc.
        studentName = payload.data.studentName;
    } else {
        // Fallback for Monnify or others
        transactionReference = payload.transactionReference;
        amountPaid = payload.amountPaid;
        metaData = payload.metaData;
        studentName = 'Student'; // Default placeholder
    }

    try {
        // 1. Mark in webhook_logs as processing
        await supabase
            .from('webhook_logs')
            .update({ status: 'processing' })
            .eq('external_reference', transactionReference);

        // 2. Record Ledger Entry (Atomic)
        const ledgerResult = await recordTransaction({
            school_id: metaData.schoolId,
            student_id: metaData.studentId,
            amount: amountPaid,
            type: 'payment',
            channel: 'webhook',
            reference: transactionReference,
            description: `Payment via ${provider}`,
            metadata: payload
        });

        if (ledgerResult.success) {
            // 3. Trigger Allocation Engine
            await allocatePayment(
                ledgerResult.entry.id,
                metaData.studentId,
                metaData.schoolId,
                amountPaid
            );

            // 4. Update Log as Processed
            await supabase
                .from('webhook_logs')
                .update({ status: 'processed', processed_at: new Date() })
                .eq('external_reference', transactionReference);
            
            // 5. Trigger Notification (FCM)
            const { data: admin, error: adminErr } = await supabase
                .from('school_admins')
                .select('user_id')
                .eq('school_id', metaData.schoolId)
                .eq('role', 'principal')
                .single();

            if (!adminErr && admin) {
                await sendPushToUser(admin.user_id, {
                    title: 'New Payment Received',
                    body: `₦${amountPaid.toLocaleString()} from ${studentName}`,
                    data: { schoolId: metaData.schoolId, studentId: metaData.studentId }
                });
            } else {
                console.log(`Could not find principal for school ${metaData.schoolId} to notify.`);
            }
        }
    } catch (err) {
        console.error(`Worker error [${transactionReference}]:`, err);
        throw err; // BullMQ will retry
    }
}, { connection });

module.exports = { webhookQueue };
