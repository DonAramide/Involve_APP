import {
  computeStudentBalanceMismatches,
  studentBelongsToTenant,
} from '../src/utils/student-balance-integrity';

describe('Student balance integrity tenant isolation', () => {
  test('studentBelongsToTenant matches school_id or tenant_id', () => {
    expect(studentBelongsToTenant({ school_id: 'tenant-a', tenant_id: null }, 'tenant-a')).toBe(
      true,
    );
    expect(studentBelongsToTenant({ school_id: null, tenant_id: 'tenant-a' }, 'tenant-a')).toBe(
      true,
    );
    expect(studentBelongsToTenant({ school_id: 'tenant-b', tenant_id: 'tenant-b' }, 'tenant-a')).toBe(
      false,
    );
  });

  test('mismatches ignore other-tenant students even if present in the RPC payload', () => {
    const mismatches = computeStudentBalanceMismatches(
      [
        { id: 'stu-a', running_balance: 10, school_id: 'tenant-a', tenant_id: 'tenant-a' },
        { id: 'stu-b', running_balance: 999, school_id: 'tenant-b', tenant_id: 'tenant-b' },
      ],
      [
        { student_id: 'stu-a', amount: 10, school_id: 'tenant-a', tenant_id: 'tenant-a' },
        { student_id: 'stu-b', amount: 1, school_id: 'tenant-b', tenant_id: 'tenant-b' },
      ],
      'tenant-a',
    );
    expect(mismatches).toEqual([]);
  });

  test('arbitrary student ids from another tenant cannot appear in results', () => {
    const mismatches = computeStudentBalanceMismatches(
      [
        { id: 'stu-a', running_balance: 5, school_id: 'tenant-a' },
        { id: 'stu-b', running_balance: 50, tenant_id: 'tenant-b' },
      ],
      [
        { student_id: 'stu-b', amount: 1, tenant_id: 'tenant-b' },
        { student_id: 'stu-a', amount: 8, school_id: 'tenant-a' },
      ],
      'tenant-a',
    );
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].student_id).toBe('stu-a');
    expect(mismatches[0].actual_balance).toBe(8);
    expect(mismatches.map((m) => m.student_id)).not.toContain('stu-b');
  });

  test('ledger rows tagged to another tenant are dropped even if student id collides', () => {
    const mismatches = computeStudentBalanceMismatches(
      [{ id: 'stu-a', running_balance: 0, school_id: 'tenant-a' }],
      [
        { student_id: 'stu-a', amount: 100, school_id: 'tenant-b', tenant_id: 'tenant-b' },
        { student_id: 'stu-a', amount: 0, school_id: 'tenant-a' },
      ],
      'tenant-a',
    );
    expect(mismatches).toEqual([]);
  });
});
