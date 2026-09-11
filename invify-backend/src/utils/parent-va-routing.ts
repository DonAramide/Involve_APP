/**
 * Explicit attribution for school virtual-account deposits.
 *
 * Canonical and legacy parent VAs must never be treated as child-owned
 * accounts. Excess over child debt is a parent-level credit on the tablet;
 * this helper only decides webhook / socket identity.
 */

export type DepositCustomer = {
  id?: string | null;
  tenant_id?: string | null;
};

export type DepositStudent = {
  id?: string | null;
  tenant_id?: string | null;
  school_id?: string | null;
  admission_number?: string | null;
};

export type ParentVaAttribution = {
  parentOwned: boolean;
  paidVia: 'parent_account' | 'student_account' | null;
  customerId: string | null;
  studentId: string | null;
  admissionNumber: string | null;
  tenantId: string | null;
};

export function isParentCustomerId(id?: string | null): boolean {
  return typeof id === 'string' && id.startsWith('par-');
}

export function pickParentOwnedAttribution(opts: {
  customers?: DepositCustomer[] | null;
  students?: DepositStudent[] | null;
  /** True when this account number is registered as a parent canonical or legacy VA. */
  parentVaRegistered?: boolean;
  parentCustomerIdHint?: string | null;
}): ParentVaAttribution {
  const customers = opts.customers || [];
  const students = opts.students || [];
  const parentCust = customers.find((c) => isParentCustomerId(c.id));
  const sharedStudentVa = students.length > 1;
  const parentOwned = Boolean(
    parentCust || opts.parentVaRegistered || sharedStudentVa || isParentCustomerId(opts.parentCustomerIdHint),
  );

  if (parentOwned) {
    const tenantId =
      parentCust?.tenant_id ||
      students[0]?.tenant_id ||
      students[0]?.school_id ||
      null;
    const hinted = opts.parentCustomerIdHint && isParentCustomerId(opts.parentCustomerIdHint)
      ? opts.parentCustomerIdHint
      : null;
    return {
      parentOwned: true,
      paidVia: 'parent_account',
      customerId: parentCust?.id || hinted || null,
      studentId: null,
      admissionNumber: null,
      tenantId,
    };
  }

  const cust = customers[0];
  if (cust?.id) {
    const stuKey = String(cust.id).startsWith('stu-') ? String(cust.id) : null;
    return {
      parentOwned: false,
      paidVia: stuKey ? 'student_account' : null,
      customerId: cust.id,
      studentId: stuKey,
      admissionNumber: stuKey ? stuKey.slice(4) : null,
      tenantId: cust.tenant_id || null,
    };
  }

  if (students.length === 1) {
    const s = students[0];
    return {
      parentOwned: false,
      paidVia: 'student_account',
      customerId: typeof s.id === 'string' ? s.id : null,
      studentId: s.id || null,
      admissionNumber: s.admission_number || null,
      tenantId: s.tenant_id || s.school_id || null,
    };
  }

  return {
    parentOwned: false,
    paidVia: null,
    customerId: null,
    studentId: null,
    admissionNumber: null,
    tenantId: null,
  };
}
