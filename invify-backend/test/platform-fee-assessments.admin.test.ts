import * as fs from 'fs';
import * as path from 'path';
import { PlatformFeeAssessmentsService } from '../src/services/platform-fee-assessments.service';
import { FeeSplitter } from '../src/modules/fee-orchestration/FeeSplitter';

const ASSESSMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function assessmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSESSMENT_ID,
    tenant_id: 'tenant-1',
    transaction_type: 'POS_WITHDRAWAL',
    source_system: 'invify.pos',
    source_idempotency_key: 'POS_WITHDRAWAL:tenant-1:TEST:RRN',
    mode: 'SHADOW',
    kind: 'ASSESSMENT',
    principal_amount_kobo: 100000,
    calculated_fee_kobo: 1250,
    min_applied_kobo: 0,
    cap_applied_kobo: 0,
    final_fee_kobo: 1250,
    platform_amount_kobo: 342,
    processor_amount_kobo: 293,
    service_amount_kobo: 1,
    agent_amount_kobo: 614,
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_share_bps: 2739,
    processor_share_bps: 2340,
    service_share_bps: 12,
    agent_share_bps: 4909,
    profile_version_id: 'version-1',
    override_version_id: null,
    created_at: '2026-09-27T14:00:00.000Z',
    ...overrides,
  };
}

class FakeDb {
  tables: Record<string, any[]>;
  constructor(assessments: any[], lines: any[], extras: Record<string, any[]> = {}) {
    this.tables = {
      fee_assessments: assessments,
      fee_assessment_lines: lines,
      tenants: extras.tenants || [],
      users: extras.users || [],
      fee_profile_versions: extras.versions || [],
      fee_profile_override_versions: extras.overrides || [],
    };
  }
  from(table: string) {
    const self = this;
    const rows = (self.tables[table] || []).slice();
    const q: any = {
      _rows: rows,
      select() { return q; },
      eq(col: string, val: any) {
        q._rows = q._rows.filter((r: any) => String(r[col]) === String(val));
        return q;
      },
      in(col: string, vals: any[]) {
        const set = new Set((vals || []).map((v) => String(v)));
        q._rows = q._rows.filter((r: any) => set.has(String(r[col])));
        return q;
      },
      ilike(col: string, val: any) {
        const needle = String(val).replace(/%/g, '').toLowerCase();
        q._rows = q._rows.filter((r: any) => String(r[col] || '').toLowerCase().includes(needle));
        return q;
      },
      gte(col: string, val: any) {
        q._rows = q._rows.filter((r: any) => String(r[col]) >= String(val));
        return q;
      },
      lte(col: string, val: any) {
        q._rows = q._rows.filter((r: any) => String(r[col]) <= String(val));
        return q;
      },
      order() { return q; },
      limit() { return q; },
      maybeSingle() {
        return Promise.resolve({ data: q._rows[0] || null, error: null });
      },
      then(resolve: any, reject: any) {
        return Promise.resolve({ data: q._rows, error: null }).then(resolve, reject);
      },
    };
    return q;
  }
}

