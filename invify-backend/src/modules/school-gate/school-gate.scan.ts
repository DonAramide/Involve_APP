import { SchoolCardError, SCHEMA_UNAPPLIED } from './school-card.errors';
import { assertCardManager, assertScanOperator } from './school-card.access';
import { schemaProbeIsReady, schoolCardSqlRequested } from './school-card.persistence';
import { runSchoolCardTransaction, SqlQueryClient } from './school-card.sql';
import { sha256Hex } from './school-card.token';
import { CardActor } from './school-card.types';

/**
 * Gate scans write school_entry_exit_sessions and school_entry_exit_events.
 * Classroom present, absent, and late records are outside this module.
 * The raw barcode is hashed in this process and is not sent to SQL.
 * SCHOOL_ID_CARD_SQL must be on, and the schema probe must pass, before any statement runs.
 */

export const SCHOOL_GATE_SCAN_PROBE = `
SELECT (
  to_regclass('public.school_id_cards') IS NOT NULL
  AND to_regclass('public.school_id_card_settings') IS NOT NULL
  AND to_regclass('public.school_entry_exit_sessions') IS NOT NULL
  AND to_regclass('public.school_entry_exit_events') IS NOT NULL
  AND to_regclass('public.school_entry_exit_notifications') IS NOT NULL
  AND to_regprocedure('public.school_gate_sha256_hex(text)') IS NOT NULL
  AND (
    SELECT count(*)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'school_entry_exit_sessions'
      AND NOT t.tgisinternal
      AND t.tgname = 'trg_school_entry_exit_session_event_required'
      AND t.tgdeferrable
      AND t.tginitdeferred
  ) = 1
) AS ready
`;

export type GateDirection = 'arrival' | 'departure';

export type GateOutcome =
  | 'arrival_accepted'
  | 'departure_accepted'
  | 'duplicate_open'
  | 'duplicate_window'
  | 'departure_without_session'
  | 'unknown_token'
  | 'revoked_card'
  | 'expired_card'
  | 'inactive_subject'
  | 'tracking_disabled';

export interface GateScanResult {
  outcome: GateOutcome;
  sessionId: string | null;
  direction: GateDirection;
  person: { subjectType: string; printedName: string; printedCode: string } | null;
  notificationStatus: 'skipped' | 'queued' | 'not_recorded';
  persisted: true;
}

export interface GateScanInput {
  tenantId: string;
  actorUserId: string;
  direction: GateDirection;
  tokenSha256: string;
  deviceLabel: string | null;
}

interface CardHit {
  id: string;
  subject_type: string;
  student_id: string | null;
  staff_id: string | null;
  admin_user_id: string | null;
  status: string;
  expires_at: string | null;
  printed_name: string;
  printed_code: string;
}

const ACCEPTED = new Set<GateOutcome>(['arrival_accepted', 'departure_accepted']);

export function gateTokenHash(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(raw)) {
    throw new SchoolCardError('Scan the card barcode. Typed names and identity numbers are not accepted.', 400, 'INVALID_TOKEN');
  }
  return sha256Hex(raw);
}

export function scanHttpStatus(result: GateScanResult): number {
  return ACCEPTED.has(result.outcome) ? 200 : 409;
}

export async function scanThroughDatabase(actor: CardActor | undefined, body: Record<string, unknown>): Promise<GateScanResult> {
  const scope = assertScanOperator(actor);
  const input: GateScanInput = {
    tenantId: scope.tenantId,
    actorUserId: scope.userId,
    direction: directionOf(body.direction),
    tokenSha256: gateTokenHash(body.token),
    deviceLabel: deviceOf(body.deviceLabel),
  };
  try {
    return await withSchoolGateDatabase((client) => executeGateScan(client, input));
  } catch (error) {
    if (error instanceof SchoolCardError && error.code === 'DUPLICATE_OPEN' && input.direction === 'arrival') {
      return withSchoolGateDatabase((client) => recordConcurrentDuplicate(client, input));
    }
    throw error;
  }
}

