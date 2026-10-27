/**
 * Replacement order required by school_gate_card_guard and school_gate_card_commit.
 * These statements are the contract for a future local transaction runner.
 * They are not executed, and this module does not open a database connection.
 */
export const REPLACEMENT_SQL = [
  'BEGIN',
  'INSERT INTO public.school_id_cards (tenant_id, subject_type, student_id, staff_id, admin_user_id, token_sha256, status, expires_at, replaces_card_id, printed_name, printed_code, printed_detail, issued_by) VALUES ($1, $2, $3, $4, $5, $6, \'pending\', $7, $8, $9, $10, $11, $12)',
  'INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id) VALUES ($1, $2, \'card_issued\', $3)',
  'UPDATE public.school_id_cards SET status = \'revoked\', revoke_kind = \'replaced\', revoked_by = $2 WHERE id = $1 AND tenant_id = $3 AND status = \'active\'',
  'INSERT INTO public.school_gate_audit_events (tenant_id, actor_user_id, action, card_id, reason) VALUES ($1, $2, \'card_revoked\', $3, $4)',
  'UPDATE public.school_id_cards SET status = \'active\' WHERE id = $1 AND tenant_id = $2 AND status = \'pending\'',
  'COMMIT',
] as const;

export const REPLACEMENT_STEPS = [
  'insert_pending_card',
  'audit_card_issued',
  'revoke_previous_replaced',
  'audit_card_revoked',
  'activate_pending_card',
] as const;

export function replacementSqlTouchesAttendanceOrSessions(sql: readonly string[]): boolean {
  const text = sql.join('\n').toLowerCase();
  return (
    text.includes('attendance_records')
    || text.includes('student_attendance')
    || text.includes('school_entry_exit_sessions')
    || text.includes('school_entry_exit_events')
  );
}
