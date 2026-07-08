import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function run() {
  console.log('Loading Phase 3.1 migration SQL...');
  const sqlPath = path.join(__dirname, 'phase_3_1_vault_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`Connecting to database...`);
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    console.log('✅ Connected! Applying Phase 3.1 migration SQL...');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

run().catch(console.error);
