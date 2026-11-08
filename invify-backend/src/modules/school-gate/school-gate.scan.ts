import { SchoolCardError, SCHEMA_UNAPPLIED } from './school-card.errors';
import { assertCardManager, assertScanOperator } from './school-card.access';
import { schemaProbeIsReady, schoolCardSqlRequested } from './school-card.persistence';
import { runSchoolCardTransaction, SqlQueryClient } from './school-card.sql';
import { alnumUpper, isInvifyCode, normalizeInvifyCode } from './school-card.identity';
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
  person: {
    subjectType: string;
    printedName: string;
    printedCode: string;
    studentId: string | null;
    staffId: string | null;
  } | null;
  notificationStatus: 'skipped' | 'queued' | 'not_recorded';
  persisted: true;
  /** ISO time when the scan was accepted / evaluated (for gate display). */
  recordedAt: string;
}

export interface GateScanInput {
  tenantId: string;
  actorUserId: string;
  direction: GateDirection;
  /** Legacy opaque token hash (20–128 char secrets). */
  tokenSha256: string | null;
  /** New 12-char Invify Code 128 identity. */
  invifyCode: string | null;
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

/** Accept legacy opaque tokens (20–128) or the new 12-char Invify identity code. */
export function parseGateScanToken(raw: unknown): { tokenSha256: string | null; invifyCode: string | null } {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new SchoolCardError('Scan the card barcode. Typed names and identity numbers are not accepted.', 400, 'INVALID_TOKEN');
  }
  const trimmed = raw.trim();
  // HID wedges often prefix junk such as `{` before the printed identity:
  // `{BTHMTMY00000` → `BTHMTMY00000`. Braces are never part of Invify codes.
  const stripped = trimmed.replace(/^[^A-Za-z0-9_-]+/, '').replace(/[^A-Za-z0-9_-]+$/, '');
  const alnum = alnumUpper(stripped);
  if (alnum.length === 12 && (isInvifyCode(alnum) || /^[A-Z0-9]{12}$/.test(alnum))) {
    return { tokenSha256: null, invifyCode: normalizeInvifyCode(alnum) };
  }
  if (isInvifyCode(stripped) || /^[A-Za-z0-9]{12}$/.test(stripped)) {
    return { tokenSha256: null, invifyCode: normalizeInvifyCode(stripped) };
  }
  if (/^[A-Za-z0-9_-]{20,128}$/.test(stripped)) {
    return { tokenSha256: sha256Hex(stripped), invifyCode: null };
  }
  if (/^[A-Za-z0-9_-]{20,128}$/.test(trimmed)) {
    return { tokenSha256: sha256Hex(trimmed), invifyCode: null };
  }
  if (alnum.length > 0 && alnum.length !== 12 && alnum.length < 20) {
    throw new SchoolCardError(
      `That barcode is not a valid Invify identity (got ${alnum.length} characters after cleanup, need exactly 12). ` +
        `Ignore any leading "{" from the scanner and compare with the printed code under the barcode.`,
      400,
      'INVALID_TOKEN',
    );
  }
  throw new SchoolCardError('Scan the card barcode. Typed names and identity numbers are not accepted.', 400, 'INVALID_TOKEN');
}

export function scanHttpStatus(result: GateScanResult): number {
  return ACCEPTED.has(result.outcome) ? 200 : 409;
}

