import { SchoolCardError, SCHEMA_UNAPPLIED } from './school-card.errors';
import { assertCardManager } from './school-card.access';
import { schemaProbeIsReady, schoolCardSqlRequested } from './school-card.persistence';
import { runSchoolCardTransaction, SqlQueryClient } from './school-card.sql';
import { CardActor } from './school-card.types';

/**
 * Notify routes need guardian/staff verification tables + deferred audit.
 * Do not reuse the ID-card trigger probe — scans can work while that probe fails,
 * and remapping every SQL error to "migration unapplied" hides the real cause.
 */
const GATE_NOTIFY_SCHEMA_PROBE = `
SELECT (
  to_regclass('public.school_entry_exit_guardian_contacts') IS NOT NULL
  AND to_regclass('public.school_staff_email_verifications') IS NOT NULL
  AND to_regclass('public.school_gate_audit_events') IS NOT NULL
  AND to_regclass('public.school_id_card_settings') IS NOT NULL
  AND (
    SELECT count(*)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'school_entry_exit_guardian_contacts'
      AND NOT t.tgisinternal
      AND (
        (t.tgname = 'trg_school_entry_exit_guardian_guard' AND NOT t.tgdeferrable)
        OR (t.tgname = 'trg_school_entry_exit_guardian_audit' AND t.tgdeferrable AND t.tginitdeferred)
      )
  ) = 2
) AS ready
`;

async function withGateNotifyDatabase<T>(work: (client: SqlQueryClient) => Promise<T>): Promise<T> {
  if (!schoolCardSqlRequested()) throw SCHEMA_UNAPPLIED;
  let client: (SqlQueryClient & { release: () => void }) | undefined;
  try {
    const loaded = await import('../../db/pg');
    client = await loaded.getClient() as SqlQueryClient & { release: () => void };
  } catch {
    throw SCHEMA_UNAPPLIED;
  }
  try {
    const probe = await client!.query(GATE_NOTIFY_SCHEMA_PROBE);
    if (!schemaProbeIsReady(probe.rows[0] as { ready?: unknown } | undefined)) {
      throw SCHEMA_UNAPPLIED;
    }
    return await work(client!);
  } catch (error) {
    if (error instanceof SchoolCardError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('school gate:')) {
      throw new SchoolCardError(message, 409, 'SCHOOL_GATE_REJECTED');
    }
    console.warn('[GateNotify] database error:', message);
    throw new SchoolCardError(
      message && message.length < 300 ? message : 'Could not save gate email settings.',
      500,
      'GATE_NOTIFY_FAILED',
    );
  } finally {
    client?.release();
  }
}

function digits(raw: unknown): string {
  return String(raw || '').replace(/\D/g, '');
}

function validEmail(raw: unknown): string | null {
  const email = String(raw || '').trim();
  if (!email || email.length > 254 || email.includes(' ') || !email.includes('@')) return null;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email;
}

function requireEmail(raw: unknown): string {
  const email = validEmail(raw);
  if (!email) throw new SchoolCardError('Enter a valid email address.', 400, 'INVALID_EMAIL');
  return email;
}

export async function readParentGateNotify(actor: CardActor | undefined, query: Record<string, unknown>) {
  const scope = assertCardManager(actor);
  const phone = digits(query.phone);
  const emailHint = validEmail(query.email);
  const parentSyncId = String(query.parentSyncId || query.parentId || '').trim();
  return withGateNotifyDatabase(async (client) => {
    const students = await findStudentsForParent(client, scope.tenantId, phone, emailHint, parentSyncId);
    const studentIds = students.map((s) => s.studentId);
    const byStudent = new Map<string, { email: string; consent: boolean }>();
    if (studentIds.length > 0) {
      const contacts = await client.query(
        `SELECT student_id, email, consent_entry_exit, revoked_at IS NULL AS live
         FROM public.school_entry_exit_guardian_contacts
         WHERE tenant_id = $1 AND student_id = ANY($2::uuid[]) AND revoked_at IS NULL`,
        [scope.tenantId, studentIds],
      );
      for (const row of contacts.rows as Array<Record<string, unknown>>) {
        byStudent.set(String(row.student_id), {
          email: String(row.email || ''),
          consent: row.consent_entry_exit === true,
        });
      }
    }
    const liveEmails = [...byStudent.values()].map((v) => v.email).filter(Boolean);
    const email = emailHint || liveEmails[0] || '';
    const consented = students.length > 0 && students.every((s) => byStudent.get(s.studentId)?.consent === true);
    return {
      email,
      consent: consented,
      students: students.map((s) => ({
        studentId: s.studentId,
        name: s.name,
        admissionNumber: s.admissionNumber,
        consented: byStudent.get(s.studentId)?.consent === true,
        notifyEmail: byStudent.get(s.studentId)?.email || null,
      })),
    };
  });
}

