/**
 * Phase 1.1 — FinancialEventService.emit lifecycle contract (isolated).
 *
 * Documents current emit-path behaviour without inventing Product/Finance
 * terminal-state transitions (INITIALIZED → COMPLETED remains OPEN under OTC-004).
 */
import { FinancialEventService } from '../src/services/event.service';
import { supabaseAdmin } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

type InsertRow = Record<string, unknown>;

function mockInsertChain(result: { data: InsertRow | null; error: { code?: string; message: string } | null }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  (supabaseAdmin.from as jest.Mock).mockReturnValue({ insert });
  return { insert, select, single };
}

describe('FinancialEventService.emit lifecycle contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inserts without an explicit state field (DB default / INITIALIZED path)', async () => {
    const { insert } = mockInsertChain({
      data: { id: 'evt-1', reference: 'REF-1' },
      error: null,
    });

    await FinancialEventService.emit({
      type: 'payment.success',
      reference: 'REF-1',
      tenantId: 'tenant-a',
      amount: 1500,
      idempotencyKey: 'event:payment.success:REF-1',
      metadata: { source: 'unit' },
    });

    expect(supabaseAdmin.from).toHaveBeenCalledWith('financial_events');
    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0] as InsertRow;
    expect(payload).toMatchObject({
      event_type: 'INWARD_PAYMENT',
      type: 'payment.success',
      reference: 'REF-1',
      tenant_id: 'tenant-a',
      amount: 1500,
      idempotency_key: 'event:payment.success:REF-1',
    });
    expect(payload).not.toHaveProperty('state');
    expect(payload).not.toHaveProperty('status');
  });

  it('ignores duplicate idempotency conflicts (23505) without throwing', async () => {
    mockInsertChain({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });

    await expect(
      FinancialEventService.emit({
        type: 'payment.success',
        reference: 'REF-DUP',
        tenantId: 'tenant-a',
        amount: 100,
        idempotencyKey: 'event:payment.success:REF-DUP',
      }),
    ).resolves.toBeUndefined();
  });

  it('does not expose a completion/transition API on FinancialEventService', () => {
    const proto = FinancialEventService as unknown as Record<string, unknown>;
    expect(typeof FinancialEventService.emit).toBe('function');
    expect(proto.complete).toBeUndefined();
    expect(proto.markCompleted).toBeUndefined();
    expect(proto.transition).toBeUndefined();
    expect(proto.fail).toBeUndefined();
  });
});
