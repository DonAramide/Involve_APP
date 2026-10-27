import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { assertCardManager } from '../src/modules/school-gate/school-card.access';
import { SchoolCardError } from '../src/modules/school-gate/school-card.errors';
import { rejectPredictableToken } from '../src/modules/school-gate/school-card.rules';
import { createSchoolCardService } from '../src/modules/school-gate/school-card.service';
import { MemorySchoolCardStore, UnappliedSchoolCardStore } from '../src/modules/school-gate/school-card.store';
import { createBarcodeToken, sha256Hex } from '../src/modules/school-gate/school-card.token';
import { REPLACEMENT_SQL, replacementSqlTouchesAttendanceOrSessions } from '../src/modules/school-gate/school-card.transaction';
import { createUnappliedSchoolCardService, registerSchoolCardRoutes } from '../src/modules/school-gate/school-card.routes';
import { executeCardReplacement, executeSettingsSave, schoolCardPersistenceStatus } from '../src/modules/school-gate/school-card.sql';
import { schemaProbeIsReady, schoolCardSqlRequested } from '../src/modules/school-gate/school-card.persistence';
import { CardRow, SettingsRow } from '../src/modules/school-gate/school-card.types';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ownerA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const adminA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const teacherA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const operatorA = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const platformA = '99999999-9999-4999-8999-999999999999';
const mixedA = 'abababab-abab-4aba-8aba-abababababab';
const inactiveA = 'cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd';
const studentA = '11111111-1111-4111-8111-111111111111';
const studentOpen = '11111111-1111-4111-8111-111111111112';
const studentB = '11111111-1111-4111-8111-111111111113';
const staffA = '22222222-2222-4222-8222-222222222222';
const staffPlain = '22222222-2222-4222-8222-222222222223';
const staffInternal = '22222222-2222-4222-8222-222222222224';
const staffInactive = '22222222-2222-4222-8222-222222222226';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc';
const staffB = '22222222-2222-4222-8222-222222222225';

function seed() {
  return new MemorySchoolCardStore({
    tenants: [
      { id: tenantA, name: 'Harbour School', address: '12 Harbour Road', phone: '08010000000', logoUrl: null },
      { id: tenantB, name: 'Other School', address: null, phone: null, logoUrl: 'http://example.test/logo.png' },
    ],
    users: [
      { id: ownerA, tenantId: tenantA, role: 'owner', isActive: true, name: 'Ada Owner', email: 'ada@harbour.test' },
      { id: adminA, tenantId: tenantA, role: 'tenant_admin', isActive: true, name: '', email: 'admin@harbour.test' },
      { id: teacherA, tenantId: tenantA, role: 'teacher', isActive: true, name: 'Tomi Teacher', email: 'tomi@harbour.test' },
      { id: operatorA, tenantId: tenantA, role: 'tenant_operator', isActive: true, name: 'Gate Operator', email: 'gate@harbour.test' },
      { id: platformA, tenantId: tenantA, role: 'super_admin', isActive: true, name: 'Platform', email: 'platform@invify.test' },
      { id: mixedA, tenantId: tenantA, role: 'owner,super_admin', isActive: true, name: 'Mixed', email: 'mixed@harbour.test' },
      { id: inactiveA, tenantId: tenantA, role: 'owner', isActive: false, name: 'Inactive', email: 'inactive@harbour.test' },
      { id: ownerB, tenantId: tenantB, role: 'owner', isActive: true, name: 'Bola Owner', email: 'bola@other.test' },
    ],
    students: [
      { id: studentA, tenantId: tenantA, firstName: 'Amaka', lastName: 'Okonkwo', admissionNumber: 'ADM-2041', currentClass: 'JSS 2' },
      { id: studentOpen, tenantId: null, firstName: 'No', lastName: 'Tenant', admissionNumber: 'ADM-9', currentClass: null },
      { id: studentB, tenantId: tenantB, firstName: 'Other', lastName: 'Student', admissionNumber: 'ADM-8', currentClass: 'SS 1' },
    ],
    staff: [
      { id: staffA, tenantId: tenantA, name: 'Ibrahim Musa', staffCode: 'STF-18', role: 'Teacher', isActive: true },
      { id: staffPlain, tenantId: tenantA, name: 'Ngozi Ade', staffCode: null, role: null, isActive: true },
      { id: staffInternal, tenantId: tenantA, name: 'Bad Code', staffCode: staffInternal, role: 'Clerk', isActive: true },
      { id: staffInactive, tenantId: tenantA, name: 'Inactive Staff', staffCode: 'STF-0', role: 'Clerk', isActive: false },
      { id: staffB, tenantId: tenantB, name: 'Other Staff', staffCode: 'STF-2', role: 'Teacher', isActive: true },
    ],
    approvedSignatures: [{ tenantId: tenantA, url: 'https://uploads.example.test/harbour-signature.png' }],
  });
}