export async function saveParentGateNotify(actor: CardActor | undefined, body: Record<string, unknown>) {
  const scope = assertCardManager(actor);
  const phone = digits(body.phone);
  const guardianName = String(body.guardianName || 'Parent / Guardian').trim() || 'Parent / Guardian';
  const parentSyncId = String(body.parentSyncId || body.parentId || '').trim();
  const consent = body.consent === true;
  const email = consent ? requireEmail(body.email) : (validEmail(body.email) || '');
  if (consent && phone.length < 7 && !email && !parentSyncId) {
    throw new SchoolCardError('Parent phone or email is required to link children.', 400, 'INVALID_PARENT');
  }

  return withGateNotifyDatabase(async (client) => {
    return runSchoolCardTransaction(client, async (query) => {
      const students = await findStudentsForParent(
        client,
        scope.tenantId,
        phone,
        email || null,
        parentSyncId,
        query,
      );
      if (students.length === 0) {
        throw new SchoolCardError(
          'No students are linked to this parent yet. Save the parent phone on each child first.',
          404,
          'NO_STUDENTS',
        );
      }

      for (const student of students) {
        const live = await query(
          `SELECT id, email, consent_entry_exit
           FROM public.school_entry_exit_guardian_contacts
           WHERE tenant_id = $1 AND student_id = $2 AND revoked_at IS NULL
           ORDER BY is_primary DESC, verified_at DESC`,
          [scope.tenantId, student.studentId],
        );
        const rows = live.rows as Array<{ id: string; email: string; consent_entry_exit: boolean }>;

        if (!consent) {
          for (const row of rows) {
            await revokeGuardian(query, scope.tenantId, scope.userId, row.id, 'Parent opted out of gate clock emails.');
          }
          continue;
        }

        const same = rows.find((r) => r.email.toLowerCase() === email.toLowerCase() && r.consent_entry_exit === true);
        if (same) continue;

        for (const row of rows) {
          await revokeGuardian(query, scope.tenantId, scope.userId, row.id, 'Replaced guardian gate email.');
        }

        const inserted = await query(
          `INSERT INTO public.school_entry_exit_guardian_contacts
             (tenant_id, student_id, guardian_name, relationship, email, email_normalized,
              consent_entry_exit, is_primary, verified_by)
           VALUES ($1, $2, $3, 'legal_guardian', $4, lower($4), TRUE, TRUE, $5)
           RETURNING id`,
          [scope.tenantId, student.studentId, guardianName.slice(0, 200), email, scope.userId],
        );
        const contactId = String((inserted.rows[0] as { id: string }).id);
        await query(
          `INSERT INTO public.school_gate_audit_events
             (tenant_id, actor_user_id, action, guardian_contact_id)
           VALUES ($1, $2, 'guardian_contact_verified', $3)`,
          [scope.tenantId, scope.userId, contactId],
        );
      }

      return {
        email,
        consent,
        studentCount: students.length,
      };
    });
  });
}

export async function readStaffGateNotify(actor: CardActor | undefined, query: Record<string, unknown>) {
  const scope = assertCardManager(actor);
  const phone = digits(query.phone);
  const name = String(query.name || '').trim();
  const staffIdHint = String(query.staffId || '').trim();
  return withGateNotifyDatabase(async (client) => {
    const staff = await findStaff(client, scope.tenantId, staffIdHint, phone, name);
    if (!staff) {
      return { found: false, email: '', accepts: false, staffId: null, staffName: null };
    }
    const found = await client.query(
      `SELECT email, accepts_entry_exit_email
       FROM public.school_staff_email_verifications
       WHERE tenant_id = $1 AND tenant_staff_id = $2 AND revoked_at IS NULL
       ORDER BY verified_at DESC
       LIMIT 1`,
      [scope.tenantId, staff.staffId],
    );
    const row = found.rows[0] as { email?: string; accepts_entry_exit_email?: boolean } | undefined;
    return {
      found: true,
      staffId: staff.staffId,
      staffName: staff.name,
      email: row?.email ? String(row.email) : '',
      accepts: row?.accepts_entry_exit_email === true,
    };
  });
}

