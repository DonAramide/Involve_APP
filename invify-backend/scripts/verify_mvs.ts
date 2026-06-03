import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function verifyMaterializedViews() {
  console.log('--- STARTING MATERIALIZED VIEW VERIFICATION ---');
  try {
    const results: any = {};

    // 1. mv_territory_intelligence
    console.log('Testing mv_territory_intelligence via API...');
    const { data: intel, error: intelErr } = await supabaseAdmin
      .from('mv_territory_intelligence')
      .select('*')
      .limit(10);
    
    if (intelErr) {
      console.error('[FAILED] mv_territory_intelligence:', intelErr.message);
      results.territory = { status: 'FAILED', error: intelErr.message };
    } else {
      console.log(`[VERIFIED] mv_territory_intelligence returned ${intel?.length || 0} rows.`);
      results.territory = { status: 'VERIFIED', rowCount: intel?.length || 0, sample: intel?.[0] };
    }

    // 2. mv_operational_risk_signals
    console.log('Testing mv_operational_risk_signals via API...');
    const { data: risk, error: riskErr } = await supabaseAdmin
      .from('mv_operational_risk_signals')
      .select('*')
      .limit(10);

    if (riskErr) {
      console.error('[FAILED] mv_operational_risk_signals:', riskErr.message);
      results.risk = { status: 'FAILED', error: riskErr.message };
    } else {
      console.log(`[VERIFIED] mv_operational_risk_signals returned ${risk?.length || 0} rows.`);
      results.risk = { status: 'VERIFIED', rowCount: risk?.length || 0, sample: risk?.[0] };
    }

    console.log('--- VERIFICATION SUMMARY ---');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Fatal Error during verification:', error);
  }
}

verifyMaterializedViews();
