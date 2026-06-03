const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const domains = ['support', 'kb', 'training', 'certifications'];
const sides = ['agent-portal', 'admin', 'shared'];

domains.forEach(d => {
  sides.forEach(s => {
    const p = path.join(srcDir, 'components', s, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    
    const pPages = path.join(srcDir, 'pages', s, d);
    if (!fs.existsSync(pPages)) fs.mkdirSync(pPages, { recursive: true });
  });
});

const files = {
  // Shared Components
  'components/shared/support/TicketStatusBadge.vue': `<template><div>Badge</div></template>`,
  'components/shared/support/SlaIndicator.vue': `<template><div>SLA Countdown</div></template>`,
  'components/shared/kb/ArticleViewer.vue': `<template><div>Markdown Reader (Analytics tracking onMount)</div></template>`,
  'components/shared/training/TrainingProgressRing.vue': `<template><div>SVG Ring 0-100%</div></template>`,
  
  // Admin App
  'pages/admin/support/SupportDashboardPage.vue': `<template><div>KPIs: Open, Escalated, Breached, Resolved</div></template>`,
  'components/admin/support/TicketDetailDrawer.vue': `<template><div>Context Drawer</div></template>`,
  'components/admin/support/AssignmentHistoryDrawer.vue': `<template><div>History Trail</div></template>`,
  
  // Public App
  'pages/public/PublicCertificateVerificationPage.vue': `<template><div>Verify UUID Form</div></template>`,

  // Agent App
  'pages/agent-portal/training/CourseCatalogPage.vue': `<template><div>Filters: All | Not Started | In Progress | Completed</div></template>`,
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(srcDir, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
console.log('Milestone 4 UI scaffolded successfully.');
