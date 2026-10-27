/**
 * Postgres transaction adapter for school ID cards.
 * It does not import the database pool and it does not read a connection string.
 * The HTTP gate loads a transaction client only after SCHOOL_ID_CARD_SQL=on and a schema probe.
 * dbQuery must not run these statements because it logs SQL text.
 */

export interface SqlQueryClient {
  query(text: string, params?: readonly unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

export interface SqlStatement {
  text: string;
  params: readonly unknown[];
}

export const SCHOOL_CARD_PERSISTENCE_PREREQUISITE = [
  'Apply invify-backend/supabase/migrations/20261026233000_school_id_cards_and_entry_exit.sql to the target database.',
  'Confirm the school ID card tables and deferred audit triggers exist in that database.',
  'Set SCHOOL_ID_CARD_SQL=on only after that confirmation. The HTTP gate then borrows a transaction client and checks the schema before any card statement.',
  'Do not use dbQuery. It logs SQL text. This module does not open a connection by itself.',
  'Until the flag is on and the probe succeeds, card routes stay on the unapplied store and return SCHOOL_GATE_SCHEMA_UNAPPLIED.',
].join(' ');

export function schoolCardPersistenceStatus(): { operational: false; code: 'SCHOOL_GATE_SCHEMA_UNAPPLIED'; prerequisite: string } {
  return {
    operational: false,
    code: 'SCHOOL_GATE_SCHEMA_UNAPPLIED',
    prerequisite: SCHOOL_CARD_PERSISTENCE_PREREQUISITE,
  };
}

export async function runSchoolCardTransaction<T>(
  client: SqlQueryClient,
  work: (query: SqlQueryClient['query']) => Promise<T>,
): Promise<T> {
  await client.query('BEGIN');
  try {
    const result = await work((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The original statement error is the one the caller handles.
    }
    throw error;
  }
}

export interface CardSqlWrite {
  id: string;
  tenantId: string;
  subjectType: string;
  studentId: string | null;
  staffId: string | null;
  adminUserId: string | null;
  tokenSha256: string;
  expiresAt: string | null;
  replacesCardId: string | null;
  printedName: string;
  printedCode: string;
  printedDetail: string | null;
  issuedBy: string;
}

const CARD_INSERT = `INSERT INTO public.school_id_cards (
  id, tenant_id, subject_type, student_id, staff_id, admin_user_id, token_sha256,
  expires_at, replaces_card_id, printed_name, printed_code, printed_detail, issued_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

export function cardInsertStatement(card: CardSqlWrite): SqlStatement {
  return {
    text: CARD_INSERT,
    params: [
      card.id,
      card.tenantId,
      card.subjectType,
      card.studentId,
      card.staffId,
      card.adminUserId,
      card.tokenSha256,
      card.expiresAt,
      card.replacesCardId,
      card.printedName,
      card.printedCode,
      card.printedDetail,
      card.issuedBy,
    ],
  };
}

export function replacementStatements(card: CardSqlWrite, previousId: string, reason: string): SqlStatement[] {
  return [
    cardInsertStatement(card),
    {
      text: `INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id) VALUES ($1, $2, 'card_issued', $3)`,
      params: [card.tenantId, card.issuedBy, card.id],
    },
    {
      text: `UPDATE public.school_id_cards SET status = 'revoked', revoke_kind = 'replaced', revoked_by = $2 WHERE id = $1 AND tenant_id = $3 AND status = 'active'`,
      params: [previousId, card.issuedBy, card.tenantId],
    },
    {
      text: `INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id, reason) VALUES ($1, $2, 'card_revoked', $3, $4)`,
      params: [card.tenantId, card.issuedBy, previousId, reason],
    },
    {
      text: `UPDATE public.school_id_cards SET status = 'active' WHERE id = $1 AND tenant_id = $2 AND status = 'pending'`,
      params: [card.id, card.tenantId],
    },
  ];
}

export async function executeCardReplacement(
  client: SqlQueryClient,
  card: CardSqlWrite,
  previousId: string,
  reason: string,
): Promise<void> {
  const statements = replacementStatements(card, previousId, reason);
  await runSchoolCardTransaction(client, async (query) => {
    for (const statement of statements) await query(statement.text, statement.params);
  });
}

export async function executeCardIssue(client: SqlQueryClient, card: CardSqlWrite): Promise<void> {
  const insert = cardInsertStatement({ ...card, replacesCardId: null });
  await runSchoolCardTransaction(client, async (query) => {
    await query(insert.text, insert.params);
    await query(
      `INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id) VALUES ($1, $2, 'card_issued', $3)`,
      [card.tenantId, card.issuedBy, card.id],
    );
  });
}

export async function executeCardRevoke(
  client: SqlQueryClient,
  tenantId: string,
  cardId: string,
  actorId: string,
  reason: string,
): Promise<void> {
  await runSchoolCardTransaction(client, async (query) => {
    await query(
      `UPDATE public.school_id_cards SET status = 'revoked', revoke_kind = 'retired', revoked_by = $2 WHERE id = $1 AND tenant_id = $3 AND status = 'active'`,
      [cardId, actorId, tenantId],
    );
    await query(
      `INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id, reason) VALUES ($1, $2, 'card_revoked', $3, $4)`,
      [tenantId, actorId, cardId, reason],
    );
  });
}

export async function executeSettingsSave(
  client: SqlQueryClient,
  row: {
    tenantId: string;
    updatedBy: string;
    studentTemplate: string;
    staffTemplate: string;
    adminTemplate: string;
    paperSize: string;
    cardWidthMm: number;
    cardHeightMm: number;
    printOrientation: string;
    logoPlacement: string;
    accentColor: string;
    showAddress: boolean;
    showClassOrDepartment: boolean;
    showStatus: boolean;
    showIssueDate: boolean;
    showExpiry: boolean;
    disclaimer: string;
    signatureImageUrl: string | null;
    signatoryName: string | null;
    signatoryDesignation: string | null;
    lostFoundPhone: string | null;
    lostFoundEmail: string | null;
    notifyStudentArrival: boolean;
    notifyStudentDeparture: boolean;
    notifyStaffArrival: boolean;
    notifyStaffDeparture: boolean;
    trackAdminEntry: boolean;
    duplicateScanWindowSeconds: number;
  },
): Promise<void> {
  const params = [
    row.tenantId, row.studentTemplate, row.staffTemplate, row.adminTemplate, row.paperSize,
    row.cardWidthMm, row.cardHeightMm, row.printOrientation, row.logoPlacement, row.accentColor,
    row.showAddress, row.showClassOrDepartment, row.showStatus, row.showIssueDate, row.showExpiry,
    row.disclaimer, row.signatureImageUrl, row.signatoryName, row.signatoryDesignation,
    row.lostFoundPhone, row.lostFoundEmail, row.notifyStudentArrival, row.notifyStudentDeparture,
    row.notifyStaffArrival, row.notifyStaffDeparture, row.trackAdminEntry, row.duplicateScanWindowSeconds, row.updatedBy,
  ];
  await runSchoolCardTransaction(client, async (query) => {
    await query(
      `INSERT INTO public.school_id_card_settings (
        tenant_id, student_template, staff_template, admin_template, paper_size,
        card_width_mm, card_height_mm, print_orientation, logo_placement, accent_color,
        show_address, show_class_or_department, show_status, show_issue_date, show_expiry,
        disclaimer, signature_image_url, signatory_name, signatory_designation,
        lost_found_phone, lost_found_email, notify_student_arrival, notify_student_departure,
        notify_staff_arrival, notify_staff_departure, track_admin_entry, duplicate_scan_window_seconds, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        student_template = EXCLUDED.student_template,
        staff_template = EXCLUDED.staff_template,
        admin_template = EXCLUDED.admin_template,
        paper_size = EXCLUDED.paper_size,
        card_width_mm = EXCLUDED.card_width_mm,
        card_height_mm = EXCLUDED.card_height_mm,
        print_orientation = EXCLUDED.print_orientation,
        logo_placement = EXCLUDED.logo_placement,
        accent_color = EXCLUDED.accent_color,
        show_address = EXCLUDED.show_address,
        show_class_or_department = EXCLUDED.show_class_or_department,
        show_status = EXCLUDED.show_status,
        show_issue_date = EXCLUDED.show_issue_date,
        show_expiry = EXCLUDED.show_expiry,
        disclaimer = EXCLUDED.disclaimer,
        signature_image_url = EXCLUDED.signature_image_url,
        signatory_name = EXCLUDED.signatory_name,
        signatory_designation = EXCLUDED.signatory_designation,
        lost_found_phone = EXCLUDED.lost_found_phone,
        lost_found_email = EXCLUDED.lost_found_email,
        notify_student_arrival = EXCLUDED.notify_student_arrival,
        notify_student_departure = EXCLUDED.notify_student_departure,
        notify_staff_arrival = EXCLUDED.notify_staff_arrival,
        notify_staff_departure = EXCLUDED.notify_staff_departure,
        track_admin_entry = EXCLUDED.track_admin_entry,
        duplicate_scan_window_seconds = EXCLUDED.duplicate_scan_window_seconds,
        updated_by = EXCLUDED.updated_by`,
      params,
    );
    await query(
      `INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action) VALUES ($1, $2, 'settings_saved')`,
      [row.tenantId, row.updatedBy],
    );
  });
}
