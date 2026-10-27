import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { registerSchoolCardRoutes } from '../src/modules/school-gate/school-card.routes';
import { sha256Hex } from '../src/modules/school-gate/school-card.token';
import { executeGateScan, gateTokenHash } from '../src/modules/school-gate/school-gate.scan';
import { schoolCardSqlRequested } from '../src/modules/school-gate/school-card.persistence';
import { SqlQueryClient } from '../src/modules/school-gate/school-card.sql';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ownerA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const teacherA = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const platformA = '99999999-9999-4999-8999-999999999999';
const studentA = '11111111-1111-4111-8111-111111111111';
const staffA = '22222222-2222-4222-8222-222222222222';
const rawToken = 'abcdefghijklmnopqrstuvwxyz012345';

function studentCard(overrides: Record<string, unknown> = {}) {
  return {
    id: '12121212-1212-4121-8121-121212121212',
    subject_type: 'student',
    student_id: studentA,
    staff_id: null,
    admin_user_id: null,
    status: 'active',
    expires_at: null,
    printed_name: 'Amaka Okonkwo',
    printed_code: 'ADM-2041',
    ...overrides,
  };
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    notify_student_arrival: false,
    notify_student_departure: false,
    notify_staff_arrival: false,
    notify_staff_departure: false,
    track_admin_entry: false,
    duplicate_scan_window_seconds: 45,
    ...overrides,
  };
}

function scripted(state: {
  card?: Record<string, unknown> | null;
  settings?: Record<string, unknown>;
  open?: boolean;
  insideWindow?: boolean;
  studentFound?: boolean;
  staffActive?: boolean;
  guardians?: Array<{ id: string }>;
  staffEmails?: Array<{ id: string }>;
  uniqueViolation?: boolean;
}): SqlQueryClient & { queries: Array<{ text: string; params: unknown[] | undefined }> } {
  const queries: Array<{ text: string; params: unknown[] | undefined }> = [];
  return {
    queries,
    async query(text: string, params?: readonly unknown[]) {
      const normalized = text.replace(/\s+/g, ' ').trim();
      queries.push({ text: normalized, params: params ? [...params] : undefined });
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') return { rows: [], rowCount: 0 };
      if (normalized.includes('pg_advisory_xact_lock')) return { rows: [], rowCount: 1 };
      if (normalized.includes('FROM public.school_id_cards')) return { rows: state.card ? [state.card] : [], rowCount: state.card ? 1 : 0 };
      if (normalized.includes('FROM public.school_id_card_settings')) return { rows: [state.settings || settings()], rowCount: 1 };
      if (normalized.includes('FROM public.students')) return { rows: state.studentFound === false ? [] : [{ id: studentA }], rowCount: state.studentFound === false ? 0 : 1 };
      if (normalized.includes('FROM public.tenant_staff')) return { rows: [{ is_active: state.staffActive !== false }], rowCount: 1 };
      if (normalized.includes('FOR UPDATE')) {
        return { rows: state.open ? [{ id: 'sess-open', inside_window: state.insideWindow === true }] : [], rowCount: state.open ? 1 : 0 };
      }
      if (normalized.includes('INSERT INTO public.school_entry_exit_sessions')) {
        if (state.uniqueViolation) {
          const error = new Error('duplicate key') as Error & { code: string };
          error.code = '23505';
          throw error;
        }
        return { rows: [{ id: 'sess-new' }], rowCount: 1 };
      }
      if (normalized.includes('UPDATE public.school_entry_exit_sessions')) return { rows: [], rowCount: 1 };
      if (normalized.includes('INSERT INTO public.school_entry_exit_events')) return { rows: [], rowCount: 1 };
      if (normalized.includes('INSERT INTO public.school_entry_exit_notifications')) return { rows: [], rowCount: 1 };
      if (normalized.includes('school_entry_exit_guardian_contacts')) return { rows: state.guardians || [], rowCount: (state.guardians || []).length };
      if (normalized.includes('school_staff_email_verifications')) return { rows: state.staffEmails || [], rowCount: (state.staffEmails || []).length };
      throw new Error(`unexpected sql: ${normalized}`);
    },
  };
}