describe('platform fee assessments control plane', () => {
  it('lists assessments and applies filters without writing', async () => {
    const db = new FakeDb([assessmentRow(), assessmentRow({ id: 'b', mode: 'LIVE', transaction_type: 'SMS' })], []);
    const svc = new PlatformFeeAssessmentsService(db as any);
    const rows = await svc.list({ transactionType: 'POS_WITHDRAWAL', mode: 'SHADOW' });
    expect(rows).toHaveLength(1);
    expect(rows[0].mode).toBe('SHADOW');
    expect(rows[0].calculation_snapshot.final_fee_kobo).toBe(1250);
  });

  it('returns empty list without manufacturing rows', async () => {
    const svc = new PlatformFeeAssessmentsService(new FakeDb([], []) as any);
    await expect(svc.list()).resolves.toEqual([]);
    const summary = await svc.reconciliation();
    expect(summary.assessment_count).toBe(0);
    expect(summary.total_final_fee_kobo).toBe(0);
  });

  it('detail maps distribution labels and ledger_entry_id null in shadow', async () => {
    const db = new FakeDb([assessmentRow()], [
      { id: 'l1', assessment_id: ASSESSMENT_ID, component: 'PLATFORM', amount_kobo: 342, ledger_entry_id: null },
      { id: 'l2', assessment_id: ASSESSMENT_ID, component: 'PROCESSOR', amount_kobo: 293, ledger_entry_id: null },
      { id: 'l3', assessment_id: ASSESSMENT_ID, component: 'SERVICE', amount_kobo: 1, ledger_entry_id: null },
      { id: 'l4', assessment_id: ASSESSMENT_ID, component: 'AGENT_FEE', amount_kobo: 614, ledger_entry_id: null },
    ]);
    const svc = new PlatformFeeAssessmentsService(db as any);
    const detail = await svc.get(ASSESSMENT_ID);
    expect(detail.distribution.PLATFORM_FEE).toBe(342);
    expect(detail.distribution.PROCESSOR_FEE).toBe(293);
    expect(detail.distribution.SERVICE_FEE).toBe(1);
    expect(detail.distribution.AGENT_FEE).toBe(614);
    expect(detail.distribution.total_distributed_kobo).toBe(1250);
    expect(detail.distribution.matches_final_fee).toBe(true);
    expect(detail.ledger_entry_id).toBeNull();
    expect(detail.lines.map((l: any) => l.component_label)).toEqual([
      'PLATFORM_FEE',
      'PROCESSOR_FEE',
      'SERVICE_FEE',
      'AGENT_FEE',
    ]);
  });

  it('detail includes tenant, assessed fee, split formula, and formula maker/checker', async () => {
    const db = new FakeDb(
      [assessmentRow()],
      [{ id: 'l1', assessment_id: ASSESSMENT_ID, component: 'PLATFORM', amount_kobo: 342, ledger_entry_id: null }],
      {
        tenants: [{ id: 'tenant-1', name: 'Acme POS School' }],
        versions: [{
          id: 'version-1',
          version_number: 1,
          status: 'PUBLISHED',
          published_at: '2026-09-20T10:00:00.000Z',
          published_by: 'checker-1',
          updated_at: '2026-09-20T09:55:00.000Z',
          created_at: '2026-09-19T12:00:00.000Z',
          notes: '__FEE_MC__:' + JSON.stringify({
            status: 'published',
            makerId: 'maker-1',
            makerEmail: 'maker@invify.app',
            proposedAt: '2026-09-20T09:50:00.000Z',
            versionId: 'version-1',
            checkerId: 'checker-1',
            checkerEmail: 'checker@invify.app',
            approvedAt: '2026-09-20T10:00:00.000Z',
          }),
        }],
      },
    );
    const svc = new PlatformFeeAssessmentsService(db as any);
    const detail = await svc.get(ASSESSMENT_ID);
    expect(detail.tenant).toEqual({ id: 'tenant-1', name: 'Acme POS School' });
    expect(detail.fee_assessed_kobo).toBe(1250);
    expect(detail.fee_collected).toBe(false);
    expect(detail.split_formula.platform_share_bps).toBe(2739);
    expect(detail.split_formula.text).toMatch(/1\.25%/);
    expect(detail.formula_governance.formula_modified_by_label).toBe('maker@invify.app');
    expect(detail.formula_governance.formula_approved_by_label).toBe('checker@invify.app');
    expect(detail.formula_governance.formula_modified_at).toBe('2026-09-20T09:50:00.000Z');
    expect(detail.formula_governance.formula_approved_at).toBe('2026-09-20T10:00:00.000Z');
  });

  it('reconciliation counts invalid distributions', async () => {
    const bad = assessmentRow({ id: 'bad', final_fee_kobo: 1250, agent_amount_kobo: 0 });
    const db = new FakeDb([bad], [
      { assessment_id: 'bad', component: 'PLATFORM', amount_kobo: 342, ledger_entry_id: null },
    ]);
    const svc = new PlatformFeeAssessmentsService(db as any);
    const summary = await svc.reconciliation();
    expect(summary.assessment_count).toBe(1);
    expect(summary.errors.invalid_distribution_count).toBe(1);
    expect(summary.legacy_comparison.read_only).toBe(true);
  });

  it('uses the published staging POS split via largest-remainder', () => {
    const split = FeeSplitter.split(1250, {
      platform_bps: 2739,
      processor_bps: 2340,
      service_bps: 12,
      agent_bps: 4909,
    });
    expect(split.platform_amount_kobo + split.processor_amount_kobo + split.service_amount_kobo + split.agent_amount_kobo).toBe(1250);
    expect(split).toEqual({
      platform_amount_kobo: 342,
      processor_amount_kobo: 293,
      service_amount_kobo: 1,
      agent_amount_kobo: 614,
    });
  });

  it('registers assessment routes before :transactionType and is read-only', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    const ctrl = fs.readFileSync(path.join(__dirname, '../src/controllers/platform-fee-assessments.controller.ts'), 'utf8');
    const svc = fs.readFileSync(path.join(__dirname, '../src/services/platform-fee-assessments.service.ts'), 'utf8');
    const assessmentsIdx = app.indexOf("/platform-fees/assessments'");
    const typeIdx = app.indexOf("/platform-fees/:transactionType'");
    expect(assessmentsIdx).toBeGreaterThan(0);
    expect(assessmentsIdx).toBeLessThan(typeIdx);
    expect(app).toMatch(/\/platform-fees\/reconciliation/);
    expect(ctrl).not.toMatch(/static async (save|create|update|delete|publish|reverse|retry)/);
    expect(svc).not.toMatch(/FeeLedgerPoster/);
    expect(svc).not.toMatch(/process_ledger_double_entry/);
    expect(svc).not.toMatch(/USER_WALLET/);
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
  });
});