export async function executeGateScan(client: SqlQueryClient, input: GateScanInput): Promise<GateScanResult> {
  assertHash(input.tokenSha256);
  return runSchoolCardTransaction(client, async (query) => {
    await query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [input.tenantId, input.tokenSha256]);
    const found = await query(
      `SELECT id, subject_type, student_id, staff_id, admin_user_id, status, expires_at, printed_name, printed_code
       FROM public.school_id_cards
       WHERE tenant_id = $1 AND token_sha256 = $2
       LIMIT 1`,
      [input.tenantId, input.tokenSha256],
    );
    const card = found.rows[0] as CardHit | undefined;
    if (!card) {
      await insertEvent(query, input, { action: 'unknown_token' });
      return result(input, 'unknown_token', null, null, 'not_recorded');
    }
    const person = {
      subjectType: card.subject_type,
      printedName: card.printed_name,
      printedCode: card.printed_code,
    };
    if (card.status === 'revoked') {
      await insertEvent(query, input, { action: 'revoked_card', card });
      return result(input, 'revoked_card', null, person, 'not_recorded');
    }
    if (card.status !== 'active') {
      throw new SchoolCardError('This card is not active.', 409, 'CARD_NOT_ACTIVE');
    }
    if (card.expires_at && new Date(card.expires_at).getTime() <= Date.now()) {
      await insertEvent(query, input, { action: 'expired_card', card });
      return result(input, 'expired_card', null, person, 'not_recorded');
    }
    const settings = await readSettings(query, input.tenantId);
    if (card.subject_type === 'admin' && settings.track_admin_entry !== true) {
      await insertEvent(query, input, { action: 'tracking_disabled', card });
      return result(input, 'tracking_disabled', null, person, 'not_recorded');
    }
    if (!(await subjectIsActive(query, input.tenantId, card))) {
      await insertEvent(query, input, { action: 'inactive_subject', card });
      return result(input, 'inactive_subject', null, person, 'not_recorded');
    }
    const open = await openSession(query, input.tenantId, card, settings.duplicate_scan_window_seconds);
    if (input.direction === 'arrival') {
      if (open) {
        const action = open.inside_window ? 'duplicate_window' : 'duplicate_open';
        await insertEvent(query, input, { action, card, sessionId: open.id });
        return result(input, action, open.id, person, 'not_recorded');
      }
      const inserted = await query(
        `INSERT INTO public.school_entry_exit_sessions
           (tenant_id, subject_type, student_id, staff_id, admin_user_id, card_id, origin, opened_by_user_id, device_label)
         VALUES ($1, $2, $3, $4, $5, $6, 'scan', $7, $8)
         RETURNING id`,
        [input.tenantId, card.subject_type, card.student_id, card.staff_id, card.admin_user_id, card.id, input.actorUserId, input.deviceLabel],
      );
      const sessionId = String((inserted.rows[0] as { id: string }).id);
      await insertEvent(query, input, { action: 'arrival_accepted', card, sessionId });
      const notificationStatus = await recordNotification(query, input.tenantId, sessionId, card, 'arrival', settings);
      return result(input, 'arrival_accepted', sessionId, person, notificationStatus);
    }
    if (!open) {
      await insertEvent(query, input, { action: 'departure_without_session', card });
      return result(input, 'departure_without_session', null, person, 'not_recorded');
    }
    await query(
      `UPDATE public.school_entry_exit_sessions
       SET closed_at = transaction_timestamp(), close_source = 'scan', closed_by_user_id = $2
       WHERE id = $1 AND tenant_id = $3 AND closed_at IS NULL AND voided_at IS NULL`,
      [open.id, input.actorUserId, input.tenantId],
    );
    await insertEvent(query, input, { action: 'departure_accepted', card, sessionId: open.id });
    const notificationStatus = await recordNotification(query, input.tenantId, open.id, card, 'departure', settings);
    return result(input, 'departure_accepted', open.id, person, notificationStatus);
  });
}

