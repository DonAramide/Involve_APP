"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHOOL_CARD_SCHEMA_PROBE = void 0;
exports.schoolCardSqlRequested = schoolCardSqlRequested;
exports.schemaProbeIsReady = schemaProbeIsReady;
exports.withConfirmedSchoolCardDatabase = withConfirmedSchoolCardDatabase;
exports.issueCardThroughDatabase = issueCardThroughDatabase;
exports.replaceCardThroughDatabase = replaceCardThroughDatabase;
exports.revokeCardThroughDatabase = revokeCardThroughDatabase;
exports.saveSettingsThroughDatabase = saveSettingsThroughDatabase;
exports.readSettingsThroughDatabase = readSettingsThroughDatabase;
exports.listCardsThroughDatabase = listCardsThroughDatabase;
exports.readMyCardThroughDatabase = readMyCardThroughDatabase;
exports.listEligibleThroughDatabase = listEligibleThroughDatabase;
exports.previewThroughDatabase = previewThroughDatabase;
exports.batchThroughDatabase = batchThroughDatabase;
const school_card_errors_1 = require("./school-card.errors");
const school_card_access_1 = require("./school-card.access");
const school_card_rules_1 = require("./school-card.rules");
const school_card_sql_1 = require("./school-card.sql");
const school_card_token_1 = require("./school-card.token");
const school_card_rules_2 = require("./school-card.rules");
const crypto_1 = require("crypto");
/**
 * Fail closed. Real requests stay on the unapplied store unless
 * SCHOOL_ID_CARD_SQL=on and the probe below finds the applied schema.
 * This module does not connect at import time. The pool is loaded only
 * inside withConfirmedSchoolCardDatabase, and only after that flag is on.
 * Use getClient() from src/db/pg.ts. Do not use dbQuery: it logs SQL text.
 */
