/**
 * TRIGGER EXTRACTOR v3 — Supabase pooler connection (no DB password needed)
 * 
 * Supabase transaction pooler accepts the service role key as the password.
 * Connection string format:
 *   postgres://postgres.[PROJECT_REF]:[SERVICE_ROLE_KEY]@aws-0-[REGION].pooler.supabase.com:6543/postgres
 * 
 * Region for iyqmqcohoduofotfjutm must be determined — try us-east-1, eu-west-1, ap-southeast-1
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_REF = 'iyqmqcohoduofotfjutm';
const SERVICE_ROLE_KEY = process.env.SUPABASE_KEY || '';

// Supabase pooler endpoints to try (transaction mode, port 6543)
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

async function runPgQuery(client: Client, sql: string, label: string): Promise<any[]> {
  console.log(`\n[QUERY] ${label}`);
  try {
    const res = await client.query(sql);
    console.log(`  rows: ${res.rowCount}`);
    if (res.rows.length > 0) {
      console.log('  sample:', JSON.stringify(res.rows[0]).substring(0, 400));
    }
    return res.rows;
  } catch (err: any) {
    console.error(`  ERROR: ${err.message}`);
    return [{ error: err.message }];
  }
}

async function run() {
  const output: Record<string, any> = {};
  console.log('=== TRIGGER EXTRACTOR v3 (Pooler) ===\n');

  // Try each pooler region
  let client: Client | null = null;
  for (const host of POOLER_ENDPOINTS) {
    client = await tryConnect(host);
    if (client) break;
  }

  if (!client) {
    console.error('Could not connect to any Supabase pooler endpoint.');
    console.log('Falling back to static analysis of migration files only.');
    output.connection_status = 'FAILED — no pooler endpoint reachable';
    fs.writeFileSync('C:/dev/Involve_APP/invify-backend/scratch/live_trigger_definitions.json', JSON.stringify(output, null, 2));
    return;
  }

  output.connection_status = 'SUCCESS';

  try {
    // 1. commission_events full column schema
    output.commission_events_columns = await runPgQuery(client, `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'commission_events'
      ORDER BY ordinal_position;
    `, 'commission_events schema (is_nullable per column)');

    // 2. plan_id NOT NULL check via pg_attribute
    output.plan_id_attnotnull = await runPgQuery(client, `
      SELECT a.attname, a.attnotnull, pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'commission_events'
        AND a.attname = 'plan_id' AND a.attnum > 0;
    `, 'commission_events.plan_id NOT NULL status (attnotnull)');

    // 3. All triggers on approval_queue
    output.triggers_on_approval_queue = await runPgQuery(client, `
      SELECT trigger_name, event_manipulation, action_timing, action_statement, action_orientation
      FROM information_schema.triggers
      WHERE event_object_schema = 'public' AND event_object_table = 'approval_queue';
    `, 'All triggers on approval_queue');

    // 4. All triggers in public schema
    output.all_public_triggers = await runPgQuery(client, `
      SELECT trigger_name, event_object_table, event_manipulation, action_timing, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `, 'All triggers in public schema');

    // 5. trg_audit_approval_queue_change definition
    output.fn_trg_audit_approval_queue_change = await runPgQuery(client, `
      SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'trg_audit_approval_queue_change';
    `, 'LIVE DEFINITION: trg_audit_approval_queue_change');

    // 6. process_commission_approval definition
    output.fn_process_commission_approval = await runPgQuery(client, `
      SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'process_commission_approval';
    `, 'LIVE DEFINITION: process_commission_approval');

    // 7. execute_commission_clawback definition
    output.fn_execute_commission_clawback = await runPgQuery(client, `
      SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'execute_commission_clawback';
    `, 'LIVE DEFINITION: execute_commission_clawback');

    // 8. ALL functions touching commission_events
    output.fns_referencing_commission_events = await runPgQuery(client, `
      SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) ILIKE '%commission_events%';
    `, 'All functions referencing commission_events');

    // 9. All FK constraints on commission_events (especially plan_id FK)
    output.commission_events_constraints = await runPgQuery(client, `
      SELECT con.conname AS constraint_name,
             con.contype AS constraint_type,
             pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
      WHERE nsp.nspname = 'public' AND cls.relname = 'commission_events'
      ORDER BY con.contype;
    `, 'All constraints on commission_events');

  } finally {
    await client.end();
  }

  const outPath = 'C:/dev/Involve_APP/invify-backend/scratch/live_trigger_definitions.json';
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('\nAll results written to:', outPath);
}

run().catch(console.error);
