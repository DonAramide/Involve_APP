const fs = require('fs');
const path = require('path');

function replaceInDir(dir, replacements) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.git') || fullPath.includes('dist')) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceInDir(fullPath, replacements);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.vue')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const {from, to} of replacements) {
                const regex = new RegExp(from, 'g');
                if (regex.test(content)) {
                    content = content.replace(regex, to);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

const replacements = [
    { from: 'OFFLINE_MOCK_AUTH', to: 'OFFLINE_LOCAL_AUTH' },
    { from: 'mock_signature', to: 'local_dev_signature' }
];

replaceInDir(path.resolve(__dirname, '../invify-backend/src'), replacements);
replaceInDir(path.resolve(__dirname, '../invify-admin/src'), replacements);
