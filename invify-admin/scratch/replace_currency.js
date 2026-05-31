const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('c:/dev/Involve_APP/invify-admin/src');

function findAndReplaceNaira(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndReplaceNaira(fullPath);
        } else if (fullPath.endsWith('.vue')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('₦')) {
                console.log(`Updating ${fullPath}`);
                let updated = false;

                // 1. In Template: Replace ₦{{ with {{ currentCurrency.symbol }}{{
                // Or simply replace ₦ with {{ currentCurrency.symbol }} if it's outside brackets.
                // A simpler regex for template: replace ₦ directly in template text.
                // But let's check how it's used. E.g., `₦{{ walletBalance.toLocaleString() }}` -> `{{ currentCurrency.symbol }}{{ walletBalance.toLocaleString() }}`
                content = content.replace(/₦\{\{/g, '{{ currentCurrency.symbol }}{{');
                content = content.replace(/prefix="₦"/g, ':prefix="currentCurrency.symbol"');
                
                // If it's used in script setup like `prefix="₦"` or `₦${val}`
                content = content.replace(/`₦\$\{/g, '`${currentCurrency.symbol}${');
                
                // If there are still standalone ₦, we can replace them with {{ currentCurrency.symbol }}
                // This might be tricky if it's inside an attribute vs text.
                content = content.replace(/>₦/g, '>{{ currentCurrency.symbol }}');
                content = content.replace(/ ₦/g, ' {{ currentCurrency.symbol }}');

                // Inject composable import
                if (!content.includes('useCurrency') && content.includes('currentCurrency.symbol')) {
                    // Try to inject into <script setup>
                    const scriptSetupRegex = /<script setup[^>]*>/;
                    if (scriptSetupRegex.test(content)) {
                        // calculate relative path to composable
                        const relativePath = path.relative(path.dirname(fullPath), path.join(srcDir, 'composables', 'useCurrency'));
                        let importPath = relativePath.replace(/\\/g, '/');
                        if (!importPath.startsWith('.')) {
                            importPath = './' + importPath;
                        }
                        
                        const importStatement = `\nimport { useCurrency } from '${importPath}';\n`;
                        const initStatement = `const { currentCurrency } = useCurrency();\n`;
                        
                        content = content.replace(scriptSetupRegex, match => match + importStatement + initStatement);
                        updated = true;
                    }
                }

                if (updated || content.includes('currentCurrency.symbol')) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`Saved ${fullPath}`);
                }
            }
        }
    }
}

findAndReplaceNaira(srcDir);
