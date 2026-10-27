import { randomUUID } from 'crypto';
import { SCHEMA_UNAPPLIED, SchoolCardError } from './school-card.errors';
import {
  AuditRow,
  CardRow,
  SettingsRow,
  StaffRow,
  StudentRow,
  TenantBrief,
  UserRow,
} from './school-card.types';

export interface CardJournal {
  saveSettings(row: SettingsRow): void;
  insertCard(card: CardRow): void;
  revokeCard(cardId: string, kind: 'replaced' | 'retired', actorUserId: string, reason: string): void;
  activatePending(cardId: string): void;
  addAudit(audit: Omit<AuditRow, 'id' | 'occurredAt'>): void;
}

export interface SchoolCardStore {
  readonly mode: 'memory' | 'unapplied';
  getTenant(tenantId: string): TenantBrief | null;
  getUser(userId: string): UserRow | null;
  getStudent(studentId: string): StudentRow | null;
  getStaff(staffId: string): StaffRow | null;
  listStudents(tenantId: string): StudentRow[];
  listStaff(tenantId: string): StaffRow[];
  listAdmins(tenantId: string): UserRow[];
  getSettings(tenantId: string): SettingsRow | null;
  listCards(tenantId: string): CardRow[];
  findCard(cardId: string): CardRow | null;
  findByHash(tenantId: string, hash: string): CardRow | null;
  hasApprovedSignature(tenantId: string, url: string): boolean;
  rememberApprovedSignature(tenantId: string, url: string): void;
  transaction<T>(work: (journal: CardJournal) => T): T;
}

interface JournalOp {
  kind: 'settings' | 'insert' | 'revoke' | 'activate' | 'audit';
  settings?: SettingsRow;
  card?: CardRow;
  cardId?: string;
  revokeKind?: 'replaced' | 'retired';
  actorUserId?: string;
  reason?: string;
  audit?: Omit<AuditRow, 'id' | 'occurredAt'>;
}

export interface MemorySeed {
  tenants: TenantBrief[];
  users: UserRow[];
  students: StudentRow[];
  staff: StaffRow[];
  approvedSignatures?: Array<{ tenantId: string; url: string }>;
}

export class MemorySchoolCardStore implements SchoolCardStore {
  readonly mode = 'memory' as const;
  sessionCount = 0;
  attendanceWrites = 0;
  private tenants = new Map<string, TenantBrief>();
  private users = new Map<string, UserRow>();
  private students = new Map<string, StudentRow>();
  private staff = new Map<string, StaffRow>();
  private settings = new Map<string, SettingsRow>();
  private cards = new Map<string, CardRow>();
  private audits: AuditRow[] = [];
  private signatures = new Map<string, Set<string>>();
  failAuditAction: AuditRow['action'] | null = null;

  constructor(seed: MemorySeed) {
    seed.tenants.forEach((row) => this.tenants.set(row.id, row));
    seed.users.forEach((row) => this.users.set(row.id, row));
    seed.students.forEach((row) => this.students.set(row.id, row));
    seed.staff.forEach((row) => this.staff.set(row.id, row));
    for (const item of seed.approvedSignatures || []) {
      const set = this.signatures.get(item.tenantId) || new Set<string>();
      set.add(item.url);
      this.signatures.set(item.tenantId, set);
    }
  }

  getTenant(tenantId: string): TenantBrief | null {
    return this.tenants.get(tenantId) || null;
  }

  getUser(userId: string): UserRow | null {
    return this.users.get(userId) || null;
  }

  getStudent(studentId: string): StudentRow | null {
    return this.students.get(studentId) || null;
  }

  getStaff(staffId: string): StaffRow | null {
    return this.staff.get(staffId) || null;
  }

  listStudents(tenantId: string): StudentRow[] {
    return [...this.students.values()].filter((row) => row.tenantId === tenantId);
  }

  listStaff(tenantId: string): StaffRow[] {
    return [...this.staff.values()].filter((row) => row.tenantId === tenantId);
  }

  listAdmins(tenantId: string): UserRow[] {
    return [...this.users.values()].filter((row) => row.tenantId === tenantId && isManagerRole(row.role) && row.isActive);
  }

  getSettings(tenantId: string): SettingsRow | null {
    const row = this.settings.get(tenantId);
    return row ? clone(row) : null;
  }

  listCards(tenantId: string): CardRow[] {
    return [...this.cards.values()].filter((row) => row.tenantId === tenantId).map((row) => clone(row));
  }

