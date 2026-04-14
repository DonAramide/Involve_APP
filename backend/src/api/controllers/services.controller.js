const { supabase } = require('../../config/supabase');

/**
 * Syncs jobs from the device to the cloud.
 * Follows "Last Write Wins" based on updated_at.
 */
async function syncJobs(req, res) {
    const { jobs } = req.body;
    const schoolId = req.headers['x-tenant-id'];

    if (!jobs || !Array.isArray(jobs)) {
        return res.status(400).json({ error: 'invalid jobs batch' });
    }

    try {
        const results = [];
        for (const job of jobs) {
            const { data: existing, error: fetchError } = await supabase
                .from('services_jobs')
                .select('updated_at')
                .eq('id', job.id)
                .single();

            // If it doesn't exist, or the incoming one is newer
            if (!existing || new Date(job.updated_at) > new Date(existing.updated_at)) {
                const { error: upsertError } = await supabase
                    .from('services_jobs')
                    .upsert({
                        ...job,
                        school_id: schoolId
                    });
                
                if (upsertError) throw upsertError;
                results.push({ id: job.id, status: 'synced' });
            } else {
                results.push({ id: job.id, status: 'ignored (stale)' });
            }
        }
        res.json({ success: true, results });
    } catch (err) {
        console.error('Sync Jobs Error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Syncs payments.
 */
async function syncPayments(req, res) {
    const { payments } = req.body;
    const schoolId = req.headers['x-tenant-id'];

    try {
        const { error } = await supabase
            .from('services_payments')
            .upsert(payments.map(p => ({ ...p, school_id: schoolId })));

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Sync Payments Error:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Syncs customers.
 */
async function syncCustomers(req, res) {
    const { customers } = req.body;
    const schoolId = req.headers['x-tenant-id'];

    try {
        const { error } = await supabase
            .from('services_customers')
            .upsert(customers.map(c => ({ ...c, school_id: schoolId })));

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Sync Customers Error:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    syncJobs,
    syncPayments,
    syncCustomers
};
