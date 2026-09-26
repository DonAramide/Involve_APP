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

/** Quasar sandbox `availableBalance` is kobo when it is an integer string ("450" = ₦4.50). */
export function sandboxBalanceToNaira(account: any): number {
  const raw = account?.availableBalance ?? account?.available_balance;
  if (raw == null || raw === '') {
    const kobo = Number(account?.balance_kobo);
    return Number.isFinite(kobo) ? roundNaira(kobo / 100) : 0;
  }
  const asNum = Number(raw);
  if (!Number.isFinite(asNum)) return 0;
  if (String(raw).includes('.')) return roundNaira(asNum);
  return roundNaira(asNum / 100);
}

export function sumQuasarSandboxBalancesNaira(accounts: any[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const account of accounts || []) {
    const key = String(
      account?.accountNumber ||
        account?.account_number ||
        account?.id ||
        '',
    ).trim();
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    total += sandboxBalanceToNaira(account);
  }
  return roundNaira(total);
}

/** Prefer Quasar's exact naira (2.50) over BIGINT-truncated amount (2). */
export function transactionAmountNaira(tx: any): number {
  const meta = tx?.metadata && typeof tx.metadata === 'object' ? tx.metadata : {};
  const exact = Number(meta.amountNaira ?? meta.amount_naira ?? meta.amountRaw);
  if (Number.isFinite(exact) && exact > 0) return roundNaira(exact);
  return roundNaira(Number(tx?.amount) || 0);
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
    const amount = transactionAmountNaira(tx);
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
  parentVas?: string[];
}): {
  total: number;
  customer: number;
  staff: number;
  student: number;
  parent: number;
  unmapped: number;
} {
  const { pending, noVaNet } = netByVirtualAccount(input.transactions);
  const customerVas = new Set((input.customerVas || []).map((v) => String(v).trim()).filter(Boolean));
  const staffVas = new Set((input.staffVas || []).map((v) => String(v).trim()).filter(Boolean));
  const studentVas = new Set((input.studentVas || []).map((v) => String(v).trim()).filter(Boolean));
  const parentVas = new Set((input.parentVas || []).map((v) => String(v).trim()).filter(Boolean));

  const customer = sumForOwners(pending, customerVas);
  const staff = sumForOwners(pending, staffVas);
  const student = sumForOwners(pending, studentVas);
  const parent = sumForOwners(pending, parentVas);

  let orphanVa = 0;
  for (const [va, amount] of pending.entries()) {
    if (customerVas.has(va) || staffVas.has(va) || studentVas.has(va) || parentVas.has(va)) continue;
    orphanVa += amount;
  }

  const unmapped = roundNaira(orphanVa + noVaNet);
  const total = roundNaira(customer + staff + student + parent + unmapped);

  return {
    total,
    customer,
    staff,
    student,
    parent,
    unmapped,
  };
}

export function pendingFundsByVa(txns: any[]): Map<string, number> {
  return netByVirtualAccount(txns).pending
}

export function isCardPaymentRail(tx: any): boolean {
  const blob = [
    tx?.type,
    tx?.channel,
    tx?.provider,
    tx?.metadata?.payment_method,
    tx?.metadata?.paidVia,
    tx?.metadata?.channel,
    tx?.entry_type,
  ]
    .join(' ')
    .toLowerCase()
  return /card|pos|emv|mpos|kimono|nibss/.test(blob) && !/virtual.?account|va_transfer/.test(blob)
}

export function isUnsettledCardStatus(value: any): boolean {
  const s = String(value || '').toLowerCase()
  if (!s) return true
  return !['settled', 'paid', 'swept', 'payout', 'cleared'].some((k) => s.includes(k))
}

export function unsettledCardByTenant(input: {
  posAttempts?: any[]
  transactions?: any[]
}): Map<string, number> {
  const totals = new Map<string, number>()
  const add = (tenantId: any, amount: number) => {
    const id = String(tenantId || '').trim()
    if (!id || !Number.isFinite(amount) || amount <= 0) return
    totals.set(id, roundNaira((totals.get(id) || 0) + amount))
  }

  for (const row of input.posAttempts || []) {
    const approved = String(row.status || '').toLowerCase() === 'approved'
    if (!approved || !isUnsettledCardStatus(row.settlement_status)) continue
    add(row.tenant_id, Number(row.amount || 0))
  }

  for (const tx of input.transactions || []) {
    if (!isCardPaymentRail(tx)) continue
    if (extractVaFromMetadata(tx.metadata)) continue
    const settlement = tx.settlement_status || tx.metadata?.settlement_status
    if (!isUnsettledCardStatus(settlement)) continue
    add(tx.tenant_id, transactionAmountNaira(tx))
  }

  return totals
}

export function pendingFundsByTenant(txns: any[]): Map<string, number> {
  const byTenant = new Map<string, any[]>()
  for (const tx of txns || []) {
    const tenantId = String(tx.tenant_id || '').trim()
    if (!tenantId) continue
    if (!byTenant.has(tenantId)) byTenant.set(tenantId, [])
    byTenant.get(tenantId)!.push(tx)
  }
  const totals = new Map<string, number>()
  for (const [tenantId, rows] of byTenant.entries()) {
    const net = netByVirtualAccount(rows)
    let sum = net.noVaNet
    for (const amount of net.pending.values()) sum += amount
    totals.set(tenantId, roundNaira(sum))
  }
  return totals
}

export function virtualAccountMatches(tx: any, accountNumber: string): boolean {
  const va = String(accountNumber || '').trim()
  if (!va) return false
  const digits = (value: any) => String(value || '').replace(/\D/g, '')
  const want = digits(va)
  let meta = tx?.metadata || {}
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta) } catch { meta = {} }
  }
  const candidates = [
    meta.virtualAccountNumber,
    meta.accountNumber,
    meta.virtual_account_number,
    meta.account_number,
    meta?.metadata?.virtualAccountNumber,
    meta?.metadata?.accountNumber,
    extractVaFromMetadata(meta),
    tx?.reference,
  ]
    .filter(Boolean)
    .map((v: any) => String(v).trim())
  if (candidates.includes(va) || (want.length >= 8 && candidates.some((c) => digits(c) === want))) {
    return true
  }
  if (want.length >= 8) {
    const blob = JSON.stringify(meta || {}) + String(tx?.reference || '')
    if (blob.includes(va) || digits(blob).includes(want)) return true
  }
  return false
}

export function formatVaTransaction(tx: any) {
  const rawType = String(tx?.type || 'CREDIT').toUpperCase()
  const type = ['DEBIT', 'SWEEP', 'WITHDRAWAL', 'PAYOUT'].some((k) => rawType.includes(k))
    ? 'DEBIT'
    : 'CREDIT'
  return {
    id: tx.id,
    amount: transactionAmountNaira(tx),
    type,
    reference: tx.reference || tx.id,
    status: tx.status || 'SUCCESS',
    createdAt: tx.created_at || tx.timestamp || null,
    channel: tx.metadata?.paidVia || tx.metadata?.channel || tx.metadata?.provider || 'Quasar VA',
    metadata: tx.metadata || {},
  }
}
