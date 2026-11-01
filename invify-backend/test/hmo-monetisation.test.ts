import { matchBusinessName, tokenizeBusinessName } from '../src/modules/hmo-monetisation/business-name-match';
import { evaluateHmoChargeability } from '../src/modules/hmo-monetisation/chargeability';
import { evaluateHmoServiceCharge, previewHmoServiceFee } from '../src/modules/hmo-monetisation/hmo-service-fee';
import { gateHmoServiceFeePosting } from '../src/modules/hmo-monetisation/posting-gate';
import {
  BankAccountGovernanceService,
  MemoryBankAccountStore,
  maskAccountNumber,
} from '../src/modules/hmo-monetisation/bank-account-governance.service';
import { InstitutionWithdrawalService } from '../src/modules/hmo-monetisation/institution-withdrawal.service';
import { FeeCalculator } from '../src/modules/fee-orchestration/FeeCalculator';
import { PLATFORM_FEE_TRANSACTION_TYPES } from '../src/services/platform-fee-profiles.service';

const REGISTERED = 'John Mercy School Healthcare';

describe('HMO fee catalog', () => {
  it('includes HMO_SERVICE without removing existing types', () => {
    expect(PLATFORM_FEE_TRANSACTION_TYPES).toEqual([
      'POS_WITHDRAWAL',
      'VIRTUAL_ACCOUNT_INWARD_TRANSFER',
      'TREASURY_WITHDRAWAL',
      'TREASURY_TRANSFER',
      'SMS',
      'AI_TASK',
      'HMO_SERVICE',
    ]);
  });

  it('calculates a global 5% HMO fee in integer kobo', () => {
    const result = FeeCalculator.calculate({
      method: 'PERCENTAGE',
      transactionAmountKobo: 1_000_000,
      percentageBps: 500,
      flatAmountKobo: 0,
      minFeeKobo: 0,
      maxFeeKobo: 0,
    });
    expect(result.final_fee_kobo).toBe(50_000);
  });

  it('calculates a global fixed ₦500 HMO fee', () => {
    const result = FeeCalculator.calculate({
      method: 'FLAT',
      transactionAmountKobo: 1_000_000,
      percentageBps: 0,
      flatAmountKobo: 50_000,
      minFeeKobo: 0,
      maxFeeKobo: 0,
    });
    expect(result.final_fee_kobo).toBe(50_000);
  });
});

describe('HMO chargeability and posting gate', () => {
  it('does not charge drafts, unsubmitted, rejected, or cancelled requests', () => {
    expect(evaluateHmoChargeability({ enrolmentStatus: 'draft', invoicePaid: false }).chargeable).toBe(false);
    expect(evaluateHmoChargeability({ enrolmentStatus: 'enrolment_pending', invoicePaid: false }).chargeable).toBe(false);
    expect(evaluateHmoChargeability({ enrolmentStatus: 'rejected', invoicePaid: true }).chargeable).toBe(false);
    expect(evaluateHmoChargeability({ enrolmentStatus: 'cancelled', invoicePaid: true }).chargeable).toBe(false);
  });

  it('previews a fee after premium payment but never posts', () => {
    const result = evaluateHmoServiceCharge({
      tenantId: 'tenant-1',
      enrolmentId: 'enr-1',
      enrolmentStatus: 'awaiting_insurer_activation',
      invoicePaid: true,
      premiumMinor: 1_000_000,
      paymentId: 'pay-1',
    });
    expect(result.chargeability.chargeable).toBe(true);
    expect(result.preview?.invify_service_fee_kobo).toBe(50_000);
    expect(result.preview?.insurer_premium_kobo).toBe(1_000_000);
    expect(result.wallet_debited).toBe(false);
    expect(result.institution_earning_created).toBe(false);
    expect(result.posting.allowed).toBe(false);
    expect(result.posting.code).toBe('HMO_FEE_OWNERSHIP_UNRESOLVED');
  });

  it('uses the same idempotency key for a retry and still does not debit', () => {
    const first = evaluateHmoServiceCharge({
      tenantId: 't',
      enrolmentId: 'e',
      paymentId: 'p',
      invoicePaid: true,
      enrolmentStatus: 'active',
      premiumMinor: 200_000,
    });
    const second = evaluateHmoServiceCharge({
      tenantId: 't',
      enrolmentId: 'e',
      paymentId: 'p',
      invoicePaid: true,
      enrolmentStatus: 'active',
      premiumMinor: 200_000,
    });
    expect(first.idempotency_key).toBe(second.idempotency_key);
    expect(first.wallet_debited).toBe(false);
    expect(second.wallet_debited).toBe(false);
  });

  it('keeps posting blocked even if live flags are later imagined', () => {
    expect(gateHmoServiceFeePosting().posted).toBe(false);
    expect(previewHmoServiceFee({ premiumMinor: 100_000 }).institution_payable_kobo).toBe(0);
  });
});

