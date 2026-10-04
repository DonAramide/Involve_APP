import { randomUUID } from 'crypto';

type Row = Record<string, any>;

/**
 * Minimal in-memory stand-in for the Supabase client covering the ledger
 * tables and RPCs used by payout / reversal code. RPC semantics mirror
 * 20260710180100_p10_finance_ledger_engine.sql (idempotency, balancing,
 * wallet projection, payout balance lock).
 */
export class FakeLedgerDb {
  tables: Record<string, Row[]> = {
    ledgers: [],
    ledger_entries: [],
    wallets: [],
    transactions_log: [],
  };
  rpcCalls: Array<{ fn: string; args: Row }> = [];
  private rpcChain: Promise<unknown> = Promise.resolve();

  seedWallet(tenantId: string, balance: number) {
    this.tables.wallets.push({ id: randomUUID(), tenant_id: tenantId, balance });
  }

  walletBalance(tenantId: string): number {
    return Number(this.tables.wallets.find((w) => w.tenant_id === tenantId)?.balance ?? 0);
  }

  /** Recomputes USER_WALLET from immutable entries — must always equal the projection. */
  ledgerUserWallet(tenantId: string): number {
    return this.tables.ledger_entries
      .filter((e) => e.tenant_id === tenantId && e.account === 'USER_WALLET')
      .reduce((sum, e) => sum + (e.type === 'CREDIT' ? e.amount : -e.amount), 0);
  }

  accountBalance(tenantId: string, account: string): number {
    return this.tables.ledger_entries
      .filter((e) => e.tenant_id === tenantId && e.account === account)
      .reduce((sum, e) => sum + (e.type === 'CREDIT' ? e.amount : -e.amount), 0);
  }

  from(table: string) {
    if (!this.tables[table]) this.tables[table] = [];
    return new FakeQuery(this, table);
  }

  async rpc(fn: string, args: Row): Promise<{ data: any; error: any }> {
    const run = this.rpcChain.then(() => this.rpcNow(fn, args));
    this.rpcChain = run.then(() => undefined, () => undefined);
    return run;
  }