export async function scanThroughDatabase(actor: CardActor | undefined, body: Record<string, unknown>): Promise<GateScanResult> {
  const scope = assertScanOperator(actor);
  const parsed = parseGateScanToken(body.token);
  const input: GateScanInput = {
    tenantId: scope.tenantId,
    actorUserId: scope.userId,
    direction: directionOf(body.direction),
    tokenSha256: parsed.tokenSha256,
    invifyCode: parsed.invifyCode,
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
  const lockKey = input.invifyCode || input.tokenSha256;
  if (!lockKey) {
    throw new SchoolCardError('Scan the card barcode. Typed names and identity numbers are not accepted.', 400, 'INVALID_TOKEN');
  }
  if (input.tokenSha256) assertHash(input.tokenSha256);
  return runSchoolCardTransaction(client, async (query) => {
    await query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [input.tenantId, lockKey]);
    const found = input.invifyCode
      ? await query(
          `SELECT id, subject_type, student_id, staff_id, admin_user_id, status, expires_at, printed_name, printed_code
           FROM public.school_id_cards
           WHERE tenant_id = $1 AND invify_code = $2
           LIMIT 1`,
          [input.tenantId, input.invifyCode],
        )
      : await query(
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
    const person = personOf(card);
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
      const notificationStatus = await safeRecordNotification(
        query, input.tenantId, sessionId, card, 'arrival', settings, input.actorUserId,
      );
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
    const notificationStatus = await safeRecordNotification(
      query, input.tenantId, open.id, card, 'departure', settings, input.actorUserId,
    );
    return result(input, 'departure_accepted', open.id, person, notificationStatus);
  });
}

export async function recordConcurrentDuplicate(client: SqlQueryClient, input: GateScanInput): Promise<GateScanResult> {
  return runSchoolCardTransaction(client, async (query) => {
    const lockKey = input.invifyCode || input.tokenSha256 || '';
    await query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [input.tenantId, lockKey]);
    const found = input.invifyCode
      ? await query(
          `SELECT id, subject_type, student_id, staff_id, admin_user_id, status, expires_at, printed_name, printed_code
           FROM public.school_id_cards
           WHERE tenant_id = $1 AND invify_code = $2
           LIMIT 1`,
          [input.tenantId, input.invifyCode],
        )
      : await query(
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
    return result(input, action, open.id, personOf(card), 'not_recorded');
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
  // DB trigger refuses queued emails when notify_* is false. Migration defaulted
  // all four OFF — treat that legacy all-off row as "never configured" and enable.
  await query(
    `UPDATE public.school_id_card_settings
     SET notify_student_arrival = TRUE,
         notify_student_departure = TRUE,
         notify_staff_arrival = TRUE,
         notify_staff_departure = TRUE,
         updated_at = transaction_timestamp()
     WHERE tenant_id = $1
       AND notify_student_arrival IS FALSE
       AND notify_student_departure IS FALSE
       AND notify_staff_arrival IS FALSE
       AND notify_staff_departure IS FALSE`,
    [tenantId],
  );
  const found = await query(
    `SELECT notify_student_arrival, notify_student_departure, notify_staff_arrival, notify_staff_departure,
            track_admin_entry, duplicate_scan_window_seconds
     FROM public.school_id_card_settings
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const row = found.rows[0] as Partial<SettingsHit> | undefined;
  // No settings row yet → default ON so clock emails send without a manual toggle.
  if (!row) {
    return {
      notify_student_arrival: true,
      notify_student_departure: true,
      notify_staff_arrival: true,
      notify_staff_departure: true,
      track_admin_entry: false,
      duplicate_scan_window_seconds: 45,
    };
  }
  return {
    notify_student_arrival: row.notify_student_arrival === true,
    notify_student_departure: row.notify_student_departure === true,
    notify_staff_arrival: row.notify_staff_arrival === true,
    notify_staff_departure: row.notify_staff_departure === true,
    track_admin_entry: row.track_admin_entry === true,
    duplicate_scan_window_seconds: Number(row.duplicate_scan_window_seconds || 45),
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
      input.tokenSha256 || sha256Hex(input.invifyCode || 'unknown'),
      input.actorUserId,
      input.deviceLabel,
    ],
  );
}

/**
 * Clock-in/out must commit even when guardian/staff email provisioning fails.
 * Those SQL errors were previously remapped to SCHOOL_GATE_SCHEMA_UNAPPLIED and
 * rolled back the whole scan (tablet showed "Gate scans are not being saved yet").
 */
async function safeRecordNotification(
  query: SqlQueryClient['query'],
  tenantId: string,
  sessionId: string,
  card: CardHit,
  direction: GateDirection,
  settings: SettingsHit,
  actorUserId: string,
): Promise<'skipped' | 'queued'> {
  try {
    return await recordNotification(query, tenantId, sessionId, card, direction, settings, actorUserId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[GateScan] notification path failed; scan still committed:', message);
    try {
      await skip(query, tenantId, sessionId, direction, 'no_verified_recipient');
    } catch (skipErr: unknown) {
      console.warn('[GateScan] could not write skipped notification row:', skipErr instanceof Error ? skipErr.message : skipErr);
    }
    return 'skipped';
  }
}

async function recordNotification(
  query: SqlQueryClient['query'],
  tenantId: string,
  sessionId: string,
  card: CardHit,
  direction: GateDirection,
  settings: SettingsHit,
  actorUserId: string,
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
    await ensureGuardianContactsFromParent(query, tenantId, String(card.student_id), actorUserId);
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
         VALUES ($1, $2, $3, $4, 'queued')
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [tenantId, sessionId, direction, contact.id],
      );
    }
    return 'queued';
  }
  await ensureStaffEmailFromDirectory(query, tenantId, String(card.staff_id), actorUserId);
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
       VALUES ($1, $2, $3, $4, 'queued')
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [tenantId, sessionId, direction, email.id],
    );
  }
  return 'queued';
}

/** Prefer verified guardian rows; otherwise create one from parent CRM email. */
async function ensureGuardianContactsFromParent(
  query: SqlQueryClient['query'],
  tenantId: string,
  studentId: string,
  actorUserId: string,
): Promise<void> {
  const existing = await query(
    `SELECT 1 FROM public.school_entry_exit_guardian_contacts
     WHERE tenant_id = $1 AND student_id = $2 AND revoked_at IS NULL AND consent_entry_exit IS TRUE
     LIMIT 1`,
    [tenantId, studentId],
  );
  if (existing.rows.length > 0) return;

  // Prefer school_entities payload — staging students may lack parent_* columns.
  const linked = await query(
    `SELECT
       coalesce(e.payload->>'parentName', e.payload->>'parent_name', 'Parent / Guardian') AS parent_name,
       coalesce(e.payload->>'parentPhone', e.payload->>'parent_phone', '') AS parent_phone,
       coalesce(e.payload->>'parentSyncId', e.payload->>'parentId', e.payload->>'parent_id', '') AS parent_sync_id
     FROM public.school_entities e
     WHERE e.tenant_id = $1
       AND e.entity_type = 'student'
       AND (
         e.sync_id = $2::text
         OR coalesce(e.payload->>'syncId', '') = $2::text
       )
     ORDER BY e.updated_at DESC NULLS LAST
     LIMIT 1`,
    [tenantId, studentId],
  );
  const row = linked.rows[0] as {
    parent_name?: string | null;
    parent_phone?: string | null;
    parent_sync_id?: string | null;
  } | undefined;
  const parentPhone = String(row?.parent_phone || '').trim();
  const parentName = String(row?.parent_name || 'Parent / Guardian').trim() || 'Parent / Guardian';
  const parentSyncId = String(row?.parent_sync_id || '').trim();

  const candidates: Array<{ email: string; name: string }> = [];
  if (parentSyncId) {
    const byId = await query(
      `SELECT email, name FROM public.customers
       WHERE tenant_id = $1 AND id::text = $2::text
         AND email IS NOT NULL AND position('@' in email) > 1
       LIMIT 1`,
      [tenantId, parentSyncId],
    );
    for (const match of byId.rows as Array<{ email?: string; name?: string }>) {
      const email = String(match.email || '').trim();
      if (email.includes('@')) {
        candidates.push({ email, name: String(match.name || parentName).trim() || parentName });
      }
    }
  }
  const digits = parentPhone.replace(/\D/g, '');
  if (digits.length >= 7) {
    const matches = await query(
      `SELECT email, name FROM public.customers
       WHERE tenant_id = $1
         AND email IS NOT NULL
         AND position('@' in email) > 1
         AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = $2
       LIMIT 5`,
      [tenantId, digits],
    );
    for (const match of matches.rows as Array<{ email?: string; name?: string }>) {
      const email = String(match.email || '').trim();
      if (!email.includes('@')) continue;
      if (candidates.some((c) => c.email.toLowerCase() === email.toLowerCase())) continue;
      candidates.push({ email, name: String(match.name || parentName).trim() || parentName });
    }
  }

  for (const match of candidates) {
    try {
      await query(
        `INSERT INTO public.school_entry_exit_guardian_contacts
           (tenant_id, student_id, guardian_name, relationship, email, email_normalized,
            consent_entry_exit, is_primary, verified_by)
         VALUES ($1, $2, $3, 'legal_guardian', $4, lower($4), TRUE, TRUE, $5)
         ON CONFLICT DO NOTHING`,
        [tenantId, studentId, match.name.slice(0, 200), match.email, actorUserId],
      );
    } catch (err: any) {
      console.warn('[GateScan] guardian auto-provision skipped:', err?.message || err);
    }
  }
}

/** Staff verified mailbox from users.email when staff email verification is empty. */
async function ensureStaffEmailFromDirectory(
  query: SqlQueryClient['query'],
  tenantId: string,
  staffId: string,
  actorUserId: string,
): Promise<void> {
  const existing = await query(
    `SELECT 1 FROM public.school_staff_email_verifications
     WHERE tenant_id = $1 AND tenant_staff_id = $2 AND revoked_at IS NULL AND accepts_entry_exit_email IS TRUE
     LIMIT 1`,
    [tenantId, staffId],
  );
  if (existing.rows.length > 0) return;

  // Resolve staff mailbox from CRM phone/name match (tenant_staff has no email column).
  const found = await query(
    `SELECT c.email
     FROM public.tenant_staff ts
     JOIN public.customers c ON c.tenant_id = ts.tenant_id
       AND c.email IS NOT NULL AND position('@' in c.email) > 1
       AND (
         (
           coalesce(ts.phone, '') <> ''
           AND length(regexp_replace(ts.phone, '[^0-9]', '', 'g')) >= 7
           AND regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
             = regexp_replace(ts.phone, '[^0-9]', '', 'g')
         )
         OR lower(c.name) = lower(ts.name)
       )
     WHERE ts.id = $1 AND ts.tenant_id::text = $2::text
     ORDER BY CASE
       WHEN coalesce(ts.phone, '') <> ''
         AND regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
           = regexp_replace(ts.phone, '[^0-9]', '', 'g') THEN 0
       ELSE 1
     END
     LIMIT 1`,
    [staffId, tenantId],
  );
  const email = String((found.rows[0] as { email?: string } | undefined)?.email || '').trim();
  if (!email || !email.includes('@')) return;
  try {
    await query(
      `INSERT INTO public.school_staff_email_verifications
         (tenant_id, tenant_staff_id, email, email_normalized, accepts_entry_exit_email, verified_by)
       VALUES ($1, $2, $3, lower($3), TRUE, $4)
       ON CONFLICT DO NOTHING`,
      [tenantId, staffId, email, actorUserId],
    );
  } catch (err: any) {
    console.warn('[GateScan] staff email auto-provision skipped:', err?.message || err);
  }
}

/** Send queued gate emails after the scan transaction commits. */
export async function deliverQueuedGateEmails(opts: {
  tenantId: string;
  sessionId: string;
  direction: GateDirection;
}): Promise<{ sent: number; failed: number }> {
  const { withConfirmedSchoolCardDatabase } = await import('./school-card.persistence');
  const { emailService } = await import('../../services/email.service');
  return withConfirmedSchoolCardDatabase(async (client) => {
    const found = await client.query(
      `SELECT n.id, n.recipient_email, n.direction, n.attempt_count,
              s.opened_at, s.closed_at, s.subject_type,
              coalesce(c.printed_name, '') AS printed_name,
              coalesce(c.printed_code, '') AS printed_code,
              coalesce(t.name, 'School') AS school_name,
              coalesce(g.guardian_name, '') AS family_name
       FROM public.school_entry_exit_notifications n
       JOIN public.school_entry_exit_sessions s ON s.id = n.session_id
       LEFT JOIN public.school_id_cards c ON c.id = s.card_id
       LEFT JOIN public.tenants t ON t.id = n.tenant_id
       LEFT JOIN public.school_entry_exit_guardian_contacts g ON g.id = n.guardian_contact_id
       WHERE n.tenant_id = $1 AND n.session_id = $2 AND n.direction = $3 AND n.status = 'queued'`,
      [opts.tenantId, opts.sessionId, opts.direction],
    );
    let sent = 0;
    let failed = 0;
    for (const row of found.rows as Array<Record<string, unknown>>) {
      const to = String(row.recipient_email || '').trim();
      const id = String(row.id);
      if (!to) {
        failed += 1;
        continue;
      }
      try {
        const ok = await emailService.sendGateClockNotice(to, {
          schoolName: String(row.school_name || 'School'),
          personName: String(row.printed_name || 'Student'),
          personCode: String(row.printed_code || ''),
          familyName: String(row.family_name || '').trim() || null,
          subjectType: String(row.subject_type || 'student'),
          direction: opts.direction,
          recordedAt: opts.direction === 'departure' && row.closed_at ? String(row.closed_at) : String(row.opened_at || new Date().toISOString()),
          openedAt: row.opened_at ? String(row.opened_at) : null,
          closedAt: row.closed_at ? String(row.closed_at) : null,
        });
        if (ok) {
          await client.query(
            `UPDATE public.school_entry_exit_notifications
             SET status = 'sent', provider_accepted_at = transaction_timestamp(), last_error_code = NULL, updated_at = transaction_timestamp()
             WHERE id = $1 AND status = 'queued'`,
            [id],
          );
          sent += 1;
        } else {
          await client.query(
            `UPDATE public.school_entry_exit_notifications
             SET status = 'failed', last_error_code = 'mail_unavailable',
                 attempt_count = least(attempt_count + 1, 8), updated_at = transaction_timestamp()
             WHERE id = $1 AND status = 'queued'`,
            [id],
          );
          failed += 1;
        }
      } catch (err: any) {
        console.warn('[GateScan] email delivery failed:', err?.message || err);
        try {
          await client.query(
            `UPDATE public.school_entry_exit_notifications
             SET status = 'failed', last_error_code = 'unknown',
                 attempt_count = least(attempt_count + 1, 8), updated_at = transaction_timestamp()
             WHERE id = $1 AND status = 'queued'`,
            [id],
          );
        } catch (_) {}
        failed += 1;
      }
    }
    return { sent, failed };
  });
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

function personOf(card: CardHit): NonNullable<GateScanResult['person']> {
  return {
    subjectType: card.subject_type,
    printedName: card.printed_name,
    printedCode: card.printed_code,
    studentId: card.student_id,
    staffId: card.staff_id,
  };
}

function result(
  input: GateScanInput,
  outcome: GateOutcome,
  sessionId: string | null,
  person: GateScanResult['person'],
  notificationStatus: GateScanResult['notificationStatus'],
): GateScanResult {
  return {
    outcome,
    sessionId,
    direction: input.direction,
    person,
    notificationStatus,
    persisted: true,
    recordedAt: new Date().toISOString(),
  };
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
