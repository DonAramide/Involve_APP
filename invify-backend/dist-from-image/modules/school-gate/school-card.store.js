"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnappliedSchoolCardStore = exports.MemorySchoolCardStore = void 0;
const crypto_1 = require("crypto");
const school_card_errors_1 = require("./school-card.errors");
class MemorySchoolCardStore {
    mode = 'memory';
    sessionCount = 0;
    attendanceWrites = 0;
    tenants = new Map();
    users = new Map();
    students = new Map();
    staff = new Map();
    settings = new Map();
    cards = new Map();
    audits = [];
    signatures = new Map();
    failAuditAction = null;
    constructor(seed) {
        seed.tenants.forEach((row) => this.tenants.set(row.id, row));
        seed.users.forEach((row) => this.users.set(row.id, row));
        seed.students.forEach((row) => this.students.set(row.id, row));
        seed.staff.forEach((row) => this.staff.set(row.id, row));
        for (const item of seed.approvedSignatures || []) {
            const set = this.signatures.get(item.tenantId) || new Set();
            set.add(item.url);
            this.signatures.set(item.tenantId, set);
        }
    }
    getTenant(tenantId) {
        return this.tenants.get(tenantId) || null;
    }
    getUser(userId) {
        return this.users.get(userId) || null;
    }
    getStudent(studentId) {
        return this.students.get(studentId) || null;
    }
    getStaff(staffId) {
        return this.staff.get(staffId) || null;
    }
    listStudents(tenantId) {
        return [...this.students.values()].filter((row) => row.tenantId === tenantId);
    }
    listStaff(tenantId) {
        return [...this.staff.values()].filter((row) => row.tenantId === tenantId);
    }
    listAdmins(tenantId) {
        return [...this.users.values()].filter((row) => row.tenantId === tenantId && isManagerRole(row.role) && row.isActive);
    }
    getSettings(tenantId) {
        const row = this.settings.get(tenantId);
        return row ? clone(row) : null;
    }
    listCards(tenantId) {
        return [...this.cards.values()].filter((row) => row.tenantId === tenantId).map((row) => clone(row));
    }
    findCard(cardId) {
        const row = this.cards.get(cardId);
        return row ? clone(row) : null;
    }
    findByHash(tenantId, hash) {
        const row = [...this.cards.values()].find((card) => card.tenantId === tenantId && card.tokenSha256 === hash);
        return row ? clone(row) : null;
    }
    hasApprovedSignature(tenantId, url) {
        return this.signatures.get(tenantId)?.has(url) === true;
    }
    rememberApprovedSignature(tenantId, url) {
        const approved = this.signatures.get(tenantId) || new Set();
        approved.add(url);
        this.signatures.set(tenantId, approved);
    }
    auditCount() {
        return this.audits.length;
    }
    /** Test hook. Production routes cannot expire a card by rewriting its snapshot. */
    expireForTest(cardId) {
        const card = this.cards.get(cardId);
        if (!card)
            return;
        card.expiresAt = new Date(Date.now() - 60_000).toISOString();
    }
    transaction(work) {
        const ops = [];
        const journal = {
            saveSettings: (row) => ops.push({ kind: 'settings', settings: clone(row) }),
            insertCard: (card) => ops.push({ kind: 'insert', card: clone(card) }),
            revokeCard: (cardId, revokeKind, actorUserId, reason) => ops.push({ kind: 'revoke', cardId, revokeKind, actorUserId, reason }),
            activatePending: (cardId) => ops.push({ kind: 'activate', cardId }),
            addAudit: (audit) => {
                if (this.failAuditAction === audit.action) {
                    throw new school_card_errors_1.SchoolCardError('The audit event could not be recorded.', 500, 'AUDIT_FAILED');
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
    copyState() {
        return {
            settings: new Map([...this.settings.entries()].map(([key, value]) => [key, clone(value)])),
            cards: new Map([...this.cards.entries()].map(([key, value]) => [key, clone(value)])),
            audits: this.audits.map((row) => clone(row)),
        };
    }
}
exports.MemorySchoolCardStore = MemorySchoolCardStore;
class UnappliedSchoolCardStore {
    mode = 'unapplied';
    getTenant() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    getUser() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    getStudent() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    getStaff() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    listStudents() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    listStaff() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    listAdmins() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    getSettings() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    listCards() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    findCard() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    findByHash() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    hasApprovedSignature() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    rememberApprovedSignature() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    transaction() {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
}
exports.UnappliedSchoolCardStore = UnappliedSchoolCardStore;
function applyJournal(state, ops) {
    for (const op of ops) {
        if (op.kind === 'settings' && op.settings) {
            state.settings.set(op.settings.tenantId, op.settings);
        }
        if (op.kind === 'insert' && op.card) {
            const card = op.card;
            if (card.replacesCardId == null)
                card.status = 'active';
            else {
                const previous = state.cards.get(card.replacesCardId);
                if (!previous || previous.tenantId !== card.tenantId) {
                    throw new school_card_errors_1.SchoolCardError('The card being replaced is not in this school.', 409, 'REPLACEMENT_REJECTED');
                }
                if (previous.status === 'active')
                    card.status = 'pending';
                else if (previous.status === 'revoked' && previous.revokeKind === 'retired')
                    card.status = 'active';
                else
                    throw new school_card_errors_1.SchoolCardError('The card being replaced is not active.', 409, 'REPLACEMENT_REJECTED');
            }
            assertUnique(state, card);
            state.cards.set(card.id, card);
        }
        if (op.kind === 'revoke' && op.cardId && op.revokeKind && op.actorUserId) {
            const card = state.cards.get(op.cardId);
            if (!card || card.status !== 'active') {
                throw new school_card_errors_1.SchoolCardError('Only an active card can be revoked.', 409, 'CARD_NOT_ACTIVE');
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
                throw new school_card_errors_1.SchoolCardError('Activate the replacement only after the current card is revoked for replacement.', 409, 'REPLACEMENT_REJECTED');
            }
            card.status = 'active';
        }
        if (op.kind === 'audit' && op.audit) {
            state.audits.push({
                ...op.audit,
                id: (0, crypto_1.randomUUID)(),
                occurredAt: new Date().toISOString(),
            });
        }
    }
}
function assertCommit(state, ops) {
    for (const op of ops) {
        if (op.kind === 'settings' && op.settings) {
            const audit = state.audits.find((row) => row.action === 'settings_saved' && row.tenantId === op.settings.tenantId && row.actorUserId === op.settings.updatedBy && row.cardId == null);
            if (!audit)
                throw new school_card_errors_1.SchoolCardError('settings change requires settings_saved audit in the same transaction', 500, 'AUDIT_REQUIRED');
        }
        if (op.kind === 'insert' && op.card) {
            const audit = state.audits.find((row) => row.action === 'card_issued' && row.cardId === op.card.id && row.actorUserId === op.card.issuedBy);
            if (!audit)
                throw new school_card_errors_1.SchoolCardError('card_issued requires an audit event in the same transaction', 500, 'AUDIT_REQUIRED');
        }
        if (op.kind === 'revoke' && op.cardId) {
            const audit = state.audits.find((row) => row.action === 'card_revoked' && row.cardId === op.cardId && row.reason && row.reason.trim().length >= 5);
            if (!audit)
                throw new school_card_errors_1.SchoolCardError('card_revoked requires an audit event in the same transaction', 500, 'AUDIT_REQUIRED');
        }
    }
    for (const card of state.cards.values()) {
        if (card.status === 'pending') {
            throw new school_card_errors_1.SchoolCardError('a replacement card was not activated in the same transaction', 500, 'REPLACEMENT_REJECTED');
        }
        if (card.status === 'revoked' && card.revokeKind === 'replaced') {
            const successor = [...state.cards.values()].find((row) => row.replacesCardId === card.id && row.tenantId === card.tenantId && row.status === 'active' && row.subjectType === card.subjectType && row.studentId === card.studentId && row.staffId === card.staffId && row.adminUserId === card.adminUserId);
            if (!successor) {
                throw new school_card_errors_1.SchoolCardError('replacement revoke requires the new card to be active in the same transaction', 500, 'REPLACEMENT_REJECTED');
            }
        }
        if (card.replacesCardId) {
            const previous = state.cards.get(card.replacesCardId);
            if (!previous || previous.status !== 'revoked') {
                throw new school_card_errors_1.SchoolCardError('the replaced card is still active at commit', 500, 'REPLACEMENT_REJECTED');
            }
        }
    }
}
function assertUnique(state, card) {
    if ([...state.cards.values()].some((row) => row.tokenSha256 === card.tokenSha256)) {
        throw new school_card_errors_1.SchoolCardError('This barcode was already issued.', 409, 'TOKEN_CONFLICT');
    }
    const samePerson = (row) => row.tenantId === card.tenantId && row.subjectType === card.subjectType && row.studentId === card.studentId && row.staffId === card.staffId && row.adminUserId === card.adminUserId;
    if (card.status === 'active' && [...state.cards.values()].some((row) => row.status === 'active' && samePerson(row))) {
        throw new school_card_errors_1.SchoolCardError('This person already has an active card. Replace it instead.', 409, 'CARD_ALREADY_ACTIVE');
    }
    if (card.status === 'pending' && [...state.cards.values()].some((row) => row.status === 'pending' && samePerson(row))) {
        throw new school_card_errors_1.SchoolCardError('A replacement is already in progress for this person.', 409, 'REPLACEMENT_REJECTED');
    }
}
function isManagerRole(role) {
    const tokens = role.toLowerCase().split(',').map((part) => part.trim()).filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => token === 'owner' || token === 'tenant_admin');
}
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
//# sourceMappingURL=school-card.store.js.map