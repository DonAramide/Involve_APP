const INBOUND = new Set([
  'CREDIT',
  'DEPOSIT',
  'INWARD',
  'INWARD_PAYMENT',
  'VIRTUAL_ACCOUNT_CREDIT',
]);
const OUTBOUND = new Set(['SWEEP', 'DEBIT', 'WITHDRAWAL']);

export function roundNaira(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function extractVaFromMetadata(meta: any): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const candidates = [
    meta.virtualAccountNumber,
    meta.accountNumber,
    meta.virtual_account_number,
    meta.account_number,
    meta?.metadata?.virtualAccountNumber,
    meta?.metadata?.accountNumber,
  ]
    .filter(Boolean)
    .map((v: any) => String(v).trim());
  return candidates[0] || null;
}

function netByVirtualAccount(txns: any[]): {
  pending: Map<string, number>;
  noVaNet: number;
} {
  const pending = new Map<string, number>();
  const seen = new Set<string>();
  let noVaInbound = 0;
  let noVaOutbound = 0;

  for (const tx of txns || []) {
    const amount = Number(tx.amount) || 0;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const type = String(tx.type || '').toUpperCase();
    const isIn = INBOUND.has(type) || type === '';
    const isOut = OUTBOUND.has(type);
    if (!isIn && !isOut) continue;

    const va = extractVaFromMetadata(tx.metadata);
    const ref = String(tx.reference || tx.id || '').trim();
    const key = `${va || 'NOVA'}:${ref || `${type}:${amount}:${tx.created_at || ''}`}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!va) {
      if (isIn) noVaInbound += amount;
      else noVaOutbound += amount;
      continue;
    }

    const current = pending.get(va) || 0;
    pending.set(va, isIn ? current + amount : current - amount);
  }

  for (const [va, amount] of pending.entries()) {
    pending.set(va, Math.max(0, roundNaira(amount)));
  }

  return {
    pending,
    noVaNet: Math.max(0, roundNaira(noVaInbound - noVaOutbound)),
  };
}

function sumForOwners(pending: Map<string, number>, owners: Set<string>): number {
  let total = 0;
  for (const va of owners) {
    total += pending.get(va) || 0;
  }
  return roundNaira(total);
}

export function splitUnsweptVirtualAccountFunds(input: {
  transactions: any[];
  customerVas: string[];
  staffVas: string[];
  studentVas?: string[];
}): {
  total: number;
  customer: number;
  staff: number;
  student: number;
  unmapped: number;
} {
  const { pending, noVaNet } = netByVirtualAccount(input.transactions);
  const customerVas = new Set((input.customerVas || []).map((v) => String(v).trim()).filter(Boolean));
  const staffVas = new Set((input.staffVas || []).map((v) => String(v).trim()).filter(Boolean));
  const studentVas = new Set((input.studentVas || []).map((v) => String(v).trim()).filter(Boolean));

  const customer = sumForOwners(pending, customerVas);
  const staff = sumForOwners(pending, staffVas);
  const student = sumForOwners(pending, studentVas);

  let orphanVa = 0;
  for (const [va, amount] of pending.entries()) {
    if (customerVas.has(va) || staffVas.has(va) || studentVas.has(va)) continue;
    orphanVa += amount;
  }

  const unmapped = roundNaira(orphanVa + noVaNet);
  const total = roundNaira(customer + staff + student + unmapped);

  return {
    total,
    customer,
    staff,
    student,
    unmapped,
  };
}