exports.SCHOOL_CARD_SCHEMA_PROBE = `
SELECT (
  to_regclass('public.school_id_cards') IS NOT NULL
  AND to_regclass('public.school_id_card_settings') IS NOT NULL
  AND to_regclass('public.school_gate_audit_events') IS NOT NULL
  AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL
  AND (
    SELECT count(*)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'school_id_cards'
      AND NOT t.tgisinternal
      AND (
        (t.tgname = 'trg_school_id_cards_guard' AND NOT t.tgdeferrable)
        OR (t.tgname = 'trg_school_id_cards_audit' AND t.tgdeferrable AND t.tginitdeferred)
      )
  ) = 2
) AS ready
`;
function schoolCardSqlRequested() {
    return process.env.SCHOOL_ID_CARD_SQL === 'on';
}
function schemaProbeIsReady(row) {
    return row?.ready === true;
}
async function withConfirmedSchoolCardDatabase(work) {
    if (!schoolCardSqlRequested()) {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    let client;
    try {
        const loaded = await Promise.resolve().then(() => __importStar(require('../../db/pg')));
        client = await loaded.getClient();
    }
    catch {
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    try {
        const probe = await client.query(exports.SCHOOL_CARD_SCHEMA_PROBE);
        if (!schemaProbeIsReady(probe.rows[0])) {
            throw school_card_errors_1.SCHEMA_UNAPPLIED;
        }
        return await work(client);
    }
    catch (error) {
        if (error instanceof school_card_errors_1.SchoolCardError)
            throw error;
        const message = error instanceof Error ? error.message : '';
        if (message.startsWith('school gate:')) {
            throw new school_card_errors_1.SchoolCardError(message, 409, 'SCHOOL_GATE_REJECTED');
        }
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
        if (code === '23505') {
            throw new school_card_errors_1.SchoolCardError('This person already has an active card. Replace it instead.', 409, 'CARD_ALREADY_ACTIVE');
        }
        throw school_card_errors_1.SCHEMA_UNAPPLIED;
    }
    finally {
        client.release();
    }
}
async function issueCardThroughDatabase(actor, request) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    const subjectType = request.subjectType;
    if (subjectType !== 'student' && subjectType !== 'staff' && subjectType !== 'admin') {
        throw new school_card_errors_1.SchoolCardError('Choose a student, staff member, or administrator.', 400, 'INVALID_SUBJECT');
    }
    const subjectId = typeof request.subjectId === 'string' ? request.subjectId : '';
    const token = (0, school_card_token_1.createBarcodeToken)();
    const card = {
        id: (0, crypto_1.randomUUID)(),
        tenantId: scope.tenantId,
        subjectType,
        studentId: subjectType === 'student' ? subjectId : null,
        staffId: subjectType === 'staff' ? subjectId : null,
        adminUserId: subjectType === 'admin' ? subjectId : null,
        tokenSha256: token.sha256,
        expiresAt: typeof request.expiresAt === 'string' && request.expiresAt ? request.expiresAt : null,
        replacesCardId: null,
        printedName: 'School card',
        printedCode: 'CARD',
        printedDetail: null,
        issuedBy: scope.userId,
    };
    return withConfirmedSchoolCardDatabase(async (client) => {
        await (0, school_card_sql_1.executeCardIssue)(client, card);
        const printed = await client.query(`SELECT id, subject_type, printed_name, printed_code, printed_detail, status, issued_at, expires_at
       FROM public.school_id_cards
       WHERE id = $1 AND tenant_id = $2`, [card.id, scope.tenantId]);
        const row = printed.rows[0];
        return {
            barcodeValue: token.raw,
            card: {
                id: card.id,
                subjectType: row?.subject_type || subjectType,
                printedName: row?.printed_name || null,
                printedCode: row?.printed_code || null,
                printedDetail: row?.printed_detail || null,
                status: row?.status || null,
                issuedAt: row?.issued_at || null,
                expiresAt: row?.expires_at || null,
            },
        };
    });
}
async function replaceCardThroughDatabase(actor, cardId) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => {
        const current = await client.query(`SELECT id, tenant_id, subject_type, student_id, staff_id, admin_user_id, expires_at, printed_name, printed_code, printed_detail
       FROM public.school_id_cards
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'`, [cardId, scope.tenantId]);
        const row = current.rows[0];
        if (!row)
            throw new school_card_errors_1.SchoolCardError('The active card for this school could not be found.', 404, 'CARD_NOT_FOUND');
        const token = (0, school_card_token_1.createBarcodeToken)();
        const next = {
            id: (0, crypto_1.randomUUID)(),
            tenantId: scope.tenantId,
            subjectType: String(row.subject_type),
            studentId: row.student_id || null,
            staffId: row.staff_id || null,
            adminUserId: row.admin_user_id || null,
            tokenSha256: token.sha256,
            expiresAt: row.expires_at || null,
            replacesCardId: cardId,
            printedName: String(row.printed_name || 'School card'),
            printedCode: String(row.printed_code || 'CARD'),
            printedDetail: row.printed_detail || null,
            issuedBy: scope.userId,
        };
        await (0, school_card_sql_1.executeCardReplacement)(client, next, cardId, 'Replaced by a new card');
        return {
            barcodeValue: token.raw,
            card: { id: next.id, subjectType: next.subjectType, printedName: next.printedName, printedCode: next.printedCode, status: 'active' },
        };
    });
}
async function revokeCardThroughDatabase(actor, cardId, reason) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    const text = typeof reason === 'string' ? reason.trim() : '';
    if (text.length < 5 || text.length > 500) {
        throw new school_card_errors_1.SchoolCardError('A revocation reason of 5 to 500 characters is required.', 400, 'INVALID_REASON');
    }
    await withConfirmedSchoolCardDatabase(async (client) => {
        await (0, school_card_sql_1.executeCardRevoke)(client, scope.tenantId, cardId, scope.userId, text);
    });
    return { card: { id: cardId, status: 'revoked' } };
}
async function saveSettingsThroughDatabase(actor, patch) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    const next = { ...(0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId), ...patch, tenantId: scope.tenantId, updatedBy: scope.userId };
    if (next.signatureImageUrl || next.signatoryName || next.signatoryDesignation) {
        throw new school_card_errors_1.SchoolCardError('Signature storage is not configured, so a signature cannot be saved with these settings.', 503, 'SIGNATURE_STORAGE_UNCONFIGURED');
    }
    next.signatureImageUrl = null;
    next.signatoryName = null;
    next.signatoryDesignation = null;
    (0, school_card_rules_1.validateSettings)(next, new Set());
    await withConfirmedSchoolCardDatabase(async (client) => {
        await (0, school_card_sql_1.executeSettingsSave)(client, next);
    });
    return next;
}
async function readSettingsThroughDatabase(actor) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => {
        const found = await client.query(`SELECT tenant_id, student_template, staff_template, admin_template, paper_size,
              card_width_mm, card_height_mm, print_orientation, logo_placement, accent_color,
              show_address, show_class_or_department, show_status, show_issue_date, show_expiry,
              disclaimer, signature_image_url, signatory_name, signatory_designation,
              lost_found_phone, lost_found_email, notify_student_arrival, notify_student_departure,
              notify_staff_arrival, notify_staff_departure, track_admin_entry,
              duplicate_scan_window_seconds, updated_by
       FROM public.school_id_card_settings
       WHERE tenant_id = $1`, [scope.tenantId]);
        const row = found.rows[0];
        return row ? settingsFromRow(row, scope.userId) : (0, school_card_rules_1.defaultSettings)(scope.tenantId, scope.userId);
    });
}
async function listCardsThroughDatabase(actor) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => {
        const found = await client.query(CARD_PUBLIC_SQL, [scope.tenantId]);
        return found.rows.map((row) => publicCard(row));
    });
}
async function readMyCardThroughDatabase(actor) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => {
        const found = await client.query(`${CARD_PUBLIC_SQL} AND admin_user_id = $2 AND status = 'active'`, [scope.tenantId, scope.userId]);
        const row = found.rows[0];
        return {
            card: row ? publicCard(row) : null,
            barcodeAvailable: false,
            message: 'The barcode secret is not stored. This screen shows the signed-in administrator card only, and it cannot reconstruct the printed barcode.',
        };
    });
}
async function listEligibleThroughDatabase(actor) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => directory(client, scope.tenantId));
}
async function previewThroughDatabase(actor, request) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    return withConfirmedSchoolCardDatabase(async (client) => {
        const directoryRows = await directory(client, scope.tenantId);
        const person = findPerson(directoryRows, request.subjectType, request.subjectId);
        const settings = await loadSettings(client, scope.tenantId, scope.userId);
        const tenant = await readTenant(client, scope.tenantId);
        return buildFace(settings, tenant, person, null);
    });
}
async function batchThroughDatabase(actor, people) {
    const scope = (0, school_card_access_1.assertCardManager)(actor);
    if (!Array.isArray(people) || people.length < 1 || people.length > 100) {
        throw new school_card_errors_1.SchoolCardError('Choose between 1 and 100 people.', 400, 'INVALID_BATCH');
    }
    return withConfirmedSchoolCardDatabase(async (client) => {
        const directoryRows = await directory(client, scope.tenantId);
        const seen = new Set();
        const plans = people.map((person) => {
            const identity = findPerson(directoryRows, person.subjectType, person.subjectId);
            const key = `${identity.subjectType}:${identity.subjectId}`;
            if (seen.has(key))
                throw new school_card_errors_1.SchoolCardError('Each person can appear once in a batch.', 400, 'INVALID_BATCH');
            seen.add(key);
            if (identity.cardStatus === 'pending') {
                throw new school_card_errors_1.SchoolCardError('A card change is already in progress for this person.', 409, 'CARD_ALREADY_ACTIVE');
            }
            return identity;
        });
        const writes = plans.map((identity) => {
            const token = (0, school_card_token_1.createBarcodeToken)();
            const card = {
                id: (0, crypto_1.randomUUID)(),
                tenantId: scope.tenantId,
                subjectType: identity.subjectType,
                studentId: identity.subjectType === 'student' ? identity.subjectId : null,
                staffId: identity.subjectType === 'staff' ? identity.subjectId : null,
                adminUserId: identity.subjectType === 'admin' ? identity.subjectId : null,
                tokenSha256: token.sha256,
                expiresAt: null,
                replacesCardId: identity.activeCardId,
                printedName: identity.name,
                printedCode: identity.printedCode,
                printedDetail: identity.detail,
                issuedBy: scope.userId,
            };
            return { identity, token, card };
        });
        await (0, school_card_sql_1.runSchoolCardTransaction)(client, async (query) => {
            for (const write of writes) {
                if (write.card.replacesCardId) {
                    for (const statement of (0, school_card_sql_1.replacementStatements)(write.card, write.card.replacesCardId, 'Replaced by a new card')) {
                        await query(statement.text, statement.params);
                    }
                }
                else {
                    const insert = (0, school_card_sql_1.cardInsertStatement)({ ...write.card, replacesCardId: null });
                    await query(insert.text, insert.params);
                    await query(`INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id) VALUES ($1, $2, 'card_issued', $3)`, [write.card.tenantId, write.card.issuedBy, write.card.id]);
                }
            }
        });
        const printed = await client.query(`${CARD_PUBLIC_SQL} AND id = ANY($2::uuid[])`, [scope.tenantId, writes.map((write) => write.card.id)]);
        const byId = new Map(printed.rows.map((row) => {
            const value = row;
            return [String(value.id), value];
        }));
        const settings = await readSettingsRow(client, scope.tenantId, scope.userId);
        const tenant = await readTenant(client, scope.tenantId);
        return writes.map((write) => {
            const row = byId.get(write.card.id);
            const card = row ? publicCard(row) : publicCard({
                id: write.card.id,
                subject_type: write.identity.subjectType,
                student_id: write.card.studentId,
                staff_id: write.card.staffId,
                admin_user_id: write.card.adminUserId,
                status: 'active',
                printed_name: write.identity.name,
                printed_code: write.identity.printedCode,
                printed_detail: write.identity.detail,
                issued_at: null,
                expires_at: null,
                revoke_kind: null,
            });
            return { card, face: buildFace(settings, tenant, write.identity, write.token.raw, card), barcodeValue: write.token.raw };
        });
    });
}
const CARD_PUBLIC_SQL = `SELECT id, subject_type, student_id, staff_id, admin_user_id, status,
  printed_name, printed_code, printed_detail, issued_at, expires_at, revoke_kind
  FROM public.school_id_cards
  WHERE tenant_id = $1`;