export async function saveStaffGateNotify(actor: CardActor | undefined, body: Record<string, unknown>) {
  const scope = assertCardManager(actor);
  const phone = digits(body.phone);
  const name = String(body.name || '').trim();
  const staffIdHint = String(body.staffId || '').trim();
  const accepts = body.accepts === true;
  const email = accepts ? requireEmail(body.email) : (validEmail(body.email) || '');

  return withGateNotifyDatabase(async (client) => {
    return runSchoolCardTransaction(client, async (query) => {
      const staff = await findStaff(client, scope.tenantId, staffIdHint, phone, name, query);
      if (!staff) {
        throw new SchoolCardError(
          'Staff member was not found on the server roster. Sync staff, then try again.',
          404,
          'STAFF_NOT_FOUND',
        );
      }

      const live = await query(
        `SELECT id, email, accepts_entry_exit_email
         FROM public.school_staff_email_verifications
         WHERE tenant_id = $1 AND tenant_staff_id = $2 AND revoked_at IS NULL
         ORDER BY verified_at DESC`,
        [scope.tenantId, staff.staffId],
      );
      const rows = live.rows as Array<{ id: string; email: string; accepts_entry_exit_email: boolean }>;

      if (!accepts) {
        for (const row of rows) {
          await revokeStaffEmail(query, scope.tenantId, scope.userId, row.id, 'Staff opted out of gate clock emails.');
        }
        return { staffId: staff.staffId, email, accepts: false };
      }

      const same = rows.find((r) => r.email.toLowerCase() === email.toLowerCase() && r.accepts_entry_exit_email === true);
      if (same) return { staffId: staff.staffId, email, accepts: true };

      for (const row of rows) {
        await revokeStaffEmail(query, scope.tenantId, scope.userId, row.id, 'Replaced staff gate email.');
      }

      const inserted = await query(
        `INSERT INTO public.school_staff_email_verifications
           (tenant_id, tenant_staff_id, email, email_normalized, accepts_entry_exit_email, verified_by)
         VALUES ($1, $2, $3, lower($3), TRUE, $4)
         RETURNING id`,
        [scope.tenantId, staff.staffId, email, scope.userId],
      );
      const staffEmailId = String((inserted.rows[0] as { id: string }).id);
      await query(
        `INSERT INTO public.school_gate_audit_events
           (tenant_id, actor_user_id, action, staff_email_id)
         VALUES ($1, $2, 'staff_email_verified', $3)`,
        [scope.tenantId, scope.userId, staffEmailId],
      );
      return { staffId: staff.staffId, email, accepts: true };
    });
  });
}

async function revokeGuardian(
  query: SqlQueryClient['query'],
  tenantId: string,
  actorUserId: string,
  contactId: string,
  reason: string,
): Promise<void> {
  await query(
    `INSERT INTO public.school_gate_audit_events
       (tenant_id, actor_user_id, action, guardian_contact_id, reason)
     VALUES ($1, $2, 'guardian_contact_revoked', $3, $4)`,
    [tenantId, actorUserId, contactId, reason],
  );
  await query(
    `UPDATE public.school_entry_exit_guardian_contacts
     SET revoked_by = $2
     WHERE id = $1 AND tenant_id = $3 AND revoked_at IS NULL`,
    [contactId, actorUserId, tenantId],
  );
}

async function revokeStaffEmail(
  query: SqlQueryClient['query'],
  tenantId: string,
  actorUserId: string,
  staffEmailId: string,
  reason: string,
): Promise<void> {
  await query(
    `INSERT INTO public.school_gate_audit_events
       (tenant_id, actor_user_id, action, staff_email_id, reason)
     VALUES ($1, $2, 'staff_email_revoked', $3, $4)`,
    [tenantId, actorUserId, staffEmailId, reason],
  );
  await query(
    `UPDATE public.school_staff_email_verifications
     SET revoked_by = $2
     WHERE id = $1 AND tenant_id = $3 AND revoked_at IS NULL`,
    [staffEmailId, actorUserId, tenantId],
  );
}

