// backend/tests/simulate_webhook.js
const axios = require('axios');
const crypto = require('crypto');

/**
 * Simulate a Monnify Webhook event for testing.
 */
async function testWebhook() {
    const payload = {
        transactionReference: "MNFY_TEST_" + Date.now(),
        amountPaid: 50000.00,
        paymentStatus: "PAID",
        paymentDescription: "School Fees Payment",
        customer: {
            email: "student@example.com",
            name: "John Doe"
        },
        metaData: {
            schoolId: "SCHOOL_UUID_HERE",
            studentId: "STUDENT_UUID_HERE",
            categoryId: "FEE_CAT_UUID_HERE"
        }
    };

    const secret = "YOUR_MONNIFY_SECRET_KEY";
    const signature = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

    try {
        const response = await axios.post('http://localhost:3000/api/webhooks/monnify', payload, {
            headers: { 'monnify-signature': signature }
        });
        console.log("Response:", response.data);
    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}

// testWebhook();
