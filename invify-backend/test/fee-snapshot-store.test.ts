import * as fs from 'fs';
import * as path from 'path';
import { FakeLedgerDb } from './helpers/fake-ledger-db';

let mockDb: FakeLedgerDb;
jest.mock('../src/db/supabase', () => ({
  get supabaseAdmin() {
    return mockDb;
  },
  get supabase() {
    return mockDb;
  },
}));

import { SupabaseFeeAssessmentStore } from '../src/modules/fee-orchestration/stores/SupabaseFeeAssessmentStore';
import { FeeAssessmentLine, FeeAssessmentSnapshot } from '../src/modules/fee-orchestration/types';

function snapshot(overrides: Partial<FeeAssessmentSnapshot> = {}): FeeAssessmentSnapshot {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    mode: 'SHADOW',
    kind: 'ASSESSMENT',
    transaction_type: 'POS_WITHDRAWAL',
    source_system: 'invify.pos',
    source_idempotency_key: 'POS_WITHDRAWAL:t1:R:S',
    transaction_reference: 'tx-1',
    tenant_id: 't1',
    agent_id: null,
    resolved_source: 'GLOBAL_FALLBACK',
    profile_id: 'p',
    profile_version_id: 'v',
    override_version_id: null,
    method: 'PERCENTAGE',
    transaction_amount_kobo: 4000,
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 100,
    max_fee_kobo: 5000,
    calculated_fee_kobo: 50,
    min_applied_kobo: 50,
    cap_applied_kobo: 0,
    final_fee_kobo: 100,
    platform_bps: 4000,
    processor_bps: 3000,
    service_bps: 2000,
    agent_bps: 1000,
    platform_amount_kobo: 40,
    processor_amount_kobo: 30,
    service_amount_kobo: 20,
    agent_amount_kobo: 10,
    ...overrides,
  };
}

function lines(s: FeeAssessmentSnapshot): FeeAssessmentLine[] {
  return [
    { component: 'PLATFORM', amount_kobo: s.platform_amount_kobo, percent_bps: s.platform_bps, ledger_entry_id: null },
    { component: 'PROCESSOR', amount_kobo: s.processor_amount_kobo, percent_bps: s.processor_bps, ledger_entry_id: null },
    { component: 'SERVICE', amount_kobo: s.service_amount_kobo, percent_bps: s.service_bps, ledger_entry_id: null },
    { component: 'AGENT_FEE', amount_kobo: s.agent_amount_kobo, percent_bps: s.agent_bps, ledger_entry_id: null },
  ];
}

beforeEach(() => {
  mockDb = new FakeLedgerDb();
});

describe('R6 SupabaseFeeAssessmentStore snapshot fields', () => {
  it('persists accurate min_applied_kobo (previously hardcoded 0)', async () => {
    const s = snapshot();
    const stored = await new SupabaseFeeAssessmentStore().insert(s, lines(s));
    const row = mockDb.tables.fee_assessments[0];
    expect(row.min_applied_kobo).toBe(50);
    expect(row.cap_applied_kobo).toBe(0);
    expect(stored.snapshot.min_applied_kobo).toBe(50);
    expect(stored.snapshot.cap_applied_kobo).toBe(0);
  });

  it('persists accurate cap_applied_kobo', async () => {
    const s = snapshot({
      id: 'a0000000-0000-4000-8000-000000000002',
      source_idempotency_key: 'POS_WITHDRAWAL:t1:R2:S2',
      transaction_amount_kobo: 1_000_000,
      min_fee_kobo: 0,
      calculated_fee_kobo: 12_500,
      min_applied_kobo: 0,
      cap_applied_kobo: 7500,
      final_fee_kobo: 5000,
      platform_amount_kobo: 2000,
      processor_amount_kobo: 1500,
      service_amount_kobo: 1000,
      agent_amount_kobo: 500,
    });
    await new SupabaseFeeAssessmentStore().insert(s, lines(s));
    const row = mockDb.tables.fee_assessments[0];
    expect(row.cap_applied_kobo).toBe(7500);
    expect(row.min_applied_kobo).toBe(0);
    expect(row.calculated_fee_kobo + row.min_applied_kobo - row.cap_applied_kobo).toBe(row.final_fee_kobo);
  });

  it('historical rows are returned as stored and never rewritten', async () => {
    // Pre-fix historical row: min_applied hardcoded to 0.
    mockDb.tables.fee_assessments = [];
    mockDb.tables.fee_assessments.push({
      id: 'hist-1',
      tenant_id: 't1',
      transaction_type: 'POS_WITHDRAWAL',
      source_system: 'invify.pos',
      source_idempotency_key: 'POS_WITHDRAWAL:t1:OLD:ROW',
      mode: 'SHADOW',
      kind: 'ASSESSMENT',
      principal_amount_kobo: 4000,
      calculated_fee_kobo: 50,
      min_applied_kobo: 0,
      cap_applied_kobo: 0,
      final_fee_kobo: 100,
      method: 'PERCENTAGE',
    });
    const before = JSON.stringify(mockDb.tables.fee_assessments);
    const s = snapshot({ source_idempotency_key: 'POS_WITHDRAWAL:t1:OLD:ROW' });
    const replay = await new SupabaseFeeAssessmentStore().insert(s, lines(s));
    expect(replay.snapshot.id).toBe('hist-1');
    expect(replay.snapshot.min_applied_kobo).toBe(0);
    expect(JSON.stringify(mockDb.tables.fee_assessments)).toBe(before);

    const src = fs.readFileSync(
      path.join(__dirname, '../src/modules/fee-orchestration/stores/SupabaseFeeAssessmentStore.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.upsert\(/);
    expect(src).not.toMatch(/min_applied_kobo: 0/);
  });
});
