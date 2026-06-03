const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const dirs = [
  'components/admin/agent-management',
  'components/agent-portal',
  'components/shared',
  'pages/admin/agent-management',
  'pages/agent-portal',
  'services'
];

dirs.forEach(d => {
  const p = path.join(srcDir, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const files = {
  // Shared Base Components
  'components/shared/BaseDataTable.vue': `<template><div>Base Data Table</div></template>`,
  'components/shared/BaseFormCard.vue': `<template><div>Base Form Card</div></template>`,
  
  // Admin Components
  'pages/admin/agent-management/AgentRegistryPage.vue': `<template><div>Agent Registry</div></template>`,
  'pages/admin/agent-management/AgentDetailPage.vue': `<template><div>Agent Detail</div></template>`,
  'pages/admin/agent-management/TerritoryManagementPage.vue': `<template><div>Territory Management</div></template>`,
  'pages/admin/agent-management/RoleManagementPage.vue': `<template><div>Role Management</div></template>`,
  'pages/admin/agent-management/AuditLogsPage.vue': `<template><div>Audit Logs</div></template>`,
  
  // Agent Components
  'pages/agent-portal/AgentDashboardPage.vue': `<template><div>Agent Dashboard</div></template>`,
  'pages/agent-portal/AgentProfilePage.vue': `<template><div>Agent Profile</div></template>`,
  'pages/agent-portal/AgentNotificationsPage.vue': `<template><div>Agent Notifications</div></template>`,
  
  // Integration
  'services/VueQueryIntegration.ts': `export const queryClient = {};`,
  'services/OfflineHandler.ts': `export const handleOffline = () => {};`
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(srcDir, filepath), content);
}
console.log('UI framework scaffolded successfully.');
