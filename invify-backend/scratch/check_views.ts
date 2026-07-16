import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL || 'https://rpcjelhacmkhzguljdgi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing STAGING_SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkViews() {
  const { data: kpis, error: err1 } = await supabase.from('v_dashboard_kpis').select('*');
  console.log('v_dashboard_kpis:', kpis, err1?.message);

  const { data: alerts, error: err2 } = await supabase.from('v_dashboard_alerts').select('*');
  console.log('v_dashboard_alerts:', alerts, err2?.message);

  const { data: gov, error: err3 } = await supabase.from('v_dashboard_governance').select('*');
  console.log('v_dashboard_governance:', gov, err3?.message);
}

checkViews();
