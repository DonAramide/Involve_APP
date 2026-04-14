// backend/scripts/generate_test_accounts.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Bulk Generate Test Virtual Accounts for all Students
 */
async function generateAll() {
    console.log("🚀 Starting Bulk Virtual Account Generation...");

    try {
        // 1. Fetch all students without virtual accounts
        const { data: students, error: fetchError } = await supabase
            .from('students')
            .select('id, first_name, last_name')
            .not('id', 'in', (
                await supabase.from('virtual_accounts').select('student_id')
            ).data.map(va => va.student_id));

        if (fetchError) throw fetchError;
        if (!students || students.length === 0) {
            console.log("✅ All students already have virtual accounts.");
            return;
        }

        console.log(`📝 Generating accounts for ${students.length} students...`);

        const accounts = students.map(student => ({
            student_id: student.id,
            account_number: `00${Math.floor(10000000 + Math.random() * 90000000)}`,
            bank_name: 'Wema Bank (Test)',
            provider: 'monnify',
            reference: `TEST_REF_${student.id}`
        }));

        const { error: insertError } = await supabase
            .from('virtual_accounts')
            .insert(accounts);

        if (insertError) throw insertError;

        console.log("🎉 Successfully generated test accounts for all students!");
    } catch (err) {
        console.error("❌ Bulk generation failed:", err.message);
    }
}

generateAll();
