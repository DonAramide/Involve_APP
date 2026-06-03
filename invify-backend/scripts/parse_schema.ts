import * as fs from 'fs';

const schema = JSON.parse(fs.readFileSync('schema.json', 'utf-8'));

function analyze() {
  const financeTables = [
    'agent_wallets', 'wallet_ledger', 'commission_events',
    'commission_adjustments', 'agent_withdrawal_requests'
  ];
  
  const analyticsTables = [
    'executive_kpi_snapshots', 'merchant_health_snapshots',
    'mv_operational_risk_signals', 'mv_territory_intelligence'
  ];

  console.log('--- FINANCE TABLES ---');
  for (const t of financeTables) {
    if (schema.definitions[t]) {
      console.log(`[YES] ${t}`);
      const props = schema.definitions[t].properties;
      console.log(`Columns: ${Object.keys(props).join(', ')}`);
    } else {
      console.log(`[NO] ${t}`);
    }
    console.log();
  }

  console.log('--- ANALYTICS TABLES ---');
  for (const t of analyticsTables) {
    if (schema.definitions[t]) {
      console.log(`[YES] ${t}`);
      const props = schema.definitions[t].properties;
      console.log(`Columns: ${Object.keys(props).join(', ')}`);
    } else {
      console.log(`[NO] ${t}`);
    }
    console.log();
  }
}

analyze();