export async function recordConcurrentDuplicate(client: SqlQueryClient, input: GateScanInput): Promise<GateScanResult> {
  return runSchoolCardTransaction(client, async (query) => {
    await query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [input.tenantId, input.tokenSha256]);
    const found = await query(
      `SELECT id, subject_type, student_id, staff_id, admin_user_id, status, expires_at, printed_name, printed_code
       FROM public.school_id_cards
       WHERE tenant_id = $1 AND token_sha256 = $2
       LIMIT 1`,
      [input.tenantId, input.tokenSha256],
    );
    const card = found.rows[0] as CardHit | undefined;
    if (!card || card.status !== 'active') {
      throw new SchoolCardError('An open entry session already exists for this person.', 409, 'DUPLICATE_OPEN');
    }
    const settings = await readSettings(query, input.tenantId);
    const open = await openSession(query, input.tenantId, card, settings.duplicate_scan_window_seconds);
    if (!open) {
      throw new SchoolCardError('An open entry session already exists for this person.', 409, 'DUPLICATE_OPEN');
    }
    const action = open.inside_window ? 'duplicate_window' : 'duplicate_open';
    await insertEvent(query, input, { action, card, sessionId: open.id });
    return result(input, action, open.id, {
      subjectType: card.subject_type,
      printedName: card.printed_name,
      printedCode: card.printed_code,
    }, 'not_recorded');
  });
}

export interface GateHistory {
  sessions: Array<{
    id: string;
    subjectType: string;
    printedName: string;
    printedCode: string;
    openedAt: string | null;
    closedAt: string | null;
    voidedAt: string | null;
    state: 'open' | 'closed' | 'voided';
    notifications: Array<{ direction: string; status: string; skipReason: string | null }>;
  }>;
  limit: number;
  offset: number;
  total: number;
}

export async function listGateSessionsThroughDatabase(actor: CardActor | undefined, query: Record<string, unknown>): Promise<GateHistory> {
  const scope = assertCardManager(actor);
  const limit = boundedInt(query.limit, 25, 1, 100);
  const offset = boundedInt(query.offset, 0, 0, 10000);
  const state = query.state === 'open' ? 'open' : 'all';
  return withSchoolGateDatabase(async (client) => {
    const listed = await client.query(
      `SELECT s.id, s.subject_type, s.opened_at, s.closed_at, s.voided_at,
              c.printed_name, c.printed_code, count(*) OVER() AS total_count
       FROM public.school_entry_exit_sessions s
       JOIN public.school_id_cards c ON c.id = s.card_id AND c.tenant_id = s.tenant_id
       WHERE s.tenant_id = $1
         AND ($4::text = 'all' OR (s.closed_at IS NULL AND s.voided_at IS NULL))
       ORDER BY s.opened_at DESC
       LIMIT $2 OFFSET $3`,
      [scope.tenantId, limit, offset, state],
    );
    const ids = listed.rows.map((row) => String((row as { id: string }).id));
    const notes = ids.length === 0
      ? { rows: [] as unknown[] }
      : await client.query(
        `SELECT session_id, direction, status, skip_reason
         FROM public.school_entry_exit_notifications
         WHERE tenant_id = $1 AND session_id = ANY($2::uuid[])
         ORDER BY created_at ASC`,
        [scope.tenantId, ids],
      );
    const bySession = new Map<string, GateHistory['sessions'][number]['notifications']>();
    for (const row of notes.rows as Array<Record<string, unknown>>) {
      const key = String(row.session_id);
      const list = bySession.get(key) || [];
      list.push({
        direction: String(row.direction),
        status: String(row.status),
        skipReason: row.skip_reason == null ? null : String(row.skip_reason),
      });
      bySession.set(key, list);
    }
    return {
      limit,
      offset,
      total: listed.rows.length === 0 ? 0 : Number((listed.rows[0] as { total_count: unknown }).total_count || 0),
      sessions: (listed.rows as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        subjectType: String(row.subject_type),
        printedName: String(row.printed_name || ''),
        printedCode: String(row.printed_code || ''),
        openedAt: row.opened_at == null ? null : String(row.opened_at),
        closedAt: row.closed_at == null ? null : String(row.closed_at),
        voidedAt: row.voided_at == null ? null : String(row.voided_at),
        state: row.voided_at ? 'voided' : row.closed_at ? 'closed' : 'open',
        notifications: bySession.get(String(row.id)) || [],
      })),
    };
  });
}

