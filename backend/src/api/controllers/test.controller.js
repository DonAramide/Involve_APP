// backend/src/api/controllers/test.controller.js
const crypto = require('crypto');
const axios = require('axios');

/**
 * Internal Mock Webhook Trigger
 * Simulates a provider (Monnify/Paystack) sending a payment notification.
 */
async function triggerMockWebhook(req, res) {
    const { studentId, amount, schoolId, categoryId } = req.body;

    if (!studentId || !amount || !schoolId) {
        return res.status(400).json({ error: 'Missing required test parameters' });
    }

    const payload = {
        transactionReference: `TEST_TXN_${Date.now()}`,
        paymentReference: `PAY_REF_${Math.floor(Math.random() * 1000000)}`,
        amountPaid: parseFloat(amount),
        totalAmountPaid: parseFloat(amount),
        paymentStatus: 'PAID',
        paymentDescription: 'Test School Fee Payment',
        paidAt: new Date().toISOString(),
        paymentSource: 'TEST_SUITE',
        metaData: {
            schoolId,
            studentId,
            categoryId: categoryId || 'DEFAULT_CAT'
        }
    };

    // Use the secret from .env to sign it so the real webhook controller accepts it
    const secret = process.env.MONNIFY_SECRET_KEY;
    const signature = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

    try {
        // Post to our own public webhook endpoint
        const webhookUrl = `http://localhost:${process.env.PORT || 3000}/api/webhooks/monnify`;
        const response = await axios.post(webhookUrl, payload, {
            headers: { 'monnify-signature': signature }
        });

        return res.status(200).json({ 
            message: 'Mock webhook triggered successfully',
            status: response.status,
            payload 
        });
    } catch (err) {
        console.error('Mock webhook error:', err);
        return res.status(500).json({ 
            error: 'Failed to trigger mock webhook',
            details: err.message 
        });
    }
}

module.exports = { triggerMockWebhook };
