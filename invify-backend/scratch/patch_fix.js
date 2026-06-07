const fs = require('fs');
const path = 'C:/Users/IIPS/.gemini/antigravity/brain/99096251-ccb1-4046-999f-2a1a7bb298e3/artifacts/staging_bootstrap.sql';
let sql = fs.readFileSync(path, 'utf8');

sql = sql.replace(/DO \\\$\\\$ BEGIN DROP VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END \\\$\\\$;/g, 'DO $$ BEGIN DROP VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END $$;');

sql = sql.replace(/DO \\\$\\\$ BEGIN DROP MATERIALIZED VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END \\\$\\\$;/g, 'DO $$ BEGIN DROP MATERIALIZED VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END $$;');

fs.writeFileSync(path, sql);
console.log('Fixed');
