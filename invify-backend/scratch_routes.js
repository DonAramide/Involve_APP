const fs = require('fs');
const path = require('path');
const modulesDir = path.join('C:\\\\dev\\\\Involve_APP\\\\invify-backend', 'src', 'modules');

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, filelist);
    else if (p.endsWith('.controller.ts') && !p.includes('agent.controller.ts') && !p.includes('admin-agent.controller.ts')) filelist.push(p);
  }
  return filelist;
}

const controllers = walk(modulesDir);
let imports = [];
let routes = [];

const routesDir = path.join('C:\\\\dev\\\\Involve_APP\\\\invify-backend', 'src', 'routes');
if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });

controllers.forEach(c => {
  const code = fs.readFileSync(c, 'utf8');
  const match = code.match(/export class ([A-Za-z0-9_]+)/);
  if (match) {
    const className = match[1];
    // Fix slashes by replacing all backslashes with forward slashes
    const relPath = path.relative(routesDir, c).split(path.sep).join('/').replace('.ts', '');
    imports.push(`import { ${className} } from '${relPath}';`);
    
    const methods = [...code.matchAll(/static async ([a-zA-Z0-9_]+)/g)].map(m => m[1]);
    const moduleName = path.basename(path.dirname(path.dirname(c)));
    const routeName = path.basename(c, '.controller.ts');
    
    methods.forEach(method => {
      let verb = 'post';
      if (method.includes('get') || method.includes('list')) verb = 'get';
      if (method.includes('update')) verb = 'patch';
      if (method.includes('delete')) verb = 'delete';
      routes.push(`router.${verb}('/api/${moduleName}/${routeName}/${method}', authenticate, validateDto, ${className}.${method});`);
    });
  }
});

const output = `
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/rbac.middleware';
import { validateDto } from '../middleware/dto.middleware';

${imports.join('\n')}

const router = Router();

${routes.join('\n')}

export default router;
`;
fs.writeFileSync(path.join(routesDir, 'activation.routes.ts'), output);
console.log('Activation routes generated successfully with fixed paths.');
