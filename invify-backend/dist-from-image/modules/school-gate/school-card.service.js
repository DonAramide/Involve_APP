"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolCardService = void 0;
exports.createSchoolCardService = createSchoolCardService;
const crypto_1 = require("crypto");
const school_card_access_1 = require("./school-card.access");
const school_card_errors_1 = require("./school-card.errors");
const school_card_rules_1 = require("./school-card.rules");
const school_card_signature_1 = require("./school-card.signature");
const school_card_token_1 = require("./school-card.token");
const school_card_types_1 = require("./school-card.types");
const REPLACEMENT_REASON = 'Replaced by a new card';
class SchoolCardService {
    store;
    signatureUploader;
    constructor(store, signatureUploader = null) {
        this.store = store;
        this.signatureUploader = signatureUploader;
    }
    templates(actor) {
        (0, school_card_access_1.assertCardManager)(actor);
        return school_card_types_1.TEMPLATE_KEYS;
    }
    getSettings(actor) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        return this.store.getSettings(scope.tenantId) || (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
    }
    saveSettings(actor, patch) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const current = this.store.getSettings(scope.tenantId) || (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
        const next = sanitizeSettings(current, patch, scope.tenantId, scope.userId);
        const approved = new Set();
        if (next.signatureImageUrl && this.store.hasApprovedSignature(scope.tenantId, next.signatureImageUrl)) {
            approved.add(next.signatureImageUrl);
        }
        (0, school_card_rules_1.validateSettings)(next, approved);
        this.store.transaction((journal) => {
            journal.saveSettings(next);
            journal.addAudit({
                tenantId: scope.tenantId,
                actorUserId: scope.userId,
                action: 'settings_saved',
                cardId: null,
                reason: null,
            });
        });
        return next;
    }
    listEligible(actor) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const cards = this.store.listCards(scope.tenantId);
        return {
            students: this.store.listStudents(scope.tenantId).map((row) => this.eligiblePerson('student', row.id, `${row.firstName} ${row.lastName}`.trim(), row.admissionNumber, row.currentClass, cards)),
            staff: this.store.listStaff(scope.tenantId).filter((row) => row.isActive).map((row) => this.eligiblePerson('staff', row.id, row.name, row.staffCode?.trim() || 'STAFF', row.role, cards)),
            administrators: this.store.listAdmins(scope.tenantId).map((row) => this.eligiblePerson('admin', row.id, row.name?.trim() || 'School administrator', 'ADMIN', 'School administrator', cards)),
        };
    }
    listCards(actor) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        return this.store.listCards(scope.tenantId).map(toPublic);
    }
    preview(actor, request) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const identity = this.identity(scope.tenantId, request);
        const settings = this.store.getSettings(scope.tenantId) || (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
        const active = this.activeCard(scope.tenantId, identity.subjectType, identity.subjectId);
        return this.face(scope.tenantId, settings, identity, active, null);
    }
    issue(actor, request) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        if (!this.store.getSettings(scope.tenantId)) {
            throw new school_card_errors_1.SchoolCardError('Save ID card settings before issuing a card.', 409, 'SETTINGS_REQUIRED');
        }
        const identity = this.identity(scope.tenantId, request);
        if (this.activeCard(scope.tenantId, identity.subjectType, identity.subjectId)) {
            throw new school_card_errors_1.SchoolCardError('This person already has an active card. Replace it instead.', 409, 'CARD_ALREADY_ACTIVE');
        }
        const retired = this.latestRetired(scope.tenantId, identity.subjectType, identity.subjectId);
        return this.persistNewCard(scope, identity, retired?.id || null, request.expiresAt);
    }
    replace(actor, cardId) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const current = this.store.findCard(cardId);
        if (!current || current.tenantId !== scope.tenantId || current.status !== 'active') {
            throw new school_card_errors_1.SchoolCardError('The active card for this school could not be found.', 404, 'CARD_NOT_FOUND');
        }
        const identity = this.identityFromCard(current);
        const token = this.tokenFor(identity.predictable);
        const expiresAt = current.expiresAt;
        const issuedAt = new Date().toISOString();
        const next = this.cardRow(scope, identity, token.sha256, issuedAt, expiresAt, current.id);
        this.store.transaction((journal) => {
            journal.insertCard(next);
            journal.addAudit({ tenantId: scope.tenantId, actorUserId: scope.userId, action: 'card_issued', cardId: next.id, reason: null });
            journal.revokeCard(current.id, 'replaced', scope.userId, REPLACEMENT_REASON);
            journal.addAudit({ tenantId: scope.tenantId, actorUserId: scope.userId, action: 'card_revoked', cardId: current.id, reason: REPLACEMENT_REASON });
            journal.activatePending(next.id);
        });
        const settings = this.store.getSettings(scope.tenantId) || (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
        const stored = this.store.findCard(next.id);
        return {
            card: toPublic(stored),
            face: this.face(scope.tenantId, settings, identity, stored, token.raw),
            barcodeValue: token.raw,
        };
    }
    revoke(actor, cardId, reason) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const text = typeof reason === 'string' ? reason.trim() : '';
        if (text.length < 5 || text.length > 500) {
            throw new school_card_errors_1.SchoolCardError('A revocation reason of 5 to 500 characters is required.', 400, 'INVALID_REASON');
        }
        const current = this.store.findCard(cardId);
        if (!current || current.tenantId !== scope.tenantId || current.status !== 'active') {
            throw new school_card_errors_1.SchoolCardError('The active card for this school could not be found.', 404, 'CARD_NOT_FOUND');
        }
        this.store.transaction((journal) => {
            journal.revokeCard(current.id, 'retired', scope.userId, text);
            journal.addAudit({ tenantId: scope.tenantId, actorUserId: scope.userId, action: 'card_revoked', cardId: current.id, reason: text });
        });
        return toPublic(this.store.findCard(current.id));
    }
    batch(actor, people) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        if (!this.store.getSettings(scope.tenantId)) {
            throw new school_card_errors_1.SchoolCardError('Save ID card settings before issuing a card.', 409, 'SETTINGS_REQUIRED');
        }
        if (!Array.isArray(people) || people.length < 1 || people.length > 100) {
            throw new school_card_errors_1.SchoolCardError('Choose between 1 and 100 people.', 400, 'INVALID_BATCH');
        }
        const plans = people.map((person) => this.identity(scope.tenantId, person));
        const seen = new Set();
        for (const identity of plans) {
            const key = `${identity.subjectType}:${identity.subjectId}`;
            if (seen.has(key))
                throw new school_card_errors_1.SchoolCardError('Each person can appear once in a batch.', 400, 'INVALID_BATCH');
            seen.add(key);
        }
        const results = [];
        for (const identity of plans) {
            const active = this.activeCard(scope.tenantId, identity.subjectType, identity.subjectId);
            results.push(active ? this.replace(actor, active.id) : this.issue(actor, { subjectType: identity.subjectType, subjectId: identity.subjectId }));
        }
        return results;
    }
    async acceptSignature(actor, image) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        if (!this.signatureUploader) {
            throw new school_card_errors_1.SchoolCardError(school_card_signature_1.SIGNATURE_STORAGE_PREREQUISITE, 503, 'SIGNATURE_STORAGE_UNCONFIGURED');
        }
        this.requireManager(scope.userId, scope.tenantId);
        const validated = (0, school_card_signature_1.validateSchoolSignature)(image);
        const url = await this.signatureUploader.put({
            tenantId: scope.tenantId,
            body: validated.buffer,
            contentType: validated.contentType,
        });
        if (typeof url !== 'string' || !url.startsWith('https://') || url.toLowerCase().includes('data:')) {
            throw new school_card_errors_1.SchoolCardError('The signature store did not return an access-controlled HTTPS address.', 502, 'INVALID_SIGNATURE');
        }
        this.store.rememberApprovedSignature(scope.tenantId, url);
        return { signatureImageUrl: url };
    }
    myCard(actor) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        const card = this.store.listCards(scope.tenantId).find((row) => row.status === 'active' && row.adminUserId === scope.userId) || null;
        return {
            card: card ? toPublic(card) : null,
            barcodeAvailable: false,
            message: 'The barcode secret is not stored. This screen shows the signed-in administrator card only, and it cannot reconstruct the printed barcode.',
        };
    }
    signatureUnavailable(actor) {
        (0, school_card_access_1.assertCardManager)(actor);
        throw new school_card_errors_1.SchoolCardError(school_card_signature_1.SIGNATURE_STORAGE_PREREQUISITE, 503, 'SIGNATURE_STORAGE_UNCONFIGURED');
    }
    lookupToken(actor, rawToken) {
        const scope = (0, school_card_access_1.assertCardManager)(actor);
        this.requireManager(scope.userId, scope.tenantId);
        if (typeof rawToken !== 'string' || rawToken.trim() === '')
            return null;
        const card = this.store.findByHash(scope.tenantId, (0, school_card_token_1.sha256Hex)(rawToken));
        if (!card || card.status !== 'active')
            return null;
        if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now())
            return null;
        return toPublic(card);
    }
    persistNewCard(scope, identity, replacesCardId, expiresAt) {
        const token = this.tokenFor(identity.predictable);
        const issuedAt = new Date().toISOString();
        const expiry = parseExpiry(issuedAt, expiresAt);
        const next = this.cardRow(scope, identity, token.sha256, issuedAt, expiry, replacesCardId);
        this.store.transaction((journal) => {
            journal.insertCard(next);
            journal.addAudit({ tenantId: scope.tenantId, actorUserId: scope.userId, action: 'card_issued', cardId: next.id, reason: null });
        });
        const settings = this.store.getSettings(scope.tenantId) || (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
        const stored = this.store.findCard(next.id);
        return {
            card: toPublic(stored),
            face: this.face(scope.tenantId, settings, identity, stored, token.raw),
            barcodeValue: token.raw,
        };
    }
    tokenFor(values) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const token = (0, school_card_token_1.createBarcodeToken)();
            try {
                (0, school_card_rules_1.rejectPredictableToken)(token.sha256, values);
                return token;
            }
            catch (error) {
                if (attempt === 2)
                    throw error;
            }
        }
        throw new school_card_errors_1.SchoolCardError('The barcode must be a random secret.', 400, 'INVALID_TOKEN');
    }
    requireManager(userId, tenantId) {
        const user = this.store.getUser(userId);
        if (!user || !user.isActive || user.tenantId !== tenantId) {
            throw new school_card_errors_1.SchoolCardError('ID cards can be managed by the school owner or a tenant administrator.', 403, 'FORBIDDEN');
        }
        (0, school_card_access_1.assertCardManager)({ id: user.id, role: user.role, tenantId: user.tenantId });
        return user;
    }
    identity(tenantId, request) {
        const subjectType = request.subjectType;
        const subjectId = typeof request.subjectId === 'string' ? request.subjectId : '';
        if (subjectType === 'student') {
            const student = this.store.getStudent(subjectId);
            if (!student)
                throw new school_card_errors_1.SchoolCardError('The student does not exist.', 404, 'IDENTITY_NOT_FOUND');
            if (student.tenantId == null || student.tenantId !== tenantId) {
                throw new school_card_errors_1.SchoolCardError('The student does not belong to this school.', 403, 'IDENTITY_FORBIDDEN');
            }
            const printed = (0, school_card_rules_1.printedStudent)(student);
            return { subjectType, subjectId, ...printed, statusLabel: null, predictable: [student.id, student.admissionNumber, student.firstName, student.lastName, printed.printedName] };
        }
        if (subjectType === 'staff') {
            const staff = this.store.getStaff(subjectId);
            if (!staff)
                throw new school_card_errors_1.SchoolCardError('The staff member does not exist.', 404, 'IDENTITY_NOT_FOUND');
            if (staff.tenantId !== tenantId)
                throw new school_card_errors_1.SchoolCardError('The staff member does not belong to this school.', 403, 'IDENTITY_FORBIDDEN');
            if (!staff.isActive)
                throw new school_card_errors_1.SchoolCardError('The staff member is inactive.', 409, 'IDENTITY_INACTIVE');
            const printed = (0, school_card_rules_1.printedStaff)(staff);
            return { subjectType, subjectId, ...printed, statusLabel: 'Active', predictable: [staff.id, staff.staffCode, staff.name, staff.role] };
        }
        if (subjectType === 'admin') {
            const user = this.store.getUser(subjectId);
            if (!user || user.tenantId !== tenantId)
                throw new school_card_errors_1.SchoolCardError('The administrator does not belong to this school.', 403, 'IDENTITY_FORBIDDEN');
            (0, school_card_access_1.assertCardManager)({ id: user.id, role: user.role, tenantId: user.tenantId });
            if (!user.isActive)
                throw new school_card_errors_1.SchoolCardError('The administrator is inactive.', 409, 'IDENTITY_INACTIVE');
            const printed = (0, school_card_rules_1.printedAdmin)(user);
            return { subjectType, subjectId, ...printed, statusLabel: 'Active', predictable: [user.id, user.email, user.name, user.role] };
        }
        throw new school_card_errors_1.SchoolCardError('Choose a student, staff member, or administrator.', 400, 'INVALID_SUBJECT');
    }
    identityFromCard(card) {
        return this.identity(card.tenantId, {
            subjectType: card.subjectType,
            subjectId: card.studentId || card.staffId || card.adminUserId,
        });
    }
    activeCard(tenantId, subjectType, subjectId) {
        return this.store.listCards(tenantId).find((card) => card.status === 'active' && matches(card, subjectType, subjectId)) || null;
    }
    latestRetired(tenantId, subjectType, subjectId) {
        return this.store.listCards(tenantId).find((card) => card.status === 'revoked' && card.revokeKind === 'retired' && matches(card, subjectType, subjectId)) || null;
    }
    cardRow(scope, identity, hash, issuedAt, expiresAt, replacesCardId) {
        return {
            id: (0, crypto_1.randomUUID)(),
            tenantId: scope.tenantId,
            subjectType: identity.subjectType,
            studentId: identity.subjectType === 'student' ? identity.subjectId : null,
            staffId: identity.subjectType === 'staff' ? identity.subjectId : null,
            adminUserId: identity.subjectType === 'admin' ? identity.subjectId : null,
            tokenSha256: hash,
            status: replacesCardId ? 'pending' : 'active',
            issuedAt,
            expiresAt,
            revokedAt: null,
            revokedBy: null,
            revokeKind: null,
            replacesCardId,
            printedName: identity.printedName,
            printedCode: identity.printedCode,
            printedDetail: identity.printedDetail,
            category: identity.subjectType === 'student' ? 'STUDENT' : identity.subjectType === 'staff' ? 'STAFF' : 'ADMIN',
            issuedBy: scope.userId,
        };
    }
    face(tenantId, settings, identity, card, barcodeValue) {
        const tenant = this.store.getTenant(tenantId);
        const templateKey = identity.subjectType === 'student'
            ? settings.studentTemplate
            : identity.subjectType === 'staff'
                ? settings.staffTemplate
                : settings.adminTemplate;
        return {
            pairId: card?.id || identity.subjectId,
            templateKey,
            schoolName: tenant?.name || 'School',
            logoUrl: (0, school_card_rules_1.httpsLogo)(tenant?.logoUrl),
            address: settings.showAddress ? tenant?.address || null : null,
            phone: tenant?.phone || null,
            photoUrl: null,
            initials: initials(identity.printedName),
            fullName: identity.printedName,
            printedCode: identity.printedCode,
            detail: settings.showClassOrDepartment ? identity.printedDetail : null,
            category: identity.subjectType === 'student' ? 'STUDENT' : identity.subjectType === 'staff' ? 'STAFF' : 'ADMIN',
            statusLabel: settings.showStatus ? identity.statusLabel : null,
            barcodeValue,
            barcodeState: barcodeValue ? 'ready' : card ? 'replacement_required' : 'not_issued',
            issuedAt: settings.showIssueDate ? card?.issuedAt || null : null,
            expiresAt: settings.showExpiry ? card?.expiresAt || null : null,
            disclaimer: settings.disclaimer,
            signatoryName: settings.signatoryName,
            signatoryDesignation: settings.signatoryDesignation,
            signatureUrl: settings.signatureImageUrl,
            lostFoundPhone: settings.lostFoundPhone,
            lostFoundEmail: settings.lostFoundEmail,
            logoPlacement: settings.logoPlacement,
            accentColor: settings.accentColor,
            cardWidthMm: settings.cardWidthMm,
            cardHeightMm: settings.cardHeightMm,
            paperSize: settings.paperSize,
            showIssueDate: settings.showIssueDate,
            showExpiry: settings.showExpiry,
        };
    }
    eligiblePerson(subjectType, subjectId, name, printedCode, detail, cards) {
        const active = cards.find((card) => card.status === 'active' && matches(card, subjectType, subjectId));
        return {
            subjectType,
            subjectId,
            name,
            printedCode,
            detail,
            cardStatus: active ? 'active' : cards.some((card) => card.status === 'revoked' && matches(card, subjectType, subjectId)) ? 'revoked' : 'none',
            activeCardId: active?.id || null,
        };
    }
}
exports.SchoolCardService = SchoolCardService;
function sanitizeSettings(current, patch, tenantId, updatedBy) {
    const next = { ...current, tenantId, updatedBy };
    const assign = (key) => {
        if (patch[key] !== undefined)
            next[key] = patch[key];
    };
    assign('studentTemplate');
    assign('staffTemplate');
    assign('adminTemplate');
    assign('paperSize');
    assign('cardWidthMm');
    assign('cardHeightMm');
    assign('printOrientation');
    assign('logoPlacement');
    assign('accentColor');
    assign('showAddress');
    assign('showClassOrDepartment');
    assign('showStatus');
    assign('showIssueDate');
    assign('showExpiry');
    assign('disclaimer');
    assign('signatureImageUrl');
    assign('signatoryName');
    assign('signatoryDesignation');
    assign('lostFoundPhone');
    assign('lostFoundEmail');
    assign('notifyStudentArrival');
    assign('notifyStudentDeparture');
    assign('notifyStaffArrival');
    assign('notifyStaffDeparture');
    assign('trackAdminEntry');
    assign('duplicateScanWindowSeconds');
    if (typeof next.cardWidthMm === 'string')
        next.cardWidthMm = Number(next.cardWidthMm);
    if (typeof next.cardHeightMm === 'string')
        next.cardHeightMm = Number(next.cardHeightMm);
    if (typeof next.duplicateScanWindowSeconds === 'string')
        next.duplicateScanWindowSeconds = Number(next.duplicateScanWindowSeconds);
    return next;
}
function parseExpiry(issuedAt, value) {
    if (value == null || value === '')
        return null;
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new school_card_errors_1.SchoolCardError('The expiry date is not valid.', 400, 'INVALID_EXPIRY');
    }
    if (new Date(value).getTime() <= new Date(issuedAt).getTime()) {
        throw new school_card_errors_1.SchoolCardError('The expiry date must be after the issue date.', 400, 'INVALID_EXPIRY');
    }
    return new Date(value).toISOString();
}
function toPublic(card) {
    return {
        id: card.id,
        subjectType: card.subjectType,
        subjectId: card.studentId || card.staffId || card.adminUserId || '',
        status: card.status,
        category: card.category,
        printedName: card.printedName,
        printedCode: card.printedCode,
        printedDetail: card.printedDetail,
        issuedAt: card.issuedAt,
        expiresAt: card.expiresAt,
        revokeKind: card.revokeKind,
    };
}
function matches(card, subjectType, subjectId) {
    if (card.subjectType !== subjectType)
        return false;
    if (subjectType === 'student')
        return card.studentId === subjectId;
    if (subjectType === 'staff')
        return card.staffId === subjectId;
    return card.adminUserId === subjectId;
}
function initials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}
function createSchoolCardService(store, signatureUploader = null) {
    return new SchoolCardService(store, signatureUploader);
}
//# sourceMappingURL=school-card.service.js.map