import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function runAnalyticsValidation() {
  console.log('--- STARTING ANALYTICS VALIDATION ---');
  try {
    const reports: any = {};

    // 1. executive_kpi_snapshots
    console.log('Fetching executive_kpi_snapshots...');
    const { data: kpi, error: kpiErr } = await supabaseAdmin.from('executive_kpi_snapshots').select('*').limit(1);
    if (kpiErr) console.error('KPI Error:', kpiErr.message);
    reports.kpi = { count: kpi?.length || 0, sample: kpi?.[0] };

    // 2. merchant_health_snapshots
    console.log('Fetching merchant_health_snapshots...');
    const { data: health, error: healthErr } = await supabaseAdmin.from('merchant_health_snapshots').select('*').limit(1);
    if (healthErr) console.error('Health Error:', healthErr.message);
    reports.health = { count: health?.length || 0, sample: health?.[0] };

    // 3. mv_operational_risk_signals
    console.log('Fetching mv_operational_risk_signals...');
    const { data: risk, error: riskErr } = await supabaseAdmin.from('mv_operational_risk_signals').select('*').limit(1);
    if (riskErr) console.error('Risk Error:', riskErr.message);
    reports.risk = { count: risk?.length || 0, sample: risk?.[0] };

    // 4. mv_territory_intelligence
    console.log('Fetching mv_territory_intelligence...');
    const { data: intel, error: intelErr } = await supabaseAdmin.from('mv_territory_intelligence').select('*').limit(1);
    if (intelErr) console.error('Intel Error:', intelErr.message);
    reports.intel = { count: intel?.length || 0, sample: intel?.[0] };

    console.log('--- ANALYTICS RESULTS ---');
    console.log(JSON.stringify(reports, null, 2));

  } catch (error) {
    console.error('Analytics Validation Failed:', error);
  }
}

runAnalyticsValidation();
