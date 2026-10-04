import * as fs from 'fs';
import * as path from 'path';

describe('platform fee distribution admin wiring', () => {
  it('registers distribution/stakeholder/withdrawal routes before :transactionType', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    const distIdx = app.indexOf("/platform-fees/distribution'");
    const typeIdx = app.indexOf("/platform-fees/:transactionType'");
    expect(distIdx).toBeGreaterThan(0);
    expect(distIdx).toBeLessThan(typeIdx);
    expect(app).toMatch(/\/platform-fees\/stakeholders/);
    expect(app).toMatch(/\/platform-fees\/withdrawals/);
    expect(app).toMatch(/checkRole\(platformFeeAdminRoles\)/);
  });

  it('does not enable live fee charging or real payouts', () => {
    const svc = fs.readFileSync(path.join(__dirname, '../src/services/platform-fee-distribution.service.ts'), 'utf8');
    const engine = fs.readFileSync(path.join(__dirname, '../src/modules/fee-orchestration/FeeDistributionEngine.ts'), 'utf8');
    expect(svc).not.toMatch(/FEE_ORCHESTRATION_LIVE\s*=\s*'true'/);
    expect(svc).not.toMatch(/FEATURE_REAL_MONEY_PAYOUTS\s*=\s*'true'/);
    expect(engine).toMatch(/CONTROL_PLANE_ONLY/);
    expect(engine).toMatch(/completeSettlement\(\): never/);
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
    expect(process.env.FEATURE_REAL_MONEY_PAYOUTS).not.toBe('true');
  });
});
