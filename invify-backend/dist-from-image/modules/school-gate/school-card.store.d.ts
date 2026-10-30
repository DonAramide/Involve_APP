import { AuditRow, CardRow, SettingsRow, StaffRow, StudentRow, TenantBrief, UserRow } from './school-card.types';
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
export interface MemorySeed {
    tenants: TenantBrief[];
    users: UserRow[];
    students: StudentRow[];
    staff: StaffRow[];
    approvedSignatures?: Array<{
        tenantId: string;
        url: string;
    }>;
}
export declare class MemorySchoolCardStore implements SchoolCardStore {
    readonly mode: "memory";
    sessionCount: number;
    attendanceWrites: number;
    private tenants;
    private users;
    private students;
    private staff;
    private settings;
    private cards;
    private audits;
    private signatures;
    failAuditAction: AuditRow['action'] | null;
    constructor(seed: MemorySeed);
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
    auditCount(): number;
    /** Test hook. Production routes cannot expire a card by rewriting its snapshot. */
    expireForTest(cardId: string): void;
    transaction<T>(work: (journal: CardJournal) => T): T;
    private copyState;
}
export declare class UnappliedSchoolCardStore implements SchoolCardStore {
    readonly mode: "unapplied";
    getTenant(): TenantBrief | null;
    getUser(): UserRow | null;
    getStudent(): StudentRow | null;
    getStaff(): StaffRow | null;
    listStudents(): StudentRow[];
    listStaff(): StaffRow[];
    listAdmins(): UserRow[];
    getSettings(): SettingsRow | null;
    listCards(): CardRow[];
    findCard(): CardRow | null;
    findByHash(): CardRow | null;
    hasApprovedSignature(): boolean;
    rememberApprovedSignature(): void;
    transaction<T>(): T;
}