async function withSchoolGateDatabase<T>(work: (client: SqlQueryClient) => Promise<T>): Promise<T> {
  if (!schoolCardSqlRequested()) throw SCHEMA_UNAPPLIED;
  let client: SqlQueryClient & { release: () => void };
  try {
    const loaded = await import('../../db/pg');
    client = await loaded.getClient() as SqlQueryClient & { release: () => void };
  } catch {
    throw SCHEMA_UNAPPLIED;
  }
  try {
    const probe = await client.query(SCHOOL_GATE_SCAN_PROBE);
    if (!schemaProbeIsReady(probe.rows[0] as { ready?: unknown } | undefined)) throw SCHEMA_UNAPPLIED;
    return await work(client);
  } catch (error) {
    if (error instanceof SchoolCardError) throw error;
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('school gate:')) {
      throw new SchoolCardError(message, 409, 'SCHOOL_GATE_REJECTED');
    }
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (code === '23505') {
      throw new SchoolCardError('An open entry session already exists for this person.', 409, 'DUPLICATE_OPEN');
    }
    throw SCHEMA_UNAPPLIED;
  } finally {
    client.release();
  }
}

interface SettingsHit {
  notify_student_arrival: boolean;
  notify_student_departure: boolean;
  notify_staff_arrival: boolean;
  notify_staff_departure: boolean;
  track_admin_entry: boolean;
  duplicate_scan_window_seconds: number;
}

async function readSettings(query: SqlQueryClient['query'], tenantId: string): Promise<SettingsHit> {
  const found = await query(
    `SELECT notify_student_arrival, notify_student_departure, notify_staff_arrival, notify_staff_departure,
            track_admin_entry, duplicate_scan_window_seconds
     FROM public.school_id_card_settings
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const row = found.rows[0] as Partial<SettingsHit> | undefined;
  return {
    notify_student_arrival: row?.notify_student_arrival === true,
    notify_student_departure: row?.notify_student_departure === true,
    notify_staff_arrival: row?.notify_staff_arrival === true,
    notify_staff_departure: row?.notify_staff_departure === true,
    track_admin_entry: row?.track_admin_entry === true,
    duplicate_scan_window_seconds: Number(row?.duplicate_scan_window_seconds || 45),
  };
}

async function subjectIsActive(query: SqlQueryClient['query'], tenantId: string, card: CardHit): Promise<boolean> {
  if (card.subject_type === 'student') {
    const found = await query(
      'SELECT id FROM public.students WHERE id = $1 AND tenant_id = $2',
      [card.student_id, tenantId],
    );
    return found.rows.length === 1;
  }
  if (card.subject_type === 'staff') {
    const found = await query(
      'SELECT is_active FROM public.tenant_staff WHERE id = $1 AND tenant_id::text = $2::text',
      [card.staff_id, tenantId],
    );
    const row = found.rows[0] as { is_active?: unknown } | undefined;
    return row?.is_active === true;
  }
  return card.subject_type === 'admin';
}

async function openSession(
  query: SqlQueryClient['query'],
  tenantId: string,
  card: CardHit,
  windowSeconds: number,
): Promise<{ id: string; inside_window: boolean } | null> {
  const column = card.subject_type === 'student' ? 'student_id' : card.subject_type === 'staff' ? 'staff_id' : 'admin_user_id';
  const subjectId = card.subject_type === 'student' ? card.student_id : card.subject_type === 'staff' ? card.staff_id : card.admin_user_id;
  const found = await query(
    `SELECT id, opened_at > transaction_timestamp() - make_interval(secs => $3::int) AS inside_window
     FROM public.school_entry_exit_sessions
     WHERE tenant_id = $1 AND ${column} = $2 AND closed_at IS NULL AND voided_at IS NULL
     FOR UPDATE`,
    [tenantId, subjectId, windowSeconds],
  );
  const row = found.rows[0] as { id: string; inside_window: boolean } | undefined;
  return row ? { id: String(row.id), inside_window: row.inside_window === true } : null;
}

async function insertEvent(
  query: SqlQueryClient['query'],
  input: GateScanInput,
  event: { action: string; card?: CardHit; sessionId?: string },
): Promise<void> {
  await query(
    `INSERT INTO public.school_entry_exit_events
       (tenant_id, session_id, card_id, action, token_sha256, actor_user_id, device_label)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.tenantId,
      event.sessionId || null,
      event.card?.id || null,
      event.action,
      input.tokenSha256,
      input.actorUserId,
      input.deviceLabel,
    ],
  );
}