function input(direction: 'arrival' | 'departure', tenantId = tenantA) {
  return {
    tenantId,
    actorUserId: teacherA,
    direction,
    tokenSha256: sha256Hex(rawToken),
    deviceLabel: 'mobile',
  };
}

function eventActions(queries: Array<{ text: string; params: unknown[] | undefined }>): unknown[] {
  return queries
    .filter((query) => query.text.includes('INSERT INTO public.school_entry_exit_events'))
    .map((query) => query.params?.[3]);
}

describe('school gate scans', () => {
  test('clock-in opens one session, records a skipped notification, and never sends the raw barcode', async () => {
    const client = scripted({ card: studentCard(), studentFound: true });
    const saved = await executeGateScan(client, input('arrival'));
    expect(saved.outcome).toBe('arrival_accepted');
    expect(saved.sessionId).toBe('sess-new');
    expect(saved.notificationStatus).toBe('skipped');
    expect(saved.person?.printedCode).toBe('ADM-2041');
    expect(eventActions(client.queries)).toEqual(['arrival_accepted']);
    expect(client.queries.some((query) => query.text.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(client.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_sessions'))).toBe(true);
    expect(client.queries.some((query) => query.text.includes("'skipped'") && query.params?.[3] === 'notifications_disabled')).toBe(true);
    expect(client.queries.at(-1)?.text).toBe('COMMIT');
    const dumped = JSON.stringify(client.queries);
    expect(dumped).not.toContain(rawToken);
    expect(dumped).not.toContain('attendance_records');
    expect(dumped).not.toContain('student_attendance');
    const lookup = client.queries.find((query) => query.text.includes('FROM public.school_id_cards'));
    expect(lookup?.params?.[0]).toBe(tenantA);
    expect(lookup?.params?.[1]).toBe(sha256Hex(rawToken));
  });

  test('a second clock-in does not open another session', async () => {
    const client = scripted({ card: studentCard(), open: true, insideWindow: false });
    const saved = await executeGateScan(client, input('arrival'));
    expect(saved.outcome).toBe('duplicate_open');
    expect(saved.notificationStatus).toBe('not_recorded');
    expect(client.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_sessions'))).toBe(false);
    expect(client.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_notifications'))).toBe(false);
  });

  test('a repeated scan inside the duplicate window stays on the open session', async () => {
    const client = scripted({ card: studentCard(), open: true, insideWindow: true });
    const saved = await executeGateScan(client, input('arrival'));
    expect(saved.outcome).toBe('duplicate_window');
    expect(saved.sessionId).toBe('sess-open');
  });

  test('clock-out without an open session is rejected and clock-out closes the open session', async () => {
    const missing = scripted({ card: studentCard() });
    const rejected = await executeGateScan(missing, input('departure'));
    expect(rejected.outcome).toBe('departure_without_session');
    expect(missing.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_sessions'))).toBe(false);

    const open = scripted({ card: studentCard(), open: true });
    const closed = await executeGateScan(open, input('departure'));
    expect(closed.outcome).toBe('departure_accepted');
    expect(closed.sessionId).toBe('sess-open');
    expect(open.queries.some((query) => query.text.includes('UPDATE public.school_entry_exit_sessions'))).toBe(true);
    expect(eventActions(open.queries)).toEqual(['departure_accepted']);
    expect(open.queries.some((query) => query.params?.[3] === 'notifications_disabled')).toBe(true);
  });

  test('unknown, revoked, inactive, and cross-tenant tokens do not open a session', async () => {
    const unknown = scripted({ card: null });
    expect((await executeGateScan(unknown, input('arrival', tenantB))).outcome).toBe('unknown_token');
    expect(unknown.queries.find((query) => query.text.includes('FROM public.school_id_cards'))?.params?.[0]).toBe(tenantB);

    const revoked = scripted({ card: studentCard({ status: 'revoked' }) });
    expect((await executeGateScan(revoked, input('arrival'))).outcome).toBe('revoked_card');

    const inactive = scripted({
      card: studentCard({ subject_type: 'staff', student_id: null, staff_id: staffA, printed_code: 'STAFF' }),
      staffActive: false,
    });
    expect((await executeGateScan(inactive, input('arrival'))).outcome).toBe('inactive_subject');

    for (const client of [unknown, revoked, inactive]) {
      expect(client.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_sessions'))).toBe(false);
    }
  });

  test('administrator cards are refused while entry tracking is off', async () => {
    const client = scripted({
      card: studentCard({ subject_type: 'admin', student_id: null, admin_user_id: ownerA, printed_code: 'ADMIN' }),
    });
    expect((await executeGateScan(client, input('arrival'))).outcome).toBe('tracking_disabled');
    expect(client.queries.some((query) => query.text.includes('INSERT INTO public.school_entry_exit_sessions'))).toBe(false);
  });

  test('an enabled guardian switch queues one row and does not read or send an email address', async () => {
    const client = scripted({
      card: studentCard(),
      settings: settings({ notify_student_arrival: true }),
      guardians: [{ id: '33333333-3333-4333-8333-333333333333' }],
    });
    const saved = await executeGateScan(client, input('arrival'));
    expect(saved.notificationStatus).toBe('queued');
    const queued = client.queries.find((query) => query.text.includes("'queued'"));
    expect(queued?.params).toEqual([tenantA, 'sess-new', 'arrival', '33333333-3333-4333-8333-333333333333']);
    expect(JSON.stringify(client.queries)).not.toContain('@');
  });

  test('a unique open-session conflict rolls back and does not commit', async () => {
    const client = scripted({ card: studentCard(), uniqueViolation: true });
    await expect(executeGateScan(client, input('arrival'))).rejects.toMatchObject({ code: '23505' });
    expect(client.queries.some((query) => query.text === 'ROLLBACK')).toBe(true);
    expect(client.queries.some((query) => query.text === 'COMMIT')).toBe(false);
  });

  test('the live scan and history routes stay closed while persistence is off', async () => {
    expect(schoolCardSqlRequested()).toBe(false);
    const source = fs.readFileSync(path.join(__dirname, '../src/modules/school-gate/school-gate.scan.ts'), 'utf8');
    expect(source).not.toContain('attendance_records');
    expect(source).not.toContain('student_attendance');
    expect(source).not.toContain('nodemailer');
    expect(source).not.toContain('smtp');
    expect(source).not.toContain("from 'pg'");
    expect(source).toContain("import('../../db/pg')");

    const app = express();
    app.use(express.json());
    registerSchoolCardRoutes(app, (req, _res, next) => {
      const header = req.header('x-test-user');
      (req as express.Request & { user?: object }).user = header ? JSON.parse(header) : undefined;
      next();
    });
    const scan = await request(app)
      .post('/api/school/gate/scans')
      .set('x-test-user', JSON.stringify({ id: teacherA, role: 'teacher', tenantId: tenantA }))
      .set('x-tenant-id', tenantB)
      .send({ direction: 'arrival', token: rawToken, tenantId: tenantB });
    expect(scan.status).toBe(503);
    expect(scan.body.code).toBe('SCHOOL_GATE_SCHEMA_UNAPPLIED');

    const named = await request(app)
      .post('/api/school/gate/scans')
      .set('x-test-user', JSON.stringify({ id: teacherA, role: 'teacher', tenantId: tenantA }))
      .send({ direction: 'arrival', token: 'ada@harbour.test' });
    expect(named.status).toBe(400);
    expect(named.body.code).toBe('INVALID_TOKEN');

    const platform = await request(app)
      .post('/api/school/gate/scans')
      .set('x-test-user', JSON.stringify({ id: platformA, role: 'super_admin', tenantId: tenantA }))
      .send({ direction: 'arrival', token: rawToken });
    expect(platform.status).toBe(403);

    const history = await request(app)
      .get('/api/school/gate/sessions')
      .set('x-test-user', JSON.stringify({ id: ownerA, role: 'owner', tenantId: tenantA }))
      .query({ tenantId: tenantB, state: 'open' });
    expect(history.status).toBe(503);
    expect(history.body.code).toBe('SCHOOL_GATE_SCHEMA_UNAPPLIED');
    expect(gateTokenHash(rawToken)).toHaveLength(64);
  });
});