  findCard(cardId: string): CardRow | null {
    const row = this.cards.get(cardId);
    return row ? clone(row) : null;
  }

  findByHash(tenantId: string, hash: string): CardRow | null {
    const row = [...this.cards.values()].find((card) => card.tenantId === tenantId && card.tokenSha256 === hash);
    return row ? clone(row) : null;
  }

  hasApprovedSignature(tenantId: string, url: string): boolean {
    return this.signatures.get(tenantId)?.has(url) === true;
  }

  rememberApprovedSignature(tenantId: string, url: string): void {
    const approved = this.signatures.get(tenantId) || new Set<string>();
    approved.add(url);
    this.signatures.set(tenantId, approved);
  }

  auditCount(): number {
    return this.audits.length;
  }

  /** Test hook. Production routes cannot expire a card by rewriting its snapshot. */
  expireForTest(cardId: string): void {
    const card = this.cards.get(cardId);
    if (!card) return;
    card.expiresAt = new Date(Date.now() - 60_000).toISOString();
  }

  transaction<T>(work: (journal: CardJournal) => T): T {
    const ops: JournalOp[] = [];
    const journal: CardJournal = {
      saveSettings: (row) => ops.push({ kind: 'settings', settings: clone(row) }),
      insertCard: (card) => ops.push({ kind: 'insert', card: clone(card) }),
      revokeCard: (cardId, revokeKind, actorUserId, reason) => ops.push({ kind: 'revoke', cardId, revokeKind, actorUserId, reason }),
      activatePending: (cardId) => ops.push({ kind: 'activate', cardId }),
      addAudit: (audit) => {
        if (this.failAuditAction === audit.action) {
          throw new SchoolCardError('The audit event could not be recorded.', 500, 'AUDIT_FAILED');
        }
        ops.push({ kind: 'audit', audit: { ...audit } });
      },
    };
    const result = work(journal);
    const next = this.copyState();
    applyJournal(next, ops);
    assertCommit(next, ops);
    this.settings = next.settings;
    this.cards = next.cards;
    this.audits = next.audits;
    return result;
  }

  private copyState(): StoreState {
    return {
      settings: new Map([...this.settings.entries()].map(([key, value]) => [key, clone(value)])),
      cards: new Map([...this.cards.entries()].map(([key, value]) => [key, clone(value)])),
      audits: this.audits.map((row) => clone(row)),
    };
  }
}

export class UnappliedSchoolCardStore implements SchoolCardStore {
  readonly mode = 'unapplied' as const;

  getTenant(): TenantBrief | null {
    throw SCHEMA_UNAPPLIED;
  }
  getUser(): UserRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  getStudent(): StudentRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  getStaff(): StaffRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  listStudents(): StudentRow[] {
    throw SCHEMA_UNAPPLIED;
  }
  listStaff(): StaffRow[] {
    throw SCHEMA_UNAPPLIED;
  }
  listAdmins(): UserRow[] {
    throw SCHEMA_UNAPPLIED;
  }
  getSettings(): SettingsRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  listCards(): CardRow[] {
    throw SCHEMA_UNAPPLIED;
  }
  findCard(): CardRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  findByHash(): CardRow | null {
    throw SCHEMA_UNAPPLIED;
  }
  hasApprovedSignature(): boolean {
    throw SCHEMA_UNAPPLIED;
  }
  rememberApprovedSignature(): void {
    throw SCHEMA_UNAPPLIED;
  }
  transaction<T>(): T {
    throw SCHEMA_UNAPPLIED;
  }
}

interface StoreState {
  settings: Map<string, SettingsRow>;
  cards: Map<string, CardRow>;
  audits: AuditRow[];
}