async function recordNotification(
  query: SqlQueryClient['query'],
  tenantId: string,
  sessionId: string,
  card: CardHit,
  direction: GateDirection,
  settings: SettingsHit,
): Promise<'skipped' | 'queued'> {
  const enabled = direction === 'arrival'
    ? (card.subject_type === 'student' ? settings.notify_student_arrival : card.subject_type === 'staff' ? settings.notify_staff_arrival : false)
    : (card.subject_type === 'student' ? settings.notify_student_departure : card.subject_type === 'staff' ? settings.notify_staff_departure : false);
  if (card.subject_type === 'admin' || !enabled) {
    await query(
      `INSERT INTO public.school_entry_exit_notifications
         (tenant_id, session_id, direction, status, skip_reason)
       VALUES ($1, $2, $3, 'skipped', $4)`,
      [tenantId, sessionId, direction, card.subject_type === 'admin' ? 'no_verified_recipient' : 'notifications_disabled'],
    );
    return 'skipped';
  }
  if (card.subject_type === 'student') {
    const contacts = await query(
      `SELECT id FROM public.school_entry_exit_guardian_contacts
       WHERE tenant_id = $1 AND student_id = $2 AND revoked_at IS NULL AND consent_entry_exit IS TRUE`,
      [tenantId, card.student_id],
    );
    if (contacts.rows.length === 0) {
      await skip(query, tenantId, sessionId, direction, 'no_verified_recipient');
      return 'skipped';
    }
    for (const contact of contacts.rows as Array<{ id: string }>) {
      await query(
        `INSERT INTO public.school_entry_exit_notifications
           (tenant_id, session_id, direction, guardian_contact_id, status)
         VALUES ($1, $2, $3, $4, 'queued')`,
        [tenantId, sessionId, direction, contact.id],
      );
    }
    return 'queued';
  }
  const emails = await query(
    `SELECT id FROM public.school_staff_email_verifications
     WHERE tenant_id = $1 AND tenant_staff_id = $2 AND revoked_at IS NULL AND accepts_entry_exit_email IS TRUE`,
    [tenantId, card.staff_id],
  );
  if (emails.rows.length === 0) {
    await skip(query, tenantId, sessionId, direction, 'no_verified_recipient');
    return 'skipped';
  }
  for (const email of emails.rows as Array<{ id: string }>) {
    await query(
      `INSERT INTO public.school_entry_exit_notifications
         (tenant_id, session_id, direction, staff_email_id, status)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [tenantId, sessionId, direction, email.id],
    );
  }
  return 'queued';
}

async function skip(
  query: SqlQueryClient['query'],
  tenantId: string,
  sessionId: string,
  direction: GateDirection,
  reason: string,
): Promise<void> {
  await query(
    `INSERT INTO public.school_entry_exit_notifications
       (tenant_id, session_id, direction, status, skip_reason)
     VALUES ($1, $2, $3, 'skipped', $4)`,
    [tenantId, sessionId, direction, reason],
  );
}

function result(
  input: GateScanInput,
  outcome: GateOutcome,
  sessionId: string | null,
  person: GateScanResult['person'],
  notificationStatus: GateScanResult['notificationStatus'],
): GateScanResult {
  return { outcome, sessionId, direction: input.direction, person, notificationStatus, persisted: true };
}

function directionOf(value: unknown): GateDirection {
  if (value === 'arrival' || value === 'departure') return value;
  throw new SchoolCardError('Choose clock in or clock out.', 400, 'INVALID_DIRECTION');
}

function deviceOf(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new SchoolCardError('Device label is invalid.', 400, 'INVALID_DEVICE');
  const text = value.trim();
  if (text.length < 1 || text.length > 120) throw new SchoolCardError('Device label is invalid.', 400, 'INVALID_DEVICE');
  return text;
}

function assertHash(value: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new SchoolCardError('Scan the card barcode. Typed names and identity numbers are not accepted.', 400, 'INVALID_TOKEN');
  }
}

function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}
