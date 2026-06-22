const axios = require('axios');
require('dotenv').config({ path: 'c:/dev/Involve_APP/invify-backend/.env' });

const url = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const key = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.STAGING_SUPABASE_KEY;

async function run() {
  try {
    const res = await axios.get(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log("--- EXPOSED RPCs ---");
    const paths = Object.keys(res.data.paths || {}).filter(p => p.startsWith('/rpc/'));
    console.log(paths.join('\n'));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
run();