function applyJournal(state: StoreState, ops: JournalOp[]): void {
  for (const op of ops) {
    if (op.kind === 'settings' && op.settings) {
      state.settings.set(op.settings.tenantId, op.settings);
    }
    if (op.kind === 'insert' && op.card) {
      const card = op.card;
      if (card.replacesCardId == null) card.status = 'active';
      else {
        const previous = state.cards.get(card.replacesCardId);
        if (!previous || previous.tenantId !== card.tenantId) {
          throw new SchoolCardError('The card being replaced is not in this school.', 409, 'REPLACEMENT_REJECTED');
        }
        if (previous.status === 'active') card.status = 'pending';
        else if (previous.status === 'revoked' && previous.revokeKind === 'retired') card.status = 'active';
        else throw new SchoolCardError('The card being replaced is not active.', 409, 'REPLACEMENT_REJECTED');
      }
      assertUnique(state, card);
      state.cards.set(card.id, card);
    }
    if (op.kind === 'revoke' && op.cardId && op.revokeKind && op.actorUserId) {
      const card = state.cards.get(op.cardId);
      if (!card || card.status !== 'active') {
        throw new SchoolCardError('Only an active card can be revoked.', 409, 'CARD_NOT_ACTIVE');
      }
      card.status = 'revoked';
      card.revokeKind = op.revokeKind;
      card.revokedBy = op.actorUserId;
      card.revokedAt = new Date().toISOString();
    }
    if (op.kind === 'activate' && op.cardId) {
      const card = state.cards.get(op.cardId);
      const previous = card?.replacesCardId ? state.cards.get(card.replacesCardId) : null;
      if (!card || card.status !== 'pending' || !previous || previous.status !== 'revoked' || previous.revokeKind !== 'replaced') {
        throw new SchoolCardError('Activate the replacement only after the current card is revoked for replacement.', 409, 'REPLACEMENT_REJECTED');
      }
      card.status = 'active';
    }
    if (op.kind === 'audit' && op.audit) {
      state.audits.push({
        ...op.audit,
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
      });
    }
  }
}

function assertCommit(state: StoreState, ops: JournalOp[]): void {
  for (const op of ops) {
    if (op.kind === 'settings' && op.settings) {
      const audit = state.audits.find((row) => row.action === 'settings_saved' && row.tenantId === op.settings!.tenantId && row.actorUserId === op.settings!.updatedBy && row.cardId == null);
      if (!audit) throw new SchoolCardError('settings change requires settings_saved audit in the same transaction', 500, 'AUDIT_REQUIRED');
    }
    if (op.kind === 'insert' && op.card) {
      const audit = state.audits.find((row) => row.action === 'card_issued' && row.cardId === op.card!.id && row.actorUserId === op.card!.issuedBy);
      if (!audit) throw new SchoolCardError('card_issued requires an audit event in the same transaction', 500, 'AUDIT_REQUIRED');
    }
    if (op.kind === 'revoke' && op.cardId) {
      const audit = state.audits.find((row) => row.action === 'card_revoked' && row.cardId === op.cardId && row.reason && row.reason.trim().length >= 5);
      if (!audit) throw new SchoolCardError('card_revoked requires an audit event in the same transaction', 500, 'AUDIT_REQUIRED');
    }
  }
  for (const card of state.cards.values()) {
    if (card.status === 'pending') {
      throw new SchoolCardError('a replacement card was not activated in the same transaction', 500, 'REPLACEMENT_REJECTED');
    }
    if (card.status === 'revoked' && card.revokeKind === 'replaced') {
      const successor = [...state.cards.values()].find((row) => row.replacesCardId === card.id && row.tenantId === card.tenantId && row.status === 'active' && row.subjectType === card.subjectType && row.studentId === card.studentId && row.staffId === card.staffId && row.adminUserId === card.adminUserId);
      if (!successor) {
        throw new SchoolCardError('replacement revoke requires the new card to be active in the same transaction', 500, 'REPLACEMENT_REJECTED');
      }
    }
    if (card.replacesCardId) {
      const previous = state.cards.get(card.replacesCardId);
      if (!previous || previous.status !== 'revoked') {
        throw new SchoolCardError('the replaced card is still active at commit', 500, 'REPLACEMENT_REJECTED');
      }
    }
  }
}

function assertUnique(state: StoreState, card: CardRow): void {
  if ([...state.cards.values()].some((row) => row.tokenSha256 === card.tokenSha256)) {
    throw new SchoolCardError('This barcode was already issued.', 409, 'TOKEN_CONFLICT');
  }
  const samePerson = (row: CardRow) => row.tenantId === card.tenantId && row.subjectType === card.subjectType && row.studentId === card.studentId && row.staffId === card.staffId && row.adminUserId === card.adminUserId;
  if (card.status === 'active' && [...state.cards.values()].some((row) => row.status === 'active' && samePerson(row))) {
    throw new SchoolCardError('This person already has an active card. Replace it instead.', 409, 'CARD_ALREADY_ACTIVE');
  }
  if (card.status === 'pending' && [...state.cards.values()].some((row) => row.status === 'pending' && samePerson(row))) {
    throw new SchoolCardError('A replacement is already in progress for this person.', 409, 'REPLACEMENT_REJECTED');
  }
}

function isManagerRole(role: string): boolean {
  const tokens = role.toLowerCase().split(',').map((part) => part.trim()).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => token === 'owner' || token === 'tenant_admin');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
