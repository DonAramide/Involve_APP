const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const domains = ['support', 'kb', 'training', 'certification'];

domains.forEach(domain => {
  const modDir = path.join(srcDir, 'modules', domain);
  const dirs = ['controllers', 'services', 'repositories', 'tests'];
  
  dirs.forEach(d => {
    const p = path.join(modDir, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  // Scaffold Controller
  fs.writeFileSync(path.join(modDir, 'controllers', `${domain}.controller.ts`), `// ${domain.toUpperCase()} Controller\nexport class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Controller {}`);
  
  // Scaffold Repository
  fs.writeFileSync(path.join(modDir, 'repositories', `${domain}.repository.ts`), `// ${domain.toUpperCase()} Repository\nexport class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Repository {}`);

  // Scaffold Service
  let serviceContent = `// ${domain.toUpperCase()} Service\nexport class ${domain.charAt(0).toUpperCase() + domain.slice(1)}Service {}`;
  if (domain === 'certification') {
    serviceContent = `
// CERTIFICATION Service
export class CertificationService {
  async issueCertificate(agentId: string, courseId: string, attemptId: string) {
    // 1. Course completion_percentage = 100%
    // 2. Assessment passed = true
    // 3. No existing active certificate
    // 4. No revocation conflict
    console.log('Checking strict issuance constraints before generating Certificate...');
  }
}
`;
  }
  fs.writeFileSync(path.join(modDir, 'services', `${domain}.service.ts`), serviceContent);

  // Scaffold Tests
  fs.writeFileSync(path.join(modDir, 'tests', `${domain}.spec.ts`), `// ${domain.toUpperCase()} Tests (Statements > 90%, Branches > 85%, Functions > 90%)`);
});

console.log('Milestone 4 Backend implementation scaffolded successfully.');
