/**
 * Phase 1.3 — upload middleware limits (multer hardening).
 */
import fs from 'fs';
import path from 'path';

describe('upload middleware size limits (source contract)', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
  const terminalSrc = fs.readFileSync(
    path.join(__dirname, '../src/controllers/terminal.controller.ts'),
    'utf8',
  );
  const settlementSrc = fs.readFileSync(
    path.join(__dirname, '../src/controllers/card-settlement.controller.ts'),
    'utf8',
  );
  const apkSrc = fs.readFileSync(path.join(__dirname, '../src/controllers/apk.controller.ts'), 'utf8');
  const parserSrc = fs.readFileSync(
    path.join(__dirname, '../src/services/settlement/settlement-file.parser.ts'),
    'utf8',
  );

  it('KYC memory upload declares fileSize and files limits', () => {
    expect(appSrc).toMatch(/limits:\s*\{\s*fileSize:\s*10\s*\*\s*1024\s*\*\s*1024/);
    expect(appSrc).toMatch(/files:\s*1/);
  });

  it('local disk upload declares a finite fileSize limit', () => {
    expect(appSrc).toMatch(/limits:\s*\{\s*fileSize:\s*50\s*\*\s*1024\s*\*\s*1024/);
  });

  it('terminal and settlement uploads keep explicit size caps', () => {
    expect(terminalSrc).toMatch(/fileSize:\s*10\s*\*\s*1024\s*\*\s*1024/);
    expect(settlementSrc).toMatch(/fileSize:\s*15\s*\*\s*1024\s*\*\s*1024/);
    expect(apkSrc).toMatch(/APK_MAX_BYTES|fileSize:\s*APK_MAX_BYTES/);
  });

  it('settlement xlsx parser enforces byte and row hard caps', () => {
    expect(parserSrc).toMatch(/SETTLEMENT_XLSX_MAX_BYTES/);
    expect(parserSrc).toMatch(/SETTLEMENT_XLSX_MAX_ROWS/);
    expect(parserSrc).toMatch(/buffer\.length\s*>\s*SETTLEMENT_XLSX_MAX_BYTES/);
  });
});
