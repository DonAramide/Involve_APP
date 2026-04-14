// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Ensure dotenv is loaded if this file is imported early
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.');
    // In a worker, we might want to exit
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
