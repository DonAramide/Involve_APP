// backend/src/api/controllers/student.controller.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Creates a new student and generates a virtual account placeholder.
 */
async function createStudent(req, res) {
    const { schoolId, firstName, lastName, admissionNumber, currentClass } = req.body;

    try {
        const { data: student, error } = await supabase
            .from('students')
            .insert([{
                school_id: schoolId,
                first_name: firstName,
                last_name: lastName,
                admission_number: admissionNumber,
                current_class: currentClass
            }])
            .select()
            .single();

        if (error) throw error;

        // In a real scenario, you'd call Monnify/Paystack API here to reserve a static virtual account
        // For this demo, we mock it.
        await supabase.from('virtual_accounts').insert([{
            student_id: student.id,
            account_number: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
            bank_name: 'Wema Bank',
            provider: 'monnify',
            reference: `REF-${student.id}`
        }]);

        return res.status(201).json(student);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Aggregates analytics for the dashboard.
 */
async function getDashboardAnalytics(req, res) {
    const { schoolId } = req.query;

    if (!schoolId) return res.status(400).json({ error: 'schoolId is required' });

    try {
        const { data, error } = await supabase.rpc('get_school_financial_summary', { 
            p_school_id: schoolId 
        });

        if (error) throw error;

        return res.status(200).json({
            ...data,
            lastUpdated: new Date()
        });
    } catch (err) {
        console.error('Analytics Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Returns daily revenue for chart visualization.
 */
async function getDailyRevenue(req, res) {
    const { schoolId, days = 30 } = req.query;

    try {
        const { data, error } = await supabase.rpc('get_daily_revenue_agg', {
            p_school_id: schoolId,
            p_days: parseInt(days)
        });

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        console.error('Chart Error:', err);
        return res.status(500).json({ error: err.message });
    }
}


/**
 * Returns global transaction feed for the school.
 */
async function getGlobalTransactions(req, res) {
    const { schoolId, limit = 50, offset = 0 } = req.query;

    try {
        const { data, error } = await supabase
            .from('ledgers')
            .select(`
                *,
                students (
                    first_name,
                    last_name,
                    admission_number
                )
            `)
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Returns financial summary for a specific student.
 */
async function getStudentFinancialSummary(req, res) {
    const { studentId } = req.params;

    try {
        const { data, error } = await supabase.rpc('get_student_financial_summary', { 
            p_student_id: studentId 
        });

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        console.error('Student Summary Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Returns virtual account details for a student.
 */
async function getStudentVirtualAccount(req, res) {
    const { studentId } = req.params;

    try {
        const { data, error } = await supabase
            .from('virtual_accounts')
            .select('*')
            .eq('student_id', studentId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found, which is fine

        return res.status(200).json(data || null);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Returns transaction history for a specific student.
 */
async function getStudentTransactions(req, res) {
    const { studentId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    try {
        const { data, error } = await supabase
            .from('ledgers')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = { 
    createStudent, 
    getDashboardAnalytics, 
    getDailyRevenue, 
    getGlobalTransactions,
    getStudentFinancialSummary,
    getStudentVirtualAccount,
    getStudentTransactions
};

