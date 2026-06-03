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
                content = content.replace(/₦\{\{/g, '{{ currentCurrency.symbol }}{{');
                content = content.replace(/prefix="₦"/g, ':prefix="currentCurrency.symbol"');
                
                // If it's used in script setup like `prefix="₦"` or `₦${val}`
                content = content.replace(/`₦\$\{/g, '`${currentCurrency.symbol}${');
                
                // Replace single quotes '₦' or double quotes "₦" with symbol
                content = content.replace(/'₦'/g, 'currentCurrency.symbol');
                content = content.replace(/"₦"/g, 'currentCurrency.symbol');
                content = content.replace(/'₦\s*\+\s*/g, 'currentCurrency.symbol + ');
                content = content.replace(/"₦\s*\+\s*/g, 'currentCurrency.symbol + ');

                // If there are still standalone ₦, we can replace them with {{ currentCurrency.symbol }}
                content = content.replace(/>₦/g, '>{{ currentCurrency.symbol }}');
                content = content.replace(/ ₦/g, ' {{ currentCurrency.symbol }}');
                content = content.replace(/₦ /g, '{{ currentCurrency.symbol }} ');

                // Inject composable import
                if (!content.includes('useCurrency')) {
                    // Try to inject into <script setup>
                    const scriptSetupRegex = /<script setup[^>]*>/;
                    if (scriptSetupRegex.test(content)) {
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
                } else {
                    updated = true;
                }

                fs.writeFileSync(fullPath, content);
                console.log(`Saved ${fullPath}`);
            }
        }
    }
}

findAndReplaceNaira(srcDir);
