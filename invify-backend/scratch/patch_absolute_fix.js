const fs = require('fs');
const path = 'C:/Users/IIPS/.gemini/antigravity/brain/99096251-ccb1-4046-999f-2a1a7bb298e3/artifacts/staging_bootstrap.sql';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('DROP VIEW IF EXISTS public.mv_operational_risk_signals CASCADE;')) {
        lines[i] = 'DO $$ BEGIN DROP VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END $$;';
    }
    if (lines[i].includes('DROP MATERIALIZED VIEW IF EXISTS public.mv_operational_risk_signals CASCADE;')) {
        lines[i] = 'DO $$ BEGIN DROP MATERIALIZED VIEW IF EXISTS public.mv_operational_risk_signals CASCADE; EXCEPTION WHEN OTHERS THEN END $$;';
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed for real');
