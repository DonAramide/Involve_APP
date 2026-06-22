import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REF = 'rpcjelhacmkhzguljdgi';
const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || '';

async function run() {
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  
  try {
    console.log('Connecting to db.' + PROJECT_REF + '.supabase.co:6543...');
    await client.connect();
    console.log('✅ Connected successfully!');
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch(console.error);