function actor(id: string, role: string, tenantId: string | null = tenantA) {
  return { id, role, tenantId };
}

function appFor(service = createSchoolCardService(seed())) {
  const app = express();
  app.use(express.json());
  registerSchoolCardRoutes(app, (req, _res, next) => {
    const header = req.headers['x-test-user'];
    (req as express.Request & { user?: object }).user = header ? JSON.parse(String(header)) : undefined;
    next();
  }, service);
  return app;
}

describe('school ID cards', () => {
  test('owner and tenant admin can manage cards, and other roles cannot', async () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const app = appFor(service);
    const owner = JSON.stringify(actor(ownerA, 'owner'));
    const admin = JSON.stringify(actor(adminA, 'tenant_admin'));
    await request(app).put('/api/school/id-cards/settings').set('x-test-user', owner).send({ disclaimer: 'This card remains the property of Harbour School and must be returned if found anywhere.' });
    const issued = await request(app).post('/api/school/id-cards/issue').set('x-test-user', admin).send({
      subjectType: 'student',
      subjectId: studentA,
      tenantId: tenantB,
      printedName: 'Hacker',
      printedCode: 'HACK',
    });
    expect(issued.status).toBe(201);
    expect(issued.body.card.printedName).toBe('Amaka Okonkwo');
    expect(issued.body.card.printedCode).toBe('ADM-2041');
    expect(store.listCards(tenantB)).toHaveLength(0);
    expect(store.sessionCount).toBe(0);
    expect(store.attendanceWrites).toBe(0);

    for (const user of [actor(teacherA, 'teacher'), actor(operatorA, 'tenant_operator'), actor(platformA, 'super_admin'), actor(mixedA, 'owner,super_admin'), actor(ownerA, 'owner', null)]) {
      const response = await request(app).post('/api/school/id-cards/issue').set('x-test-user', JSON.stringify(user)).set('x-tenant-id', tenantB).send({ subjectType: 'student', subjectId: studentA, tenantId: tenantB });
      expect(response.status).toBe(403);
    }
  });

  test('a client-supplied tenant does not change the authenticated school', async () => {
    const store = seed();
    const service = createSchoolCardService(store);
    service.saveSettings(actor(ownerA, 'owner'), {});
    const app = appFor(service);
    const response = await request(app)
      .post('/api/school/id-cards/issue')
      .set('x-test-user', JSON.stringify(actor(ownerA, 'owner')))
      .set('x-tenant-id', tenantB)
      .send({ subjectType: 'staff', subjectId: staffB, tenantId: tenantB });
    expect(response.status).toBe(403);
    expect(store.listCards(tenantA)).toHaveLength(0);
    expect(store.listCards(tenantB)).toHaveLength(0);
  });

  test('the signed-in administrator sees only their own card and not the barcode secret', async () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const app = appFor(service);
    service.saveSettings(actor(ownerA, 'owner'), {});
    service.issue(actor(ownerA, 'owner'), { subjectType: 'admin', subjectId: ownerA });
    service.issue(actor(ownerA, 'owner'), { subjectType: 'student', subjectId: studentA });
    const mine = await request(app)
      .get('/api/school/id-cards/mine')
      .set('x-test-user', JSON.stringify(actor(ownerA, 'owner')))
      .set('x-tenant-id', tenantB);
    expect(mine.status).toBe(200);
    expect(mine.body.barcodeAvailable).toBe(false);
    expect(mine.body.card.printedCode).toBe('ADMIN');
    expect(mine.body.card.subjectId).toBe(ownerA);
    expect(JSON.stringify(mine.body)).not.toContain('barcodeValue');
    expect(JSON.stringify(mine.body)).not.toContain('tokenSha256');
    const otherAdmin = await request(app).get('/api/school/id-cards/mine').set('x-test-user', JSON.stringify(actor(adminA, 'tenant_admin')));
    expect(otherAdmin.body.card).toBeNull();
    const teacher = await request(app).get('/api/school/id-cards/mine').set('x-test-user', JSON.stringify(actor(teacherA, 'teacher')));
    expect(teacher.status).toBe(403);
  });

  test('identity rules reject incomplete students and unsafe staff or administrator identifiers', () => {
    const service = createSchoolCardService(seed());
    const owner = actor(ownerA, 'owner');
    service.saveSettings(owner, {});
    expect(() => service.issue(owner, { subjectType: 'student', subjectId: studentOpen })).toThrow(SchoolCardError);
    expect(() => service.issue(owner, { subjectType: 'student', subjectId: studentB })).toThrow(/does not belong/);
    expect(() => service.issue(owner, { subjectType: 'staff', subjectId: 'missing' })).toThrow(/does not exist/);
    expect(() => service.issue(owner, { subjectType: 'staff', subjectId: staffInactive })).toThrow(/inactive/);
    expect(() => service.issue(owner, { subjectType: 'staff', subjectId: staffInternal })).toThrow(/internal identifier/);

    const plain = service.issue(owner, { subjectType: 'staff', subjectId: staffPlain, printedName: 'Not Used' });
    expect(plain.card.printedCode).toBe('STAFF');
    expect(plain.face.photoUrl).toBeNull();
    expect(plain.face.initials).toBe('NA');
    expect(JSON.stringify(plain.face)).not.toContain(staffPlain);

    const administrator = service.issue(owner, { subjectType: 'admin', subjectId: adminA, printedCode: 'admin@harbour.test' });
    expect(administrator.card.printedCode).toBe('ADMIN');
    expect(administrator.card.printedName).toBe('School administrator');
    expect(JSON.stringify(administrator.face)).not.toContain('admin@harbour.test');
    expect(JSON.stringify(administrator.face)).not.toContain(adminA);
  });

  test('only the token hash is stored, and revoked, expired, and cross-tenant tokens resolve to nothing', () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const owner = actor(ownerA, 'owner');
    const logs: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((...args) => logs.push(args.join(' ')));
    const info = jest.spyOn(console, 'info').mockImplementation((...args) => logs.push(args.join(' ')));
    service.saveSettings(owner, {});
    const first = service.issue(owner, { subjectType: 'student', subjectId: studentA });
    const second = service.issue(owner, { subjectType: 'staff', subjectId: staffA });
    expect(first.barcodeValue).not.toBe(second.barcodeValue);
    expect(first.barcodeValue.length).toBe(43);
    const stored = store.findCard(first.card.id)!;
    expect(stored.tokenSha256).toHaveLength(64);
    expect(stored.tokenSha256).not.toBe(first.barcodeValue);
    expect(JSON.stringify(stored)).not.toContain(first.barcodeValue);
    const listed = JSON.stringify(service.listCards(owner));
    expect(listed).not.toContain(first.barcodeValue);
    expect(listed).not.toContain(stored.tokenSha256);
    expect(logs.join('\n')).not.toContain(first.barcodeValue);
    expect(logs.join('\n')).not.toContain(stored.tokenSha256);
    spy.mockRestore();
    info.mockRestore();

    expect(service.lookupToken(owner, first.barcodeValue)?.printedCode).toBe('ADM-2041');
    expect(service.lookupToken(actor(ownerB, 'owner', tenantB), first.barcodeValue)).toBeNull();
    service.revoke(owner, first.card.id, 'Card was reported lost');
    expect(service.lookupToken(owner, first.barcodeValue)).toBeNull();
    store.expireForTest(second.card.id);
    expect(service.lookupToken(owner, second.barcodeValue)).toBeNull();
    expect(store.sessionCount).toBe(0);
    expect(store.attendanceWrites).toBe(0);
  });

  test('replacement failure and a missing audit leave the previous card active', () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const owner = actor(ownerA, 'owner');
    service.saveSettings(owner, { studentTemplate: 'academic_blue' });
    const issued = service.issue(owner, { subjectType: 'student', subjectId: studentA });
    store.failAuditAction = 'card_revoked';
    expect(() => service.replace(owner, issued.card.id)).toThrow(/audit/i);
    const cards = store.listCards(tenantA);
    expect(cards).toHaveLength(1);
    expect(cards[0].status).toBe('active');
    expect(cards[0].id).toBe(issued.card.id);
    expect(service.lookupToken(owner, issued.barcodeValue)?.id).toBe(issued.card.id);

    store.failAuditAction = null;
    const before = store.getSettings(tenantA);
    store.failAuditAction = 'settings_saved';
    expect(() => service.saveSettings(owner, { studentTemplate: 'minimal_white' })).toThrow(/audit/i);
    expect(store.getSettings(tenantA)?.studentTemplate).toBe(before?.studentTemplate);

    store.failAuditAction = null;
    expect(() => store.transaction((journal) => {
      journal.revokeCard(issued.card.id, 'replaced', ownerA, 'Replaced by a new card');
      journal.addAudit({ tenantId: tenantA, actorUserId: ownerA, action: 'card_revoked', cardId: issued.card.id, reason: 'Replaced by a new card' });
    })).toThrow(/replacement revoke requires/);
    expect(store.findCard(issued.card.id)?.status).toBe('active');
  });

  test('a successful replacement retires the old token and does not create an entry session', () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const owner = actor(ownerA, 'owner');
    service.saveSettings(owner, {});
    const issued = service.issue(owner, { subjectType: 'student', subjectId: studentA });
    const replaced = service.replace(owner, issued.card.id);
    expect(replaced.barcodeValue).not.toBe(issued.barcodeValue);
    expect(service.lookupToken(owner, issued.barcodeValue)).toBeNull();
    expect(service.lookupToken(owner, replaced.barcodeValue)?.printedName).toBe('Amaka Okonkwo');
    expect(store.listCards(tenantA).filter((card) => card.status === 'active')).toHaveLength(1);
    expect(store.listCards(tenantA).some((card) => card.status === 'revoked' && card.revokeKind === 'replaced')).toBe(true);
    expect(store.sessionCount).toBe(0);
    const listed = JSON.stringify(service.listCards(owner));
    expect(listed).not.toContain(replaced.barcodeValue);
    expect(listed).not.toContain(store.findCard(replaced.card.id)!.tokenSha256);
  });

  test('batch printing validates every person before writing and keeps front data free of secrets', () => {
    const store = seed();
    const service = createSchoolCardService(store);
    const owner = actor(ownerA, 'owner');
    service.saveSettings(owner, { showStatus: true });
    expect(() => service.batch(owner, [
      { subjectType: 'student', subjectId: studentA },
      { subjectType: 'student', subjectId: studentB },
    ])).toThrow(/does not belong/);
    expect(store.listCards(tenantA)).toHaveLength(0);

    const printed = service.batch(owner, [
      { subjectType: 'student', subjectId: studentA, printedName: 'Wrong' },
      { subjectType: 'staff', subjectId: staffA },
      { subjectType: 'admin', subjectId: ownerA },
    ]);
    expect(printed).toHaveLength(3);
    expect(new Set(printed.map((item) => item.face.pairId)).size).toBe(3);
    expect(printed.map((item) => item.face.category)).toEqual(['STUDENT', 'STAFF', 'ADMIN']);
    printed.forEach((item) => {
      expect(item.face.barcodeValue).toBe(item.barcodeValue);
      expect(item.face.photoUrl).toBeNull();
      expect(JSON.stringify(item.face)).not.toContain(item.card.id === printed[2].card.id ? ownerA : '___');
    });
    expect(JSON.stringify(printed[2].face)).not.toContain('ada@harbour.test');
    expect(printed[0].face.statusLabel).toBeNull();
    expect(printed[1].face.statusLabel).toBe('Active');
    expect(store.sessionCount).toBe(0);
  });

  test('settings accept an approved signature and reject a data URL or unapproved image', () => {
    const service = createSchoolCardService(seed());
    const owner = actor(ownerA, 'owner');
    expect(() => service.saveSettings(owner, { signatureImageUrl: 'data:image/png;base64,aaaa', signatoryName: 'Ada Owner', signatoryDesignation: 'Principal' })).toThrow(/approved uploaded image/);
    expect(() => service.saveSettings(owner, { signatureImageUrl: 'https://evil.example/sig.png', signatoryName: 'Ada Owner', signatoryDesignation: 'Principal' })).toThrow(/approved uploaded image/);
    const saved = service.saveSettings(owner, {
      studentTemplate: 'classic_school',
      staffTemplate: 'compact_barcode',
      adminTemplate: 'premium_identity',
      signatureImageUrl: 'https://uploads.example.test/harbour-signature.png',
      signatoryName: 'Ada Owner',
      signatoryDesignation: 'Principal',
    });
    expect(saved.staffTemplate).toBe('compact_barcode');
    expect(saved.notifyStudentArrival).toBe(false);
    expect(service.templates(owner)).toHaveLength(6);
  });

  test('tokens are random secrets rather than hashes of identity values', () => {
    const token = createBarcodeToken();
    expect(token.raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token.sha256).toBe(sha256Hex(token.raw));
    expect(() => rejectPredictableToken(sha256Hex('ADM-2041'), ['ADM-2041'])).toThrow(/random secret/);
  });

  test('the replacement contract is one transaction and does not touch attendance or sessions', () => {
    expect(REPLACEMENT_SQL[0]).toBe('BEGIN');
    expect(REPLACEMENT_SQL[REPLACEMENT_SQL.length - 1]).toBe('COMMIT');
    expect(REPLACEMENT_SQL.map((sql) => sql.toLowerCase()).join('\n')).toContain('pending');
    expect(replacementSqlTouchesAttendanceOrSessions(REPLACEMENT_SQL)).toBe(false);
    const directory = path.join(__dirname, '../src/modules/school-gate');
    const source = fs.readdirSync(directory)
      .filter((file) => file !== 'school-card.transaction.ts')
      .map((file) => fs.readFileSync(path.join(directory, file), 'utf8'))
      .join('\n');
    expect(source).not.toContain('attendance_records');
    expect(source).not.toContain('student_attendance');
    expect(source).not.toContain('AttendanceService');
    expect(source).not.toContain('school_entry_exit_sessions');
    expect(source).not.toContain('checkTenantPermission');
    expect(source).not.toContain('resolveTenantScope');
  });

  test('the live route service reports that the schema is unapplied and still refuses scan-only roles', async () => {
    const app = appFor(createUnappliedSchoolCardService());
    const owner = await request(app).get('/api/school/id-cards/templates').set('x-test-user', JSON.stringify(actor(ownerA, 'owner')));
    expect(owner.status).toBe(200);
    expect(owner.body.templates).toHaveLength(6);
    const settings = await request(app).get('/api/school/id-cards/settings').set('x-test-user', JSON.stringify(actor(ownerA, 'owner')));
    expect(settings.status).toBe(503);
    expect(settings.body.code).toBe('SCHOOL_GATE_SCHEMA_UNAPPLIED');
    const teacher = await request(app).post('/api/school/id-cards/issue').set('x-test-user', JSON.stringify(actor(teacherA, 'teacher'))).send({ subjectType: 'student', subjectId: studentA });
    expect(teacher.status).toBe(403);
    const signature = await request(app).post('/api/school/id-cards/signature').set('x-test-user', JSON.stringify(actor(ownerA, 'owner')));
    expect(signature.body.code).toBe('SIGNATURE_STORAGE_UNCONFIGURED');
    const mine = await request(app).get('/api/school/id-cards/mine').set('x-test-user', JSON.stringify(actor(ownerA, 'owner')));
    expect(mine.status).toBe(503);
    expect(mine.body.code).toBe('SCHOOL_GATE_SCHEMA_UNAPPLIED');
    expect(new UnappliedSchoolCardStore().mode).toBe('unapplied');
  });

  test('a pending card cannot be left behind without its audit', () => {
    const store = seed();
    const dangling: CardRow = {
      id: '12121212-1212-4121-8121-121212121212',
      tenantId: tenantA,
      subjectType: 'student',
      studentId: studentA,
      staffId: null,
      adminUserId: null,
      tokenSha256: sha256Hex('not-a-stored-secret'),
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: null,
      revokedAt: null,
      revokedBy: null,
      revokeKind: null,
      replacesCardId: null,
      printedName: 'Amaka Okonkwo',
      printedCode: 'ADM-2041',
      printedDetail: 'JSS 2',
      category: 'STUDENT',
      issuedBy: ownerA,
    };
    expect(() => store.transaction((journal) => journal.insertCard(dangling))).toThrow(/audit/);
    expect(store.listCards(tenantA)).toHaveLength(0);
    expect(() => assertCardManager(actor(teacherA, 'teacher'))).toThrow(SchoolCardError);
  });

  test('the SQL adapter rolls back a failed replacement and does not open a database pool', async () => {
    const status = schoolCardPersistenceStatus();
    expect(status.operational).toBe(false);
    expect(status.code).toBe('SCHOOL_GATE_SCHEMA_UNAPPLIED');
    const source = fs.readFileSync(path.join(__dirname, '../src/modules/school-gate/school-card.sql.ts'), 'utf8');
    expect(source).not.toContain("from 'pg'");
    expect(source).not.toContain('process.env.DATABASE_URL');
    expect(source).not.toContain('../db/pg');
    expect(source).not.toContain('attendance_records');
    expect(source).not.toContain('school_entry_exit_sessions');
    const persistence = fs.readFileSync(path.join(__dirname, '../src/modules/school-gate/school-card.persistence.ts'), 'utf8');
    const routes = fs.readFileSync(path.join(__dirname, '../src/modules/school-gate/school-card.routes.ts'), 'utf8');
    expect(persistence).not.toContain("from 'pg'");
    expect(persistence).not.toContain("from '../../db/pg'");
    expect(persistence).toContain("import('../../db/pg')");
    expect(persistence).not.toContain('token_sha256');
    expect(persistence).toContain('trg_school_id_cards_audit');
    expect(persistence).not.toContain('trg_school_gate_audit_required');
    expect(routes).toContain('batchThroughDatabase');
    expect(routes).toContain('listEligibleThroughDatabase');

    const queries: string[] = [];
    const client = {
      async query(text: string) {
        queries.push(text);
        if (text.includes("'card_revoked'")) throw new Error('audit insert failed');
        return { rows: [], rowCount: 1 };
      },
    };
    const card = {
      id: '12121212-1212-4121-8121-121212121213',
      tenantId: tenantA,
      subjectType: 'student',
      studentId: studentA,
      staffId: null,
      adminUserId: null,
      tokenSha256: sha256Hex('adapter-secret-not-stored'),
      expiresAt: null,
      replacesCardId: '12121212-1212-4121-8121-121212121214',
      printedName: 'Amaka Okonkwo',
      printedCode: 'ADM-2041',
      printedDetail: 'JSS 2',
      issuedBy: ownerA,
    };
    await expect(executeCardReplacement(client, card, card.replacesCardId!, 'Replaced by a new card')).rejects.toThrow(/audit insert failed/);
    expect(queries[0]).toBe('BEGIN');
    expect(queries.some((text) => text.startsWith('INSERT INTO public.school_id_cards'))).toBe(true);
    expect(queries.some((text) => text.includes("revoke_kind = 'replaced'"))).toBe(true);
    expect(queries.includes('COMMIT')).toBe(false);
    expect(queries[queries.length - 1]).toBe('ROLLBACK');
    expect(queries.join('\n')).not.toContain('adapter-secret-not-stored');
    expect(schoolCardSqlRequested()).toBe(false);
    expect(schemaProbeIsReady({ ready: true })).toBe(true);
    expect(schemaProbeIsReady({ ready: false })).toBe(false);
    expect(schemaProbeIsReady(undefined)).toBe(false);

    const saved: string[] = [];
    await executeSettingsSave({
      async query(text: string) {
        saved.push(text);
        return { rows: [], rowCount: 1 };
      },
    }, settingsRow());
    expect(saved[0]).toBe('BEGIN');
    expect(saved.some((text) => text.includes('school_id_card_settings'))).toBe(true);
    expect(saved.some((text) => text.includes("'settings_saved'"))).toBe(true);
    expect(saved[saved.length - 1]).toBe('COMMIT');
  });

  test('a configured signature store accepts image bytes and a URL is rejected', async () => {
    const store = seed();
    const uploads: Array<{ tenantId: string; contentType: string }> = [];
    const service = createSchoolCardService(store, {
      async put(input) {
        uploads.push({ tenantId: input.tenantId, contentType: input.contentType });
        return 'https://uploads.example.test/harbour/signature.png';
      },
    });
    const owner = actor(ownerA, 'owner');
    await expect(service.acceptSignature(owner, 'https://evil.example/sig.png')).rejects.toThrow(/external address/);
    expect(uploads).toHaveLength(0);
    const accepted = await service.acceptSignature(owner, tinyPng());
    expect(accepted.signatureImageUrl).toBe('https://uploads.example.test/harbour/signature.png');
    expect(uploads[0]).toEqual({ tenantId: tenantA, contentType: 'image/png' });
    const saved = service.saveSettings(owner, {
      signatureImageUrl: accepted.signatureImageUrl,
      signatoryName: 'Ada Owner',
      signatoryDesignation: 'Principal',
    });
    expect(saved.signatureImageUrl).toBe(accepted.signatureImageUrl);
    expect(store.auditCount()).toBe(1);
  });
});

function tinyPng(): string {
  const png = Buffer.alloc(24);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  png.writeUInt32BE(32, 16);
  png.writeUInt32BE(32, 20);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function settingsRow(): SettingsRow {
  return {
    tenantId: tenantA,
    studentTemplate: 'classic_school',
    staffTemplate: 'classic_school',
    adminTemplate: 'classic_school',
    paperSize: 'A4',
    cardWidthMm: 85.6,
    cardHeightMm: 53.98,
    printOrientation: 'portrait',
    logoPlacement: 'left',
    accentColor: '#1F4B99',
    showAddress: true,
    showClassOrDepartment: true,
    showStatus: true,
    showIssueDate: true,
    showExpiry: false,
    disclaimer: 'This card remains the property of the issuing institution and must be returned if found.',
    signatureImageUrl: null,
    signatoryName: null,
    signatoryDesignation: null,
    lostFoundPhone: null,
    lostFoundEmail: null,
    notifyStudentArrival: false,
    notifyStudentDeparture: false,
    notifyStaffArrival: false,
    notifyStaffDeparture: false,
    trackAdminEntry: false,
    duplicateScanWindowSeconds: 45,
    updatedBy: ownerA,
  };
}
