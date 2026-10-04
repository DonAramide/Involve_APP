import {
  FeeAssessmentLine,
  FeeAssessmentSnapshot,
  FeeAssessmentStore,
  FeeComponent,
} from '../types';
import { supabaseAdmin } from '../../../db/supabase';

function mapRow(row: any, lines: FeeAssessmentLine[]): FeeAssessmentSnapshot {
  return {
    id: String(row.id),
    mode: row.mode,
    kind: row.kind,
    transaction_type: row.transaction_type,
    source_system: row.source_system,
    source_idempotency_key: row.source_idempotency_key,
    transaction_reference: String(row.transaction_reference || row.source_idempotency_key),
    tenant_id: String(row.tenant_id),
    agent_id: row.agent_id ? String(row.agent_id) : null,
    resolved_source: row.resolved_source || null,
    profile_id: String(row.profile_id || row.fee_profile_id || ''),
    profile_version_id: String(row.profile_version_id || ''),
    override_version_id: row.override_version_id ? String(row.override_version_id) : null,
    method: row.method,
    transaction_amount_kobo: Number(row.principal_amount_kobo ?? row.transaction_amount_kobo),
    percentage_bps: Number(row.percentage_bps || 0),
    flat_amount_kobo: Number(row.flat_amount_kobo || 0),
    min_fee_kobo: Number(row.min_fee_kobo || 0),
    max_fee_kobo: Number(row.max_fee_kobo || 0),
    calculated_fee_kobo: Number(row.calculated_fee_kobo),
    min_applied_kobo: Number(row.min_applied_kobo || 0),
    cap_applied_kobo: Number(row.cap_applied_kobo || 0),
    final_fee_kobo: Number(row.final_fee_kobo),
    platform_bps: Number(row.platform_share_bps ?? row.platform_bps ?? 0),
    processor_bps: Number(row.processor_share_bps ?? row.processor_bps ?? 0),
    service_bps: Number(row.service_share_bps ?? row.service_bps ?? 0),
    agent_bps: Number(row.agent_share_bps ?? row.agent_bps ?? 0),
    platform_amount_kobo: Number(row.platform_amount_kobo || 0),
    processor_amount_kobo: Number(row.processor_amount_kobo || 0),
    service_amount_kobo: Number(row.service_amount_kobo || 0),
    agent_amount_kobo: Number(row.agent_amount_kobo || 0),
  };
}

function lineFromRow(row: any): FeeAssessmentLine {
  return {
    component: row.component as FeeComponent,
    amount_kobo: Number(row.amount_kobo),
    percent_bps: Number(row.percent_bps || 0),
    ledger_entry_id: null,
  };
}

export class SupabaseFeeAssessmentStore implements FeeAssessmentStore {
  async findByIdempotency(
    sourceSystem: string,
    sourceIdempotencyKey: string,
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] } | null> {
    const { data: row, error } = await supabaseAdmin
      .from('fee_assessments')
      .select('*')
      .eq('source_system', sourceSystem)
      .eq('source_idempotency_key', sourceIdempotencyKey)
      .maybeSingle();
    if (error || !row) return null;
    const { data: lineRows } = await supabaseAdmin
      .from('fee_assessment_lines')
      .select('*')
      .eq('assessment_id', row.id);
    const lines = (lineRows || []).map(lineFromRow);
    return { snapshot: mapRow(row, lines), lines };
  }

  async insert(
    snapshot: FeeAssessmentSnapshot,
    lines: FeeAssessmentLine[],
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] }> {
    const existing = await this.findByIdempotency(snapshot.source_system, snapshot.source_idempotency_key);
    if (existing) return existing;

    const { data: inserted, error } = await supabaseAdmin
      .from('fee_assessments')
      .insert({
        id: snapshot.id,
        tenant_id: snapshot.tenant_id,
        agent_id: snapshot.agent_id || null,
        fee_profile_id: snapshot.profile_id || null,
        resolved_source: snapshot.resolved_source || null,
        transaction_type: snapshot.transaction_type,
        source_system: snapshot.source_system,
        source_idempotency_key: snapshot.source_idempotency_key,
        mode: snapshot.mode,
        kind: snapshot.kind,
        principal_amount_kobo: snapshot.transaction_amount_kobo,
        calculated_fee_kobo: snapshot.calculated_fee_kobo,
        min_applied_kobo: snapshot.min_applied_kobo,
        cap_applied_kobo: snapshot.cap_applied_kobo,
        final_fee_kobo: snapshot.final_fee_kobo,
        platform_amount_kobo: snapshot.platform_amount_kobo,
        processor_amount_kobo: snapshot.processor_amount_kobo,
        service_amount_kobo: snapshot.service_amount_kobo,
        agent_amount_kobo: snapshot.agent_amount_kobo,
        method: snapshot.method,
        percentage_bps: snapshot.percentage_bps,
        flat_amount_kobo: snapshot.flat_amount_kobo,
        min_fee_kobo: snapshot.min_fee_kobo,
        max_fee_kobo: snapshot.max_fee_kobo,
        platform_share_bps: snapshot.platform_bps,
        processor_share_bps: snapshot.processor_bps,
        service_share_bps: snapshot.service_bps,
        agent_share_bps: snapshot.agent_bps,
        profile_version_id: snapshot.profile_version_id || null,
        override_version_id: snapshot.override_version_id,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      const replay = await this.findByIdempotency(snapshot.source_system, snapshot.source_idempotency_key);
      if (replay) return replay;
      throw error;
    }

    const assessmentId = inserted?.id || snapshot.id;
    if (lines.length) {
      const { error: lineErr } = await supabaseAdmin.from('fee_assessment_lines').insert(
        lines.map((line) => ({
          assessment_id: assessmentId,
          component: line.component,
          amount_kobo: line.amount_kobo,
          ledger_entry_id: null,
        })),
      );
      if (lineErr) {
        const replay = await this.findByIdempotency(snapshot.source_system, snapshot.source_idempotency_key);
        if (replay) return replay;
        throw lineErr;
      }
    }

    return this.findByIdempotency(snapshot.source_system, snapshot.source_idempotency_key).then(
      (found) => found || { snapshot, lines: lines.map((l) => ({ ...l, ledger_entry_id: null })) },
    );
  }
}
