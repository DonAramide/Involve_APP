import { pickParentOwnedAttribution } from '../src/utils/parent-va-routing';

describe('pickParentOwnedAttribution', () => {
  it('prefers par-* customer over sibling student customers sharing the canonical VA', () => {
    const result = pickParentOwnedAttribution({
      customers: [
        { id: 'stu-A', tenant_id: 't1' },
        { id: 'par-family-1', tenant_id: 't1' },
        { id: 'stu-B', tenant_id: 't1' },
      ],
      students: [
        { id: 's1', tenant_id: 't1', admission_number: 'A' },
        { id: 's2', tenant_id: 't1', admission_number: 'B' },
      ],
    });
    expect(result.parentOwned).toBe(true);
    expect(result.paidVia).toBe('parent_account');
    expect(result.customerId).toBe('par-family-1');
    expect(result.studentId).toBeNull();
    expect(result.admissionNumber).toBeNull();
  });

  it('treats a registered legacy VA as parent-owned even if one child still has that number', () => {
    const result = pickParentOwnedAttribution({
      customers: [{ id: 'par-family-1-legacy-2222', tenant_id: 't1' }],
      students: [{ id: 's2', tenant_id: 't1', admission_number: 'B' }],
      parentVaRegistered: true,
    });
    expect(result.parentOwned).toBe(true);
    expect(result.studentId).toBeNull();
    expect(result.customerId).toBe('par-family-1-legacy-2222');
  });

  it('does not pin a child when several students share the same VA and no par-* row exists yet', () => {
    const result = pickParentOwnedAttribution({
      customers: [
        { id: 'uuid-child-a', tenant_id: 't1' },
        { id: 'uuid-child-b', tenant_id: 't1' },
      ],
      students: [
        { id: 's1', tenant_id: 't1', admission_number: 'A' },
        { id: 's2', tenant_id: 't1', admission_number: 'B' },
      ],
    });
    expect(result.parentOwned).toBe(true);
    expect(result.studentId).toBeNull();
  });

  it('allows a genuine unlinked student VA when no parent registry exists', () => {
    const result = pickParentOwnedAttribution({
      customers: [{ id: 'stu-ADM1', tenant_id: 't1' }],
      students: [{ id: 's1', tenant_id: 't1', admission_number: 'ADM1' }],
    });
    expect(result.parentOwned).toBe(false);
    expect(result.paidVia).toBe('student_account');
    expect(result.studentId).toBe('stu-ADM1');
    expect(result.admissionNumber).toBe('ADM1');
  });
});
