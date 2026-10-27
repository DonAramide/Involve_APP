import fs from 'fs';
import path from 'path';
import { isAgentPayoutExecutionEnabled, isFeeOrchestrationLive } from '../src/modules/agent-portal/services/agent-fee-read-model';

describe('agent wallet payout safety', () => {
  test('payout execution remains disabled for this phase', () => {
    process.env.FEATURE_REAL_MONEY_PAYOUTS = 'false';
    process.env.FEE_ORCHESTRATION_LIVE = 'false';
    expect(isFeeOrchestrationLive()).toBe(false);
    expect(isAgentPayoutExecutionEnabled()).toBe(false);
  });

  test('existing wallet withdrawal path is gated PAYOUT_DISABLED', () => {
    const walletSvc = fs.readFileSync(
      path.join(__dirname, '../src/modules/finance/services/wallet.service.ts'),
      'utf8',
    );
    const walletCtl = fs.readFileSync(
      path.join(__dirname, '../src/modules/finance/controllers/wallet.controller.ts'),
      'utf8',
    );
    expect(walletSvc).toMatch(/INSUFFICIENT_AVAILABLE/);
    expect(walletSvc).not.toMatch(/available_balance: newAvailable/);
    expect(walletSvc).toMatch(/PAYOUT_DISABLED/);
    expect(walletCtl).toMatch(/PAYOUT_DISABLED/);
  });
});
