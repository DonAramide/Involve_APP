const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/IIPS/.gemini/antigravity/brain/f6abfa43-41a3-4b4e-8428-774175a2199e';
const files = fs.readdirSync(dir);

console.log('Searching for "FAIL" in artifacts...');
for (const file of files) {
  const filePath = path.join(dir, file);
  if (fs.statSync(filePath).isFile() && file.endsWith('.md')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('STATUS: FAIL') || content.includes('STATUS:  FAIL') || content.includes(': FAIL')) {
      console.log(`Found "FAIL" in: ${file}`);
    }
  }
}