async function findStudentsForParent(
  client: SqlQueryClient,
  tenantId: string,
  phoneDigits: string,
  email: string | null,
  parentSyncId = '',
  queryFn?: SqlQueryClient['query'],
): Promise<Array<{ studentId: string; name: string; admissionNumber: string }>> {
  const query = queryFn || ((text: string, params?: unknown[]) => client.query(text, params));
  // Staging students may lack parent_phone / parent_id columns. Prefer school_entities
  // payloads written by mobile sync (parentPhone, parentSyncId), then customers phone/email.
  let phone = phoneDigits || '';
  let mail = email || '';
  if (parentSyncId) {
    const parent = await query(
      `SELECT phone, email FROM public.customers
       WHERE tenant_id = $1 AND id::text = $2::text
       LIMIT 1`,
      [tenantId, parentSyncId],
    );
    const row = parent.rows[0] as { phone?: string; email?: string } | undefined;
    if (phone.length < 7) {
      phone = String(row?.phone || '').replace(/\D/g, '');
    }
    if (!mail) {
      mail = validEmail(row?.email) || '';
    }
  }

  const found = await query(
    `SELECT DISTINCT s.id,
            trim(both from coalesce(s.first_name,'') || ' ' || coalesce(s.last_name,'')) AS name,
            coalesce(s.admission_number, '') AS admission_number
     FROM public.school_entities e
     JOIN public.students s
       ON s.tenant_id = e.tenant_id
      AND (
        s.id::text = e.sync_id
        OR s.id::text = coalesce(e.payload->>'syncId', '')
        OR (
          coalesce(e.payload->>'admissionNumber', e.payload->>'admission_number', '') <> ''
          AND lower(s.admission_number) = lower(coalesce(e.payload->>'admissionNumber', e.payload->>'admission_number'))
        )
      )
     WHERE e.tenant_id = $1
       AND e.entity_type = 'student'
       AND (
         ($4 <> '' AND (
           coalesce(e.payload->>'parentSyncId', '') = $4
           OR coalesce(e.payload->>'parentId', '') = $4
           OR coalesce(e.payload->>'parent_id', '') = $4
         ))
         OR ($2 <> '' AND length($2) >= 7 AND regexp_replace(
           coalesce(e.payload->>'parentPhone', e.payload->>'parent_phone', ''),
           '[^0-9]', '', 'g'
         ) = $2)
         OR ($3 <> '' AND EXISTS (
           SELECT 1 FROM public.customers c
           WHERE c.tenant_id = e.tenant_id
             AND lower(coalesce(c.email, '')) = lower($3)
             AND length(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')) >= 7
             AND regexp_replace(
               coalesce(e.payload->>'parentPhone', e.payload->>'parent_phone', ''),
               '[^0-9]', '', 'g'
             ) = regexp_replace(c.phone, '[^0-9]', '', 'g')
         ))
       )
     ORDER BY coalesce(s.admission_number, '') ASC`,
    [tenantId, phone || '', mail || '', parentSyncId || ''],
  );
  return (found.rows as Array<Record<string, unknown>>).map((row) => ({
    studentId: String(row.id),
    name: String(row.name || '').trim() || 'Student',
    admissionNumber: String(row.admission_number || ''),
  }));
}

async function findStaff(
  client: SqlQueryClient,
  tenantId: string,
  staffId: string,
  phoneDigits: string,
  name: string,
  queryFn?: SqlQueryClient['query'],
): Promise<{ staffId: string; name: string } | null> {
  const query = queryFn || ((text: string, params?: unknown[]) => client.query(text, params));
  if (staffId) {
    const byId = await query(
      `SELECT id, name FROM public.tenant_staff
       WHERE tenant_id::text = $1::text AND id::text = $2::text AND is_active = TRUE
       LIMIT 1`,
      [tenantId, staffId],
    );
    const row = byId.rows[0] as { id?: string; name?: string } | undefined;
    if (row?.id) return { staffId: String(row.id), name: String(row.name || '') };
  }
  const found = await query(
    `SELECT id, name FROM public.tenant_staff
     WHERE tenant_id::text = $1::text AND is_active = TRUE
       AND (
         ($2 <> '' AND length($2) >= 7 AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = $2)
         OR ($3 <> '' AND lower(name) = lower($3))
       )
     ORDER BY CASE
       WHEN $2 <> '' AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = $2 THEN 0
       ELSE 1
     END
     LIMIT 1`,
    [tenantId, phoneDigits || '', name || ''],
  );
  const row = found.rows[0] as { id?: string; name?: string } | undefined;
  if (!row?.id) return null;
  return { staffId: String(row.id), name: String(row.name || '') };
}

