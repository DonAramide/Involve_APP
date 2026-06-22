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
    console.log("WALLETS TABLE DEFINITION:");
    console.log(JSON.stringify(res.data.definitions.wallets, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
