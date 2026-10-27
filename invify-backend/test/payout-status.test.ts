import {
  invifyStatusFromQuasar,
  normalizeQuasarTransferStatus,
  resolveTransferOutcome,
} from '../src/services/payout-status.service';

describe('Quasar payout status mapping', () => {
  test('normalizes Quasar transfer statuses', () => {
    expect(normalizeQuasarTransferStatus('awaiting_approval')).toBe('AWAITING_APPROVAL');
    expect(normalizeQuasarTransferStatus('SUCCESS')).toBe('SUCCESS');
    expect(normalizeQuasarTransferStatus('rejected')).toBe('REJECTED');
    expect(normalizeQuasarTransferStatus('nope')).toBe('UNKNOWN');
  });

  test('does not mark paid on open create statuses', () => {
    expect(invifyStatusFromQuasar('AWAITING_APPROVAL')).toBe('PENDING');
    expect(invifyStatusFromQuasar('PENDING')).toBe('PENDING');
    expect(invifyStatusFromQuasar('PROCESSING')).toBe('PROCESSING');
    expect(invifyStatusFromQuasar('SUCCESS')).toBe('SUCCESS');
    expect(invifyStatusFromQuasar('REJECTED')).toBe('FAILED');
  });

  test('resolves webhook outcomes from event and status', () => {
    expect(resolveTransferOutcome({ event: 'transfer.success' })).toBe('success');
    expect(resolveTransferOutcome({ event: 'transfer.failed', status: 'REJECTED' })).toBe('failed');
    expect(resolveTransferOutcome({ status: 'SUCCESS' })).toBe('success');
    expect(resolveTransferOutcome({ status: 'FAILED' })).toBe('failed');
    expect(resolveTransferOutcome({ status: 'AWAITING_APPROVAL' })).toBe('open');
  });
});
