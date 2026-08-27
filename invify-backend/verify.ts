import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const stagingEnvPath = path.join(__dirname, '.env.staging');
if (fs.existsSync(stagingEnvPath)) {
  dotenv.config({ path: stagingEnvPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SECRET_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing STAGING_SUPABASE_URL or STAGING_SUPABASE_SECRET_KEY in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runChecks() {
  console.log("=== DATABASE CERTIFICATION ===");

  const { data: cases, error: caseErr } = await supabase.from('reconciliation_cases').select('*').limit(10);
  if (caseErr) {
    console.error("FAILED: reconciliation_cases table query error:", caseErr.message);
  } else {
    console.log("PASS: reconciliation_cases table exists. Sample row count:", cases.length);
    if (cases.length > 0) {
      console.log("Sample columns:", Object.keys(cases[0]));
    }
  }

  const { count, error: countErr } = await supabase.from('reconciliation_cases').select('*', { count: 'exact', head: true });
  if (countErr) {
    console.error("FAILED to get row count:", countErr.message);
  } else {
    console.log("Row count validation:", count);
  }

  const { data: timelines, error: tlErr } = await supabase.from('reconciliation_timeline').select('*').limit(1);
  if (tlErr) {
    console.error("FAILED: reconciliation_timeline table query error:", tlErr.message);
  } else {
    console.log("PASS: reconciliation_timeline table exists.");
  }
}

runChecks().catch(console.error);
