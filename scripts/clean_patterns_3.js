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

const replacements = [
    { from: 'getMockMessages', to: 'getInMemoryMessages' }
];

replaceInFile('../invify-backend/src/services/operations-center/QueueMonitor.ts', replacements);
replaceInFile('../invify-backend/src/services/operations-center/SettlementMonitor.ts', replacements);
replaceInFile('../invify-backend/src/services/operations-center/WebhookMonitor.ts', replacements);
