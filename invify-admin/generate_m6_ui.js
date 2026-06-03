const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const domains = ['executive', 'territories', 'health', 'forecasts', 'risks'];
const sides = ['admin'];

domains.forEach(d => {
  sides.forEach(s => {
    const p = path.join(srcDir, 'components', s, 'analytics', d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    
    const pPages = path.join(srcDir, 'pages', s, 'analytics', d);
    if (!fs.existsSync(pPages)) fs.mkdirSync(pPages, { recursive: true });
  });
});

const files = {
  // Command Center
  'pages/admin/analytics/executive/CommandCenterPage.vue': `<template><div>Command Center Page</div></template>`,
  
  // Executive Components
  'components/admin/analytics/executive/ExecutiveKpiCard.vue': `<template><div>Card</div></template>`,
  'components/admin/analytics/executive/ExecutiveNarrativePanel.vue': `<template><div>Narrative</div></template>`,
  'components/admin/analytics/executive/ExecutiveAlertsPanel.vue': `<template><div>Alerts</div></template>`,
  'components/admin/analytics/executive/ExecutiveTrendSummary.vue': `<template><div>Trend</div></template>`,
  'components/admin/analytics/executive/ExecutiveActionInsights.vue': `<template><div>Insights</div></template>`,
  
  // Territory Components
  'components/admin/analytics/territories/TerritoryHeatmap.vue': `<template><div>Heatmap</div></template>`,
  'components/admin/analytics/territories/TerritoryRankingTable.vue': `<template><div>Ranking Table</div></template>`,
  
  // Health & Forecast Components
  'components/admin/analytics/health/MerchantHealthDistributionChart.vue': `<template><div>Health Chart</div></template>`,
  'components/admin/analytics/forecasts/ForecastTrendChart.vue': `<template><div>Trend Chart</div></template>`,
  
  // Risk Components
  'components/admin/analytics/risks/RiskSignalTable.vue': `<template><div>Risk Table</div></template>`,
  'components/admin/analytics/risks/RiskSeverityBadge.vue': `<template><div>Severity Badge</div></template>`,
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(srcDir, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
console.log('Milestone 6 UI Implementation (Read-Only) scaffolded successfully.');
