import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-local-testing';

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing STAGING_SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function createTenantClient(tenantId: string) {
  const token = jwt.sign({ sub: 'user_123', role: 'authenticated', tenantId }, JWT_SECRET, { expiresIn: '1h' });
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

async function verify() {
  const tenantA = '550e8400-e29b-41d4-a716-446655440000';
  const tenantB = '660e8400-e29b-41d4-a716-446655440000';
  const caseNumberA = `REC-TEST-${Date.now()}-A`;
  const caseNumberB = `REC-TEST-${Date.now()}-B`;

  // 1. Verify RLS / Tenant Isolation
  console.log('--- Verifying Tenant Isolation & RLS ---');
  const clientA = createTenantClient(tenantA);
  const clientB = createTenantClient(tenantB);

  // Insert case for A using A's client
  const { data: insertA, error: errA } = await clientA.from('reconciliation_cases').insert({
    tenant_id: tenantA,
    case_number: caseNumberA,
    transaction_reference: 'TX-A',
    type: 'MISMATCH',
    severity: 'WARNING',
    status: 'PENDING'
  }).select().single();

  if (errA) {
    console.error('Error inserting for Tenant A:', errA.message);
  } else {
    console.log('Successfully inserted case for Tenant A:', insertA?.id);
  }

  // Insert case for B using B's client
  await clientB.from('reconciliation_cases').insert({
    tenant_id: tenantB,
    case_number: caseNumberB,
    transaction_reference: 'TX-B',
    type: 'MISMATCH',
    severity: 'WARNING',
    status: 'PENDING'
  });

  // Client A tries to read all
  const { data: readA } = await clientA.from('reconciliation_cases').select('*').in('case_number', [caseNumberA, caseNumberB]);
  console.log(`Tenant A can see ${readA?.length} cases (Expected: 1). Cases seen:`, readA?.map((r: any) => r.case_number));

  // Client A tries to update Client B's case
  const { data: updateBA, error: errUpdateBA } = await clientA.from('reconciliation_cases')
    .update({ status: 'RESOLVED' })
    .eq('case_number', caseNumberB)
    .select();
  console.log(`Tenant A attempting to update Tenant B's case resulted in ${updateBA?.length} rows modified (Expected: 0)`);

  // 2. Verify Optimistic Concurrency
  console.log('--- Verifying Optimistic Concurrency ---');
  // Get current version for Case A
  const { data: caseA } = await clientA.from('reconciliation_cases').select('version').eq('case_number', caseNumberA).single();
  const currentVersion = caseA?.version || 1;
  console.log('Current version of Case A:', currentVersion);

  // First update simulates Transaction 1 (success)
  const { data: t1, error: e1 } = await clientA.from('reconciliation_cases')
    .update({ status: 'INVESTIGATING', version: currentVersion + 1 })
    .eq('case_number', caseNumberA)
    .eq('version', currentVersion)
    .select();
  console.log(`Transaction 1 updated ${t1?.length || 0} row(s).`);

  // Second update simulates Transaction 2 (failure because version is stale)
  const { data: t2, error: e2 } = await clientA.from('reconciliation_cases')
    .update({ status: 'MATCHED', version: currentVersion + 1 })
    .eq('case_number', caseNumberA)
    .eq('version', currentVersion)
    .select();
  console.log(`Transaction 2 updated ${t2?.length || 0} row(s) using stale version (Expected: 0).`);

  // Verify Timeline RLS
  if (insertA?.id) {
    console.log('--- Verifying Timeline RLS ---');
    await clientA.from('reconciliation_timeline').insert({
      case_id: insertA.id,
      stage: 'PAYMENT_RECEIVED',
      description: 'Test Timeline'
    });

    const { data: timelineA } = await clientA.from('reconciliation_timeline').select('*').eq('case_id', insertA.id);
    const { data: timelineB } = await clientB.from('reconciliation_timeline').select('*').eq('case_id', insertA.id);
    
    console.log(`Tenant A sees ${timelineA?.length || 0} timeline entries for Case A (Expected: 1).`);
    console.log(`Tenant B sees ${timelineB?.length || 0} timeline entries for Case A (Expected: 0).`);
  }

  console.log('Verification Script Complete.');
}

verify().catch(console.error);
