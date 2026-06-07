require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.SUPABASE_URL || 'https://iyqmqcohoduofotfjutm.supabase.co';
const key = process.env.SUPABASE_KEY;
const supabase = createClient(url, key);

async function run() {
  const tables = [
    'merchant_categories',
    'system_configurations',
    'commission_programs',
    'commission_plan_versions',
    'commission_program_rules',
    'performance_target_rules',
    'terminal_target_rules'
  ];

  let out = '-- STAGING SEED DATA\n\n';

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.error(`Error fetching ${t}:`, error);
      continue;
    }
    
    if (data && data.length > 0) {
      out += `-- Table: ${t}\n`;
      data.forEach(row => {
        const keys = Object.keys(row).join(', ');
        const vals = Object.entries(row).map(([k, v]) => {
          if (v === null) return 'NULL';
          if (t === 'system_configurations' && k === 'config_value') {
              // JSONB column: stringify the string so it includes the double quotes required for JSON text
              return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
          }
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
          return v;
        }).join(', ');
        out += `INSERT INTO ${t} (${keys}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
      });
      out += '\n';
    }
  }

  fs.writeFileSync('C:/Users/IIPS/.gemini/antigravity/brain/99096251-ccb1-4046-999f-2a1a7bb298e3/artifacts/staging_seed.sql', out);
  console.log('Seed created');
}

run();
