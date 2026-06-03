const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:\\\\dev\\\\Involve_APP\\\\invify-admin', 'src');

const targets = {
  'M2 CRM & Tenant Portfolio': ['agent-portal/leads', 'agent-portal/portfolio', 'admin/leads', 'admin/tenants', 'components/shared/LeadDetailDrawer.vue', 'components/agent-portal/portfolio'],
  'M3 Wallet & Commissions': ['agent-portal/wallet', 'admin/agent-management/AgentCommissionsPage.vue', 'admin/AgentCommissionsPage.vue', 'admin/finance'],
  'M4 Support / Training / Certifications': ['agent-portal/training', 'agent-portal/support', 'admin/support', 'admin/training', 'admin/kb'],
  'M5 Reputation & Gamification': ['agent-portal/achievements', 'agent-portal/reputation', 'agent-portal/leaderboards'],
  'M6 Operations Intelligence': ['agent-portal/performance', 'admin/analytics']
};

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.vue')) filelist.push(filepath);
    }
  }
  return filelist;
}

let allFiles = walkSync(srcDir);
let results = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(srcDir, file).replace(/\\\\/g, '/');
  
  let milestone = null;
  for (const [m, patterns] of Object.entries(targets)) {
    for (const pattern of patterns) {
      if (relPath.includes(pattern)) {
        milestone = m;
        break;
      }
    }
    if (milestone) break;
  }
  
  if (!milestone) return;

  const lines = content.split('\\n').length;
  const hasScript = content.includes('<script');
  const imports = (content.match(/import\\s+.*from\\s+['"].*['"]/g) || []).length;
  const hasApi = content.includes('axios.') || content.includes('fetch(') || content.includes('api.');
  const hasVueQuery = content.includes('useQuery') || content.includes('useMutation');
  const hasForm = content.includes('<form') || content.includes('<q-form');
  
  let classification = 'Empty';
  let percentage = 0;
  
  if (lines <= 5 && !hasScript) {
    classification = 'Stub';
    percentage = 0;
  } else if (lines > 5 && hasScript && !hasApi && !hasVueQuery) {
    classification = 'Partial';
    percentage = 30;
  } else if (lines > 20 && hasScript && (hasApi || hasVueQuery)) {
    classification = 'Production Ready';
    percentage = 100;
  } else {
    classification = 'Partial';
    percentage = 10;
  }

  results.push({
    file: relPath,
    milestone,
    lines,
    imports,
    hasScript,
    hasApi,
    hasVueQuery,
    hasForm,
    classification,
    percentage
  });
});

console.log(JSON.stringify(results, null, 2));
