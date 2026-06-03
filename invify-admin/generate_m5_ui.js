const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const domains = ['reputation', 'performance', 'achievements', 'leaderboards'];
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
  'components/shared/reputation/ReputationScoreCard.vue': `<template><div>Badge</div></template>`,
  'components/shared/reputation/ReputationBreakdownCard.vue': `<template><div>Badge</div></template>`,
  'components/shared/reputation/ReputationTrendChart.vue': `<template><div>Badge</div></template>`,
  'components/shared/reputation/ReputationTimeline.vue': `<template><div>Badge</div></template>`,
  'components/shared/reputation/TierProgressBar.vue': `<template><div>Badge</div></template>`,
  
  'components/shared/performance/PerformanceMetricCard.vue': `<template><div>Badge</div></template>`,
  'components/shared/performance/PerformanceTrendChart.vue': `<template><div>Badge</div></template>`,
  
  'components/shared/achievements/AchievementCard.vue': `<template><div>Badge</div></template>`,
  'components/shared/achievements/AchievementProgressRing.vue': `<template><div>Badge</div></template>`,
  
  'components/shared/leaderboards/LeaderboardTable.vue': `<template><div>Badge</div></template>`,
  'components/shared/leaderboards/LeaderboardPositionCard.vue': `<template><div>Badge</div></template>`,
  
  // Admin App
  'components/admin/reputation/ReputationAdjustmentDialog.vue': `<template><div>Modal</div></template>`,
  'components/admin/performance/MerchantFeedbackPanel.vue': `<template><div>Panel</div></template>`,
  'components/admin/performance/TerritoryReputationHeatmap.vue': `<template><div>Heatmap</div></template>`,
  'components/admin/achievements/AchievementDetailDrawer.vue': `<template><div>Drawer</div></template>`,
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(srcDir, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
console.log('Milestone 5 UI scaffolded successfully.');
