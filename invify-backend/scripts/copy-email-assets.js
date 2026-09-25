/**
 * Copy user/school manuals into dist/assets so staging/prod email
 * attachments resolve next to the compiled backend (not repo src paths).
 */
const fs = require('fs');
const path = require('path');

const destDir = path.join(__dirname, '..', 'dist', 'assets');
fs.mkdirSync(destDir, { recursive: true });

const manuals = [
  {
    destName: 'Invify_User_Manual.pdf',
    sources: [
      path.join(__dirname, '..', '..', 'assets', 'docs', 'Invify_User_Manual.pdf'),
      path.join(__dirname, '..', '..', 'invify-admin', 'src', 'assets', 'Invify_User_Manual.pdf'),
    ],
  },
  {
    destName: 'InvifySchoolManual.pdf',
    sources: [
      path.join(__dirname, '..', '..', 'assets', 'docs', 'InvifySchoolManual.pdf'),
      path.join(__dirname, '..', '..', 'assets', 'docs', 'INVIFY_MANUAL_SCHOOL_MODE.pdf'),
      path.join(__dirname, '..', '..', 'invify-admin', 'src', 'assets', 'InvifySchoolManual.pdf'),
    ],
  },
];

for (const manual of manuals) {
  const source = manual.sources.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    console.warn(`[copy-email-assets] ${manual.destName} not found; related welcome emails may send without that PDF.`);
    continue;
  }
  fs.copyFileSync(source, path.join(destDir, manual.destName));
  console.log(`[copy-email-assets] Copied ${manual.destName} into dist/assets`);
}
