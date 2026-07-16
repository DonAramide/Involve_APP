require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const supabaseKey = process.env.STAGING_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getCode() {
  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('email', 'aramyde777@gmail.com')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching code:', error);
  } else {
    console.log('OTP Data:', data);
  }
}

getCode();
