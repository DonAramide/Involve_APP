import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_SERVICE_KEY;

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
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
