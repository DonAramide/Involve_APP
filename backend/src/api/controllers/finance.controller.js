const { recordTransaction } = require('../../services/ledger.service');

/**
 * Records a manual payment (Cash, Transfer, POS).
 * Bypasses the webhook system and records directly to the ledger.
 */
async function recordManualPayment(req, res) {
    const { 
        schoolId, 
        studentId, 
        amount, 
        method, 
        reference, 
        note,
        recordedBy 
    } = req.body;

    // Validation
    if (!schoolId || !studentId || !amount || !method) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero' });
    }

    try {
        const result = await recordTransaction({
            school_id: schoolId,
            student_id: studentId,
            amount: parseFloat(amount),
            type: 'payment',
            channel: method.toLowerCase(), // 'cash', 'transfer', 'pos'
            reference: reference || `MAN-${Date.now()}-${studentId.slice(0,4)}`,
            description: `${method.toUpperCase()} Payment recorded manually`,
            recorded_by: recordedBy,
            note: note,
            metadata: { manual: true, source: 'admin_dashboard' }
        });

        if (result.duplicate) {
            return res.status(409).json({ error: 'Duplicate transaction reference' });
        }

        if (result.success) {
            return res.status(201).json(result.entry);
        }

        throw new Error('Transaction failed');
    } catch (err) {
        console.error('Manual Payment Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Applies a manual discount to a student's ledger.
 * [PLACEHOLDER] for full discount approval workflow.
 */
async function applyDiscount(req, res) {
    const { schoolId, studentId, amount, reason, authorizedBy } = req.body;

    if (!schoolId || !studentId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await recordTransaction({
            school_id: schoolId,
            student_id: studentId,
            amount: -Math.abs(parseFloat(amount)), // Discount is a debit from billed fees (effectively a credit to balance)
            type: 'charge', // In this system, 'charge' usually increases debt, BUT if we want to reduce debt, we insert a payment-like entry or negative amount.
            // Wait, if amount is negative, it reduces the student's running balance (e.g. -100 + (-50) = -150). That's more debt.
            // If it's a discount, it should REDUCE debt (make it closer to 0 or positive). So it should be a (+) deposit.
            amount: Math.abs(parseFloat(amount)), 
            type: 'payment', 
            channel: 'system',
            reference: `DISC-${Date.now()}-${studentId.slice(0,4)}`,
            description: `Discount Applied: ${reason || 'Scholarship/Grant'}`,
            recorded_by: authorizedBy,
            metadata: { type: 'discount', reason }
        });

        if (result.success) {
            return res.status(201).json(result.entry);
        }
        throw new Error('Discount application failed');
    } catch (err) {
        console.error('Discount Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { recordManualPayment, applyDiscount };

