const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const domains = ['executive_kpi', 'territory_intel', 'merchant_health', 'forecasts', 'operational_risks'];

domains.forEach(domain => {
  const modDir = path.join(srcDir, 'modules', 'analytics', domain);
  const dirs = ['controllers', 'services', 'repositories', 'tests'];
  
  dirs.forEach(d => {
    const p = path.join(modDir, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  // Scaffold Controller
  fs.writeFileSync(path.join(modDir, 'controllers', `${domain}.controller.ts`), `
// ${domain.toUpperCase()} Controller (GET-Only APIs)
export class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Controller {
  // Routes are strictly read-only HTTP GET mappings.
}
  `);
  
  // Scaffold Repository
  fs.writeFileSync(path.join(modDir, 'repositories', `${domain}.repository.ts`), `
// ${domain.toUpperCase()} Repository
// Pulls strictly from Materialized Views and Snapshots (M6 Schema)
export class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Repository {}
  `);

  // Scaffold Service
  let serviceContent = `// ${domain.toUpperCase()} Service (Analytics Derivations Only)\nexport class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Service {}`;
  
  fs.writeFileSync(path.join(modDir, 'services', `${domain}.service.ts`), serviceContent);

  // Scaffold Tests
  fs.writeFileSync(path.join(modDir, 'tests', `${domain}.spec.ts`), `// ${domain.toUpperCase()} Tests (Verification, RLS, Performance, Forecast Accuracy)`);
});

console.log('Milestone 6 Backend Intelligence Layer scaffolded successfully.');
