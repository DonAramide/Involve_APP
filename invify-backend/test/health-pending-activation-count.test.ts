import { countPendingActivation } from '../src/modules/health-insurance/services/health-report.service';

describe('Pending Activation count', () => {
  test('includes draft and enrolment_pending rows that the school hub shows as waiting', () => {
    expect(countPendingActivation([
      { status: 'draft' },
      { status: 'enrolment_pending' },
      { status: 'awaiting_premium_payment' },
      { status: 'awaiting_insurer_activation' },
      { status: 'awaiting_verification' },
      { status: 'active' },
      { status: 'cancelled' },
    ])).toBe(4);
  });
});