async function directory(client, tenantId) {
    const students = await client.query(`SELECT id, first_name, last_name, admission_number, current_class
     FROM public.students
     WHERE tenant_id = $1`, [tenantId]);
    const staff = await client.query(`SELECT id, name, staff_id, role, is_active
     FROM public.tenant_staff
     WHERE tenant_id::text = $1::text`, [tenantId]);
    const admins = await client.query(`SELECT id, name, role
     FROM public.users
     WHERE tenant_id = $1::text AND is_active IS TRUE`, [tenantId]);
    const cards = await client.query(CARD_PUBLIC_SQL, [tenantId]);
    const cardRows = cards.rows;
    return {
        students: students.rows.map((row) => personFrom('student', row, cardRows)),
        staff: staff.rows
            .filter((row) => row.is_active === true)
            .map((row) => personFrom('staff', row, cardRows)),
        administrators: admins.rows
            .filter((row) => managerRole(row.role))
            .map((row) => personFrom('admin', row, cardRows)),
    };
}
function personFrom(subjectType, row, cards) {
    const subjectId = String(row.id);
    const matched = cards.filter((card) => samePerson(card, subjectType, subjectId));
    const active = matched.find((card) => card.status === 'active');
    const pending = matched.find((card) => card.status === 'pending');
    const name = subjectType === 'student'
        ? `${text(row.first_name)} ${text(row.last_name)}`.trim()
        : text(row.name) || (subjectType === 'admin' ? 'School administrator' : '');
    const staffCode = text(row.staff_id);
    const printedCode = subjectType === 'student'
        ? text(row.admission_number)
        : subjectType === 'staff'
            ? staffCode && staffCode !== subjectId ? staffCode : 'STAFF'
            : 'ADMIN';
    const detail = subjectType === 'student'
        ? text(row.current_class) || null
        : subjectType === 'staff'
            ? text(row.role) || null
            : 'School administrator';
    return {
        subjectType,
        subjectId,
        name,
        printedCode,
        detail,
        cardStatus: active ? 'active' : pending ? 'pending' : matched.some((card) => card.status === 'revoked') ? 'revoked' : 'none',
        activeCardId: active ? String(active.id) : null,
    };
}
function findPerson(rows, subjectType, subjectId) {
    const type = subjectType === 'student' || subjectType === 'staff' || subjectType === 'admin' ? subjectType : '';
    const id = typeof subjectId === 'string' ? subjectId : Array.isArray(subjectId) ? String(subjectId[0] || '') : '';
    const list = type === 'student' ? rows.students : type === 'staff' ? rows.staff : type === 'admin' ? rows.administrators : [];
    const found = list.find((person) => person.subjectId === id);
    if (!found)
        throw new school_card_errors_1.SchoolCardError('That person is not an eligible identity for this school.', 404, 'IDENTITY_NOT_FOUND');
    return found;
}
async function loadSettings(client, tenantId, userId) {
    const found = await client.query(`SELECT tenant_id, student_template, staff_template, admin_template, paper_size,
            card_width_mm, card_height_mm, print_orientation, logo_placement, accent_color,
            show_address, show_class_or_department, show_status, show_issue_date, show_expiry,
            disclaimer, signature_image_url, signatory_name, signatory_designation,
            lost_found_phone, lost_found_email, notify_student_arrival, notify_student_departure,
            notify_staff_arrival, notify_staff_departure, track_admin_entry,
            duplicate_scan_window_seconds, updated_by
     FROM public.school_id_card_settings WHERE tenant_id = $1`, [tenantId]);
    const row = found.rows[0];
    return row ? settingsFromRow(row, userId) : (0, school_card_rules_1.defaultSettings)(tenantId, userId);
}
async function readSettingsRow(client, tenantId, userId) {
    const found = await client.query(`SELECT 1 FROM public.school_id_card_settings WHERE tenant_id = $1`, [tenantId]);
    if (!found.rows[0])
        throw new school_card_errors_1.SchoolCardError('Save ID card settings before issuing a card.', 409, 'SETTINGS_REQUIRED');
    return loadSettings(client, tenantId, userId);
}
async function readTenant(client, tenantId) {
    const found = await client.query(`SELECT name, phone, street_address FROM public.tenants WHERE id = $1`, [tenantId]);
    const row = found.rows[0];
    return {
        name: text(row?.name) || 'School',
        address: text(row?.street_address) || null,
        phone: text(row?.phone) || null,
    };
}
function buildFace(settings, tenant, person, barcodeValue, card) {
    const templateKey = person.subjectType === 'student'
        ? settings.studentTemplate
        : person.subjectType === 'staff'
            ? settings.staffTemplate
            : settings.adminTemplate;
    return {
        pairId: card?.id || person.subjectId,
        templateKey,
        schoolName: tenant.name,
        logoUrl: (0, school_card_rules_2.httpsLogo)(null),
        address: settings.showAddress ? tenant.address : null,
        phone: tenant.phone,
        photoUrl: null,
        initials: initials(person.name),
        fullName: person.name,
        printedCode: person.printedCode,
        detail: settings.showClassOrDepartment ? person.detail : null,
        category: person.subjectType === 'student' ? 'STUDENT' : person.subjectType === 'staff' ? 'STAFF' : 'ADMIN',
        statusLabel: null,
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
        cardWidthMm: Number(settings.cardWidthMm),
        cardHeightMm: Number(settings.cardHeightMm),
        paperSize: settings.paperSize,
        showIssueDate: settings.showIssueDate,
        showExpiry: settings.showExpiry,
    };
}
function settingsFromRow(row, fallbackUserId) {
    return {
        tenantId: String(row.tenant_id),
        studentTemplate: String(row.student_template),
        staffTemplate: String(row.staff_template),
        adminTemplate: String(row.admin_template),
        paperSize: String(row.paper_size),
        cardWidthMm: Number(row.card_width_mm),
        cardHeightMm: Number(row.card_height_mm),
        printOrientation: String(row.print_orientation),
        logoPlacement: String(row.logo_placement),
        accentColor: String(row.accent_color),
        showAddress: row.show_address === true,
        showClassOrDepartment: row.show_class_or_department === true,
        showStatus: row.show_status === true,
        showIssueDate: row.show_issue_date === true,
        showExpiry: row.show_expiry === true,
        disclaimer: String(row.disclaimer || ''),
        signatureImageUrl: text(row.signature_image_url) || null,
        signatoryName: text(row.signatory_name) || null,
        signatoryDesignation: text(row.signatory_designation) || null,
        lostFoundPhone: text(row.lost_found_phone) || null,
        lostFoundEmail: text(row.lost_found_email) || null,
        notifyStudentArrival: row.notify_student_arrival === true,
        notifyStudentDeparture: row.notify_student_departure === true,
        notifyStaffArrival: row.notify_staff_arrival === true,
        notifyStaffDeparture: row.notify_staff_departure === true,
        trackAdminEntry: row.track_admin_entry === true,
        duplicateScanWindowSeconds: Number(row.duplicate_scan_window_seconds),
        updatedBy: text(row.updated_by) || fallbackUserId,
    };
}
function publicCard(row) {
    const subjectType = String(row.subject_type);
    const subjectId = subjectType === 'student'
        ? String(row.student_id || '')
        : subjectType === 'staff'
            ? String(row.staff_id || '')
            : String(row.admin_user_id || '');
    return {
        id: String(row.id),
        subjectType,
        subjectId,
        status: String(row.status),
        category: subjectType === 'student' ? 'STUDENT' : subjectType === 'staff' ? 'STAFF' : 'ADMIN',
        printedName: text(row.printed_name),
        printedCode: text(row.printed_code),
        printedDetail: text(row.printed_detail) || null,
        issuedAt: row.issued_at ? String(row.issued_at) : '',
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        revokeKind: row.revoke_kind === 'replaced' || row.revoke_kind === 'retired' ? row.revoke_kind : null,
    };
}
function samePerson(card, subjectType, subjectId) {
    if (card.subject_type !== subjectType)
        return false;
    if (subjectType === 'student')
        return card.student_id === subjectId;
    if (subjectType === 'staff')
        return card.staff_id === subjectId;
    return card.admin_user_id === subjectId;
}
function managerRole(role) {
    if (typeof role !== 'string')
        return false;
    const tokens = role.toLowerCase().split(',').map((part) => part.trim()).filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => token === 'owner' || token === 'tenant_admin');
}
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function initials(name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}
//# sourceMappingURL=school-card.persistence.js.map