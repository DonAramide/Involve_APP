require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const supabaseKey = process.env.STAGING_SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setCode() {
  const { data, error } = await supabase
    .from('verification_codes')
    .update({ code: '$2b$10$.as3AkqZygLXcWjGyc1vYOMegu2i8TC0fgsupmM1HgHwERbP1MzkG' })
    .eq('email', 'aramyde777@gmail.com')
    .eq('status', 'PENDING');

  if (error) {
    console.error('Error updating code:', error);
  } else {
    console.log('OTP forced to 123456');
  }
}

setCode();
