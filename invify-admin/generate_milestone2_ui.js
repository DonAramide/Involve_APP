const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const dirs = [
  'components/admin/leads',
  'components/admin/tenants',
  'components/agent-portal/leads',
  'components/agent-portal/portfolio',
  'components/shared/timeline',
  'pages/admin/leads',
  'pages/admin/tenants',
  'pages/agent-portal/leads',
  'pages/agent-portal/portfolio'
];

dirs.forEach(d => {
  const p = path.join(srcDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {
  // Shared
  'components/shared/timeline/LeadTimeline.vue': `<template><div>Unified Timeline</div></template>`,
  'components/shared/LeadDetailDrawer.vue': `<template><div>Slide-out Details Drawer</div></template>`,
  
  // Admin App
  'pages/admin/leads/GlobalLeadsPage.vue': `<template><div>Global Leads List</div></template>`,
  'pages/admin/tenants/GlobalTenantsPage.vue': `<template><div>Global Portfolio List</div></template>`,
  'pages/admin/tenants/ActivationMonitorPage.vue': `<template><div>Escalation Filters UI</div></template>`,

  // Agent App
  'pages/agent-portal/leads/LeadKanbanPage.vue': `<template><div>Kanban Board with VueDraggableNext</div></template>`,
  'pages/agent-portal/portfolio/TenantPortfolioPage.vue': `<template><div>Tenant Portfolio with KPI Cards</div></template>`,
  
  // Agent Components
  'components/agent-portal/leads/LeadCard.vue': `<template><div>Lead Card (Aging Metrics)</div></template>`,
  'components/agent-portal/portfolio/PortfolioKpiCard.vue': `<template><div>KPI Card</div></template>`,
  'components/agent-portal/portfolio/ActivationStepper.vue': `<template><div>8-Stage Stepper with Blockers</div></template>`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(srcDir, filepath), content);
}
console.log('Milestone 2 UI scaffolded successfully.');
