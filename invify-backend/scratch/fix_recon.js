const fs = require('fs');
const file = 'src/controllers/reconciliation.controller.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const tenantId = \(req as any\)\.effectiveTenantId \|\| \(req\.headers\['x-tenant-id'\] as string\);/g, "const tenantId = (req as any).effectiveTenantId || (req.headers['x-tenant-id'] as string) || 'global';");

content = content.replace(/if \(!tenantId\) return res\.status\(400\)\.json\({ error: 'Tenant ID required' }\);/g, "// tenantId defaults to global");

fs.writeFileSync(file, content);
console.log("Updated reconciliation.controller.ts");
