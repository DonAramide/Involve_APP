export function studentBelongsToTenant(
  student: { school_id?: string | null; tenant_id?: string | null } | null | undefined,
  tenantId: string,
): boolean {
  if (!student || !tenantId) return false;
  const t = tenantId.trim().toLowerCase();
  return [student.school_id, student.tenant_id].some(
    (value) => String(value || '').trim().toLowerCase() === t,
  );
}

export function computeStudentBalanceMismatches(
  students: Array<{
    id: string;
    running_balance?: number | string | null;
    school_id?: string | null;
    tenant_id?: string | null;
  }>,
  ledgerRows: Array<{
    student_id: string;
    amount?: number | string | null;
    school_id?: string | null;
    tenant_id?: string | null;
  }>,
  tenantId: string,
): Array<{
  student_id: string;
  cached_balance: number;
  actual_balance: number;
  mismatch: number;
}> {
  const tenantStudents = students.filter((s) => studentBelongsToTenant(s, tenantId));
  const allowed = new Set(tenantStudents.map((s) => String(s.id)));
  const sums = new Map<string, number>();

  for (const row of ledgerRows) {
    const studentId = String(row.student_id || '');
    if (!allowed.has(studentId)) continue;
    if (
      (row.school_id || row.tenant_id) &&
      !studentBelongsToTenant({ school_id: row.school_id, tenant_id: row.tenant_id }, tenantId)
    ) {
      continue;
    }
    sums.set(studentId, (sums.get(studentId) || 0) + Number(row.amount || 0));
  }

  const mismatches: Array<{
    student_id: string;
    cached_balance: number;
    actual_balance: number;
    mismatch: number;
  }> = [];

  for (const student of tenantStudents) {
    const cached = Number(student.running_balance || 0);
    const actual = sums.get(String(student.id)) || 0;
    if (cached !== actual) {
      mismatches.push({
        student_id: String(student.id),
        cached_balance: cached,
        actual_balance: actual,
        mismatch: cached - actual,
      });
    }
  }

  return mismatches;
}
