import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.STAGING_SUPABASE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tenantId = 'e2b3c4d5-6789-0123-4567-89abcdef0123';
const JWT_SECRET = process.env.JWT_SECRET || 'invify-fintech-fallback-secret-2026';

const api = axios.create({
  baseURL: 'http://localhost:3004',
  headers: {
    'x-tenant-id': tenantId
  }
});

const token = jwt.sign({ 
  userId: 'test-user-id',
  tenantId: tenantId,
  role: 'super_admin'
}, JWT_SECRET);

api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

async function runValidation() {
  console.log('# Dashboard Physical Evidence Validation\n');

  try {
    // 1. Analytics Evidence
    console.log('## 1. Analytics Evidence (RevenueWidget)');
    console.log('- Endpoint: GET /api/v1/finance/executive-summary');
    const startAnalytics = performance.now();
    const resAnalytics = await api.get('/api/v1/finance/executive-summary');
    const timeAnalytics = performance.now() - startAnalytics;
    console.log(`- Time: ${timeAnalytics.toFixed(2)}ms`);
    console.log(`- Payload: \n${JSON.stringify(resAnalytics.data, null, 2)}\n`);

    // 2. Settlement Timeline Evidence
    console.log('## 2. Settlement Timeline Evidence (QuasarTimeline)');
    console.log('- Endpoint: GET /api/v1/finance/settlement-phases');
    const startTimeline = performance.now();
    const resTimeline = await api.get('/api/v1/finance/settlement-phases');
    const timeTimeline = performance.now() - startTimeline;
    console.log(`- Time: ${timeTimeline.toFixed(2)}ms`);
    console.log(`- Payload: \n${JSON.stringify(resTimeline.data, null, 2)}\n`);

    // 3. Wallet Evidence
    console.log('## 3. Wallet Evidence');
    console.log('- Endpoint: GET /api/v1/wallet');
    const startWallet = performance.now();
    const resWallet = await api.get('/api/v1/wallet');
    const timeWallet = performance.now() - startWallet;
    console.log(`- Time: ${timeWallet.toFixed(2)}ms`);
    console.log(`- Payload: \n${JSON.stringify(resWallet.data, null, 2)}\n`);

    // 4. Wallet Transactions (LedgerFeed)
    console.log('## 4. Wallet Transactions (LedgerFeed)');
    console.log('- Endpoint: GET /api/v1/wallet/transactions');
    const startLedger = performance.now();
    const resLedger = await api.get('/api/v1/wallet/transactions');
    const timeLedger = performance.now() - startLedger;
    console.log(`- Time: ${timeLedger.toFixed(2)}ms`);
    console.log(`- Count: ${resLedger.data?.transactions?.length}`);
    console.log(`- Sample: \n${JSON.stringify(resLedger.data?.transactions?.[0], null, 2)}\n`);

    // 5. EXPLAIN ANALYZE EVIDENCE (Direct DB execution)
    console.log('## 5. EXPLAIN ANALYZE EVIDENCE');
    const { data: explainData, error } = await supabase.rpc('execute_sql_query', {
      query: `EXPLAIN ANALYZE SELECT * FROM ledger_entries WHERE tenant_id = '${tenantId}' ORDER BY created_at DESC LIMIT 100;`
    });
    
    if (error) {
      console.log(`- RPC EXPLAIN failed (likely RPC missing): ${error.message}`);
    } else {
      console.log(`- EXPLAIN ANALYZE: \n${JSON.stringify(explainData, null, 2)}`);
    }

    console.log('\n✅ Physical Validation Complete.');
  } catch (error: any) {
    console.error('Validation failed!', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
  }
}

runValidation();
