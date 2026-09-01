/**
 * Copy the user-manual PDF into dist/assets so staging/prod email
 * attachments resolve next to the compiled backend (not repo src paths).
 */
const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '..', 'dist', 'assets');
const dest = path.join(destDir, 'Invify_User_Manual.pdf');
const sources = [
  path.join(__dirname, '..', '..', 'assets', 'docs', 'Invify_User_Manual.pdf'),
  path.join(__dirname, '..', '..', 'invify-admin', 'src', 'assets', 'Invify_User_Manual.pdf'),
];

const source = sources.find((candidate) => fs.existsSync(candidate));
if (!source) {
  console.warn('[copy-email-assets] Invify_User_Manual.pdf not found; welcome emails will send without the PDF.');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log('[copy-email-assets] Copied user manual into dist/assets');
