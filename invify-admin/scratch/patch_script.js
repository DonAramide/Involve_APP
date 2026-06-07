const fs = require('fs');
const path = 'C:/dev/Involve_APP/invify-admin/src/pages/admin/PlatformOverviewPage.vue';
const refactorCode = fs.readFileSync('C:/dev/Involve_APP/invify-admin/scratch/refactor_dashboard.js', 'utf8');

// Extract the newScript string from refactor_dashboard.js
const newScriptMatch = refactorCode.match(/const newScript = `([\s\S]*?)`;\n\nconst newStyle/);
if (!newScriptMatch) {
  console.error("Could not find newScript in refactor_dashboard.js");
  process.exit(1);
}

let newScript = newScriptMatch[1];
// Replace @/ aliases with relative paths
newScript = newScript.replace(/@\/services\/dashboard/g, '../../services/dashboard');

// Read the current PlatformOverviewPage.vue
const currentFile = fs.readFileSync(path, 'utf8');

// Replace everything between <script setup> and </script> with newScript
const startIdx = currentFile.indexOf('<script setup');
const endIdx = currentFile.indexOf('</script>') + '</script>'.length;

if (startIdx === -1 || endIdx < startIdx) {
  console.error("Could not find <script setup> block in vue file");
  process.exit(1);
}

const finalFile = currentFile.substring(0, startIdx) + newScript + currentFile.substring(endIdx);
fs.writeFileSync(path, finalFile);
console.log("Successfully replaced script block!");