  private async rpcNow(fn: string, args: Row): Promise<{ data: any; error: any }> {
    this.rpcCalls.push({ fn, args });
    try {
      if (fn === 'process_ledger_double_entry') return { data: this.processDoubleEntry(args), error: null };
      if (fn === 'request_payout_with_lock') return { data: this.requestPayout(args), error: null };
      if (fn === 'request_treasury_withdrawal_with_fee') return { data: this.requestTreasury(args), error: null };
      if (fn === 'post_fee_debit_guarded') return { data: this.postFeeDebit(args), error: null };
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  private processDoubleEntry(args: Row) {
    const { p_tenant_id, p_idempotency_key, p_reference, p_entries, p_metadata } = args;
    if (this.tables.ledgers.some((l) => l.idempotency_key === p_idempotency_key)) {
      return { status: 'DE-DUPLICATED' };
    }
    let credits = 0;
    let debits = 0;
    let walletDelta = 0;
    for (const e of p_entries as Row[]) {
      const amount = Number(e.amount);
      if (!(amount > 0) || !Number.isInteger(amount)) throw new Error('Amounts must be strictly positive integers.');
      if (e.type === 'CREDIT') {
        credits += amount;
        if (e.account === 'USER_WALLET') walletDelta += amount;
      } else if (e.type === 'DEBIT') {
        debits += amount;
        if (e.account === 'USER_WALLET') walletDelta -= amount;
      } else throw new Error(`Invalid entry type: ${e.type}`);
    }
    if (credits !== debits) throw new Error(`Double-entry unbalanced. Credits (${credits}), Debits (${debits})`);
    const ledgerId = randomUUID();
    this.tables.ledgers.push({
      id: ledgerId,
      tenant_id: p_tenant_id,
      reference: p_reference,
      idempotency_key: p_idempotency_key,
      metadata: p_metadata || {},
    });
    for (const e of p_entries as Row[]) {
      this.tables.ledger_entries.push({
        id: randomUUID(),
        ledger_id: ledgerId,
        tenant_id: p_tenant_id,
        account: e.account,
        type: e.type,
        amount: Number(e.amount),
      });
    }
    if (walletDelta !== 0) {
      const wallet = this.tables.wallets.find((w) => w.tenant_id === p_tenant_id);
      if (wallet) wallet.balance += walletDelta;
      else this.tables.wallets.push({ id: randomUUID(), tenant_id: p_tenant_id, balance: walletDelta });
    }
    return { status: 'CREATED', ledger_id: ledgerId };
  }

  private requestTreasury(args: Row) {
    const wallet = this.tables.wallets.find((w) => w.tenant_id === args.p_tenant_id);
    if (!wallet) throw new Error('TREASURY_WALLET_NOT_FOUND');
    if (this.tables.ledgers.some((l) => l.idempotency_key === args.p_idempotency_key)) {
      const existing = this.tables.ledgers.find((l) => l.idempotency_key === args.p_idempotency_key);
      return { status: 'DE-DUPLICATED', ledger_id: existing?.id };
    }
    const feeEntries = (args.p_fee_entries || []) as Row[];
    const feeTotal = feeEntries.reduce((s, e) => s + Number(e.amount || 0), 0);
    const requested = Number(args.p_requested_amount);
    const total = requested + feeTotal;
    if (wallet.balance < total) throw new Error('INSUFFICIENT_BALANCE');
    return this.processDoubleEntry({
      p_tenant_id: args.p_tenant_id,
      p_idempotency_key: args.p_idempotency_key,
      p_reference: args.p_reference,
      p_entries: [
        { account: 'USER_WALLET', type: 'DEBIT', amount: total },
        { account: 'EXTERNAL_BANK', type: 'CREDIT', amount: requested },
        ...feeEntries,
      ],
      p_metadata: args.p_metadata,
    });
  }

  private postFeeDebit(args: Row) {
    const wallet = this.tables.wallets.find((w) => w.tenant_id === args.p_tenant_id);
    if (!wallet) throw new Error('FEE_DEBIT_WALLET_NOT_FOUND');
    if (this.tables.ledgers.some((l) => l.idempotency_key === args.p_idempotency_key)) {
      const existing = this.tables.ledgers.find((l) => l.idempotency_key === args.p_idempotency_key);
      return { status: 'DE-DUPLICATED', ledger_id: existing?.id };
    }
    const debit = ((args.p_entries || []) as Row[])
      .filter((e) => e.account === 'USER_WALLET' && e.type === 'DEBIT')
      .reduce((s, e) => s + Number(e.amount), 0);
    if (wallet.balance < debit) throw new Error('INSUFFICIENT_BALANCE');
    return this.processDoubleEntry(args);
  }

  private requestPayout(args: Row) {
    const wallet = this.tables.wallets.find((w) => w.tenant_id === args.p_tenant_id);
    if (!wallet) throw new Error(`Wallet not found for tenant ${args.p_tenant_id}`);
    if (wallet.balance < args.p_amount) throw new Error(`Insufficient funds. Available: ${wallet.balance}`);
    return this.processDoubleEntry({
      p_tenant_id: args.p_tenant_id,
      p_idempotency_key: args.p_idempotency_key,
      p_reference: args.p_reference,
      p_entries: [
        { account: 'USER_WALLET', type: 'DEBIT', amount: args.p_amount },
        { account: 'EXTERNAL_BANK', type: 'CREDIT', amount: args.p_amount },
      ],
      p_metadata: args.p_metadata,
    });
  }
}

class FakeQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private filters: Array<(row: Row) => boolean> = [];
  private op: 'select' | 'insert' | 'update' = 'select';
  private payload: Row | Row[] | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private countHead = false;
  private limitN: number | null = null;

  constructor(
    private readonly db: FakeLedgerDb,
    private readonly table: string,
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select' && opts?.head) this.countHead = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }
  eq(col: string, value: any) {
    this.filters.push((row) => row[col] === value);
    return this;
  }
  in(col: string, values: any[]) {
    this.filters.push((row) => values.includes(row[col]));
    return this;
  }
  like(col: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`);
    this.filters.push((row) => re.test(String(row[col])));
    return this;
  }
  contains() {
    return this;
  }
  order() {
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  private execute(): { data: any; error: any; count?: number } {
    const rows = this.db.tables[this.table];
    if (this.op === 'insert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const inserted = list.map((r) => ({ id: randomUUID(), ...r }));
      rows.push(...inserted);
      return this.shape(inserted);
    }
    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === 'update') {
      for (const r of matched) Object.assign(r, this.payload);
      return this.shape(matched);
    }
    if (this.countHead) return { data: null, error: null, count: matched.length };
    const limited = this.limitN != null ? matched.slice(0, this.limitN) : matched;
    return this.shape(limited.map((r) => ({ ...r })));
  }

  private shape(rows: Row[]) {
    if (this.mode === 'many') return { data: rows, error: null };
    if (rows.length > 1) return { data: null, error: { message: 'multiple rows' } };
    if (rows.length === 0) {
      return this.mode === 'single' ? { data: null, error: { message: 'no rows' } } : { data: null, error: null };
    }
    return { data: rows[0], error: null };
  }

  then<T1 = any, T2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }
}
