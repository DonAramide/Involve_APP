import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
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