describe('business-name matching', () => {
  it('normalizes legal suffixes', () => {
    expect(tokenizeBusinessName('John Mercy School Healthcare Limited')).toEqual([
      'john',
      'mercy',
      'school',
      'healthcare',
    ]);
  });

  it('flags a strong two-or-more token match without auto-approving', () => {
    const result = matchBusinessName(REGISTERED, 'John Mercy School Healthcare Limited');
    expect(result.matchCount).toBeGreaterThanOrEqual(2);
    expect(result.autoApprove).toBe(false);
    expect(result.decision).toBe('PENDING_REVIEW');
  });

  it('treats John Mercy Healthcare as a qualifying overlap', () => {
    const result = matchBusinessName(REGISTERED, 'John Mercy Healthcare');
    expect(result.matchedTokens).toEqual(expect.arrayContaining(['john', 'mercy', 'healthcare']));
    expect(result.autoApprove).toBe(false);
  });

  it('sends John Mercy Ventures to name verification', () => {
    const result = matchBusinessName(REGISTERED, 'John Mercy Ventures');
    expect(result.matchCount).toBe(2);
    expect(result.decision).toBe('PENDING_NAME_VERIFICATION');
  });

  it('requires manual review for no-token and one-token matches', () => {
    expect(matchBusinessName(REGISTERED, 'ABC Ventures Limited').decision).toBe('REQUIRES_MANUAL_REVIEW');
    expect(matchBusinessName(REGISTERED, 'Mercy Ventures').matchCount).toBe(1);
    expect(matchBusinessName(REGISTERED, 'Mercy Ventures').decision).toBe('REQUIRES_MANUAL_REVIEW');
  });

  it('requires manual review for a short John Mercy account name', () => {
    const result = matchBusinessName(REGISTERED, 'John Mercy');
    expect(result.matchCount).toBe(2);
    expect(result.decision).toBe('REQUIRES_MANUAL_REVIEW');
  });

  it('requires manual review for short registered names', () => {
    const result = matchBusinessName('Acme', 'Acme Limited');
    expect(result.decision).toBe('REQUIRES_MANUAL_REVIEW');
  });
});

