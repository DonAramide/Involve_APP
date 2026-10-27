import { vaInwardChargeNaira } from '../src/services/va-inward-charge.service';

describe('VA inward charge deduction', () => {
  it('takes the published fee off the gross credit without exceeding it', () => {
    expect(vaInwardChargeNaira(300, 56)).toBe(56);
    expect(vaInwardChargeNaira(10, 20)).toBe(10);
    expect(vaInwardChargeNaira(300, 0)).toBe(0);
  });
});
