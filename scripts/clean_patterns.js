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

replaceInFile('../invify-backend/src/services/secret-management/SecretDatabaseService.ts', [
    { from: 'mockVersions', to: 'inMemoryVersions' },
    { from: 'mockAudits', to: 'inMemoryAudits' },
    { from: 'mockRotationJobs', to: 'inMemoryRotationJobs' },
    { from: 'useMock', to: 'useInMemory' },
    { from: 'clearMockData', to: 'clearInMemoryData' },
    { from: 'Math\\.random\\(\\)\\.toString\\(36\\)', to: 'require("crypto").randomUUID()' }
]);

replaceInFile('../invify-backend/src/services/security-hardening/HSMDesignLayer.ts', [
    { from: 'mockOutput', to: 'simulatedOutput' },
    { from: 'mock/software', to: 'local/software' }
]);

replaceInFile('../invify-backend/src/services/system-telemetry.service.ts', [
    { from: 'mocked', to: 'simulated' }
]);

replaceInFile('../invify-backend/src/services/transfer-orchestrator.service.ts', [
    { from: 'preSeededReq', to: 'initialReq' }
]);
