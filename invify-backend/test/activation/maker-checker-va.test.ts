import { virtualAccountGenerationBlockReason, type ActivationGate, type ManualCheck } from '../../src/modules/financial-platform/activation/activation-gate';

function approvedCheck(): ManualCheck {
  return {
    passed: true,
    email: 'maker@school.test',
    checkerEmail: 'checker@school.test',
  };
}

function gate(partial: Partial<ActivationGate> = {}): ActivationGate {
  return {
    checks: {
      cac: approvedCheck(),
      phone_call: approvedCheck(),
      address: approvedCheck(),
    },
    proposal: null,
    ...partial,
  };
}

describe('virtual account maker-checker', () => {
  it('blocks when the maker recorded checks but no second admin approved them', () => {
    const makerOnly = gate();
    makerOnly.checks.cac = { passed: true, email: 'maker@school.test' };
    makerOnly.checks.phone_call = { passed: true, email: 'maker@school.test' };
    makerOnly.checks.address = { passed: true, email: 'maker@school.test' };
    const reason = virtualAccountGenerationBlockReason(makerOnly);
    expect(reason).toMatch(/waiting for a different admin/);
  });

  it('blocks while the proposal is pending a second admin', () => {
    const reason = virtualAccountGenerationBlockReason(gate({
      proposal: {
        id: 'p1',
        makerId: 'maker',
        makerEmail: 'maker@school.test',
        status: 'pending',
        createdAt: '2026-10-04T00:00:00.000Z',
      },
    }));
    expect(reason).toMatch(/waiting for a different admin/);
    expect(reason).toMatch(/maker@school.test/);
  });

  it('blocks a rejected proposal', () => {
    const reason = virtualAccountGenerationBlockReason(gate({
      proposal: {
        id: 'p1',
        makerId: 'maker',
        makerEmail: 'maker@school.test',
        status: 'rejected',
        createdAt: '2026-10-04T00:00:00.000Z',
      },
    }));
    expect(reason).toMatch(/rejected/);
  });

  it('allows generation only after checker approval', () => {
    const reason = virtualAccountGenerationBlockReason(gate({
      proposal: {
        id: 'p1',
        makerId: 'maker',
        makerEmail: 'maker@school.test',
        status: 'approved',
        checkerId: 'checker',
        checkerEmail: 'checker@school.test',
        createdAt: '2026-10-04T00:00:00.000Z',
        decidedAt: '2026-10-04T00:05:00.000Z',
      },
    }));
    expect(reason).toBeNull();
  });

  it('still blocks approved proposals when a required check is missing', () => {
    const incomplete = gate({
      proposal: {
        id: 'p1',
        makerId: 'maker',
        makerEmail: 'maker@school.test',
        status: 'approved',
        createdAt: '2026-10-04T00:00:00.000Z',
      },
    });
    incomplete.checks.phone_call = { passed: false };
    expect(virtualAccountGenerationBlockReason(incomplete)).toMatch(/Manual checks incomplete/);
  });
});
