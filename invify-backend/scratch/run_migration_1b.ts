import { Client } from 'pg';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REF = 'rpcjelhacmkhzguljdgi';
const SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';

const POOLER_ENDPOINTS = [
  `aws-0-eu-west-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-ap-southeast-1.pooler.supabase.com`,
];

async function tryConnect(host: string): Promise<Client | null> {
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log(`Connected via pooler: ${host}`);
    return client;
  } catch (err: any) {
    console.log(`  Failed ${host}: ${err.message}`);
    await client.end().catch(() => {});
    return null;
  }
}

async function run() {
  console.log('=== RUNNING PHASE 1B MIGRATION (Pooler) ===\n');

  let client: Client | null = null;
  for (const host of POOLER_ENDPOINTS) {
    client = await tryConnect(host);
    if (client) break;
  }

  if (!client) {
    console.error('Could not connect to any Supabase pooler endpoint.');
    process.exit(1);
  }

  try {
    const sqlPath = 'C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e/staging_ledger_migration.sql';
    console.log(`Reading SQL from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Executing DDL SQL statements...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
