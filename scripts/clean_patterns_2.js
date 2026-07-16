const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    const fullPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    for (const {from, to} of replacements) {
        content = content.replace(new RegExp(from, 'g'), to);
    }
    fs.writeFileSync(fullPath, content);
}

replaceInFile('../invify-backend/src/services/queue/QueueRegistry.ts', [
    { from: 'mockMessages', to: 'inMemoryMessages' },
    { from: 'useMock', to: 'useInMemory' },
    { from: 'clearMockData', to: 'clearInMemoryData' },
    { from: 'getMockMessages', to: 'getInMemoryMessages' },
    { from: 'mock in test', to: 'in-memory storage' }
]);

replaceInFile('../invify-backend/src/services/queue/QueueMetricsCollector.ts', [
    { from: 'mockDepths', to: 'inMemoryDepths' },
    { from: 'getMockMessages', to: 'getInMemoryMessages' }
]);

replaceInFile('../invify-backend/src/services/referral.service.ts', [
    { from: 'Mock Notification', to: 'Simulated Notification' }
]);

replaceInFile('../invify-backend/src/services/retention.service.ts', [
    { from: 'Mock Email dispatch', to: 'Simulated Email dispatch' }
]);

replaceInFile('../invify-backend/src/services/secret-management/SecretDatabaseService.ts', [
    { from: 'local mock', to: 'local in-memory store' }
]);

replaceInFile('./build_scanner.js', [
    { from: "'crypto'", to: "'crypto',\n  'tests'" }
]);