describe('bank account governance', () => {
  function service() {
    return new BankAccountGovernanceService(new MemoryBankAccountStore());
  }

  it('keeps the approved account active while a replacement is pending', async () => {
    const svc = service();
    const first = await svc.submit({
      entityType: 'INSTITUTION',
      entityId: 'inst-1',
      entityName: REGISTERED,
      requesterUserId: 'maker-1',
      proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0123456789', accountName: 'John Mercy School Healthcare Limited' },
    });
    await svc.decide({ id: first.id, actorId: 'checker-1', action: 'APPROVE' });
    const second = await svc.submit({
      entityType: 'INSTITUTION',
      entityId: 'inst-1',
      entityName: REGISTERED,
      requesterUserId: 'maker-1',
      proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0987654321', accountName: 'John Mercy Healthcare' },
    });
    expect(second.status).not.toBe('APPROVED');
    const approved = await svc.approvedAccount('INSTITUTION', 'inst-1');
    expect(approved?.accountNumber.endsWith('6789')).toBe(true);
  });

  it('rejects maker self-approval and requires a rejection reason', async () => {
    const svc = service();
    const row = await svc.submit({
      entityType: 'TENANT',
      entityId: 'ten-1',
      entityName: REGISTERED,
      requesterUserId: 'maker-1',
      proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0123456789', accountName: 'John Mercy School Healthcare Limited' },
    });
    await expect(svc.decide({ id: row.id, actorId: 'maker-1', action: 'APPROVE' })).rejects.toMatchObject({
      code: 'MAKER_CANNOT_APPROVE',
    });
    await expect(svc.decide({ id: row.id, actorId: 'checker-1', action: 'REJECT', reason: 'no' })).rejects.toBeTruthy();
    const rejected = await svc.decide({ id: row.id, actorId: 'checker-1', action: 'REJECT', reason: 'Name mismatch after review' });
    expect(rejected.status).toBe('REJECTED');
    expect(await svc.approvedAccount('TENANT', 'ten-1')).toBeNull();
  });

  it('blocks duplicate pending account numbers and masks NUBANs', async () => {
    const svc = service();
    await svc.submit({
      entityType: 'TENANT',
      entityId: 'ten-2',
      entityName: REGISTERED,
      requesterUserId: 'maker-2',
      proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0123456789', accountName: 'John Mercy School Healthcare Limited' },
    });
    await expect(
      svc.submit({
        entityType: 'TENANT',
        entityId: 'ten-2',
        entityName: REGISTERED,
        requesterUserId: 'maker-2',
        proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0123456789', accountName: 'John Mercy School Healthcare Limited' },
      }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_BANK_REQUEST' });
    expect(maskAccountNumber('0123456789')).toBe('******6789');
  });
});

describe('institution withdrawals', () => {
  it('rejects unverified accounts, insufficient reserved balance, and duplicate keys', async () => {
    const banks = new BankAccountGovernanceService(new MemoryBankAccountStore());
    const wd = new InstitutionWithdrawalService(banks);
    await expect(
      wd.submit({
        institutionId: 'inst-1',
        institutionActive: true,
        requesterUserId: 'u1',
        amountKobo: 50_000,
        availableKobo: 1_000_000,
      }),
    ).rejects.toMatchObject({ code: 'BANK_ACCOUNT_UNVERIFIED' });

    const created = await banks.submit({
      entityType: 'INSTITUTION',
      entityId: 'inst-1',
      entityName: REGISTERED,
      requesterUserId: 'u1',
      proposed: { bankCode: '058', bankName: 'GTB', accountNumber: '0123456789', accountName: 'John Mercy School Healthcare Limited' },
    });
    await banks.decide({ id: created.id, actorId: 'checker', action: 'APPROVE' });

    const first = await wd.submit({
      institutionId: 'inst-1',
      institutionActive: true,
      requesterUserId: 'u1',
      amountKobo: 50_000,
      availableKobo: 50_000,
      idempotencyKey: 'wd-1',
    });
    expect(first.reserved).toBe(true);
    expect(first.payout.allowed).toBe(false);
    const replay = await wd.submit({
      institutionId: 'inst-1',
      institutionActive: true,
      requesterUserId: 'u1',
      amountKobo: 50_000,
      availableKobo: 50_000,
      idempotencyKey: 'wd-1',
    });
    expect(replay.replayed).toBe(true);
    await expect(
      wd.submit({
        institutionId: 'inst-1',
        institutionActive: true,
        requesterUserId: 'u1',
        amountKobo: 10_000,
        availableKobo: 50_000,
        idempotencyKey: 'wd-2',
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });

    await expect(wd.decide({ id: first.id, actorId: 'u1', action: 'APPROVE' })).rejects.toMatchObject({
      code: 'MAKER_CANNOT_APPROVE',
    });
    const released = await wd.decide({ id: first.id, actorId: 'checker', action: 'RELEASE' });
    expect(released.status).toBe('RELEASED');
    expect(released.reserved).toBe(false);
    expect(released.settled).toBe(false);
  });
});
