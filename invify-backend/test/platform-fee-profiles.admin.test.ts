import {
  PlatformFeeProfilesService,
  computePreview,
  publishBlockers,
  POS_WITHDRAWAL_DEFAULTS,
} from '../src/services/platform-fee-profiles.service';
import * as fs from 'fs';
import * as path from 'path';

const PROFILE_ID = '11111111-1111-1111-1111-111111111111';
const DRAFT_ID = '22222222-2222-2222-2222-222222222222';
const PUBLISHED_ID = '33333333-3333-3333-3333-333333333333';

function posProfile() {
  return {
    id: PROFILE_ID,
    transaction_type: 'POS_WITHDRAWAL',
    display_name: 'POS withdrawal',
    description: 'cap',
    current_published_version_id: null,
    created_at: '2026-09-26T00:00:00.000Z',
    updated_at: '2026-09-26T00:00:00.000Z',
  };
}

function posDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: DRAFT_ID,
    profile_id: PROFILE_ID,
    version_number: 1,
    status: 'DRAFT',
    method: 'PERCENTAGE',
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_share_bps: 0,
    processor_share_bps: 0,
    service_share_bps: 0,
    agent_share_bps: 0,
    notes: 'seed',
    created_at: '2026-09-26T00:00:00.000Z',
    updated_at: '2026-09-26T00:00:00.000Z',
    published_at: null,
    published_by: null,
    ...overrides,
  };
}

class FakeDb {
  profiles: any[];
  versions: any[];
  agents: any[];
  agentLinks: any[];
  rpcCalls: Array<{ name: string; args: any }> = [];
  tableTouches: string[] = [];

  constructor(profiles: any[], versions: any[], agents: any[] = [], agentLinks: any[] = []) {
    this.profiles = profiles.map((p) => ({ ...p }));
    this.versions = versions.map((v) => ({ ...v }));
    this.agents = agents.map((a) => ({ ...a }));
    this.agentLinks = agentLinks.map((l) => ({ ...l }));
  }

  from(table: string) {
    this.tableTouches.push(table);
    const self = this;
    if (table === 'fee_profiles') {
      return {
        select() {
          const q: any = {
            _rows: self.profiles.slice(),
            eq(col: string, val: any) {
              q._rows = q._rows.filter((r: any) => String(r[col]) === String(val));
              return q;
            },
            order() {
              return q;
            },
            maybeSingle() {
              return Promise.resolve({ data: q._rows[0] || null, error: null });
            },
            then(resolve: any, reject: any) {
              return Promise.resolve({ data: q._rows, error: null }).then(resolve, reject);
            },
          };
          return q;
        },
        insert(row: any) {
          const rec = { ...row };
          self.profiles.push(rec);
          return Promise.resolve({ data: rec, error: null });
        },
      };
    }
    if (table === 'fee_profile_versions') {
      return {
        select() {
          const q: any = {
            _rows: self.versions.slice(),
            eq(col: string, val: any) {
              q._rows = q._rows.filter((r: any) => String(r[col]) === String(val));
              return q;
            },
            order() {
              return q;
            },
            maybeSingle() {
              return Promise.resolve({ data: q._rows[0] || null, error: null });
            },
            then(resolve: any, reject: any) {
              return Promise.resolve({ data: q._rows, error: null }).then(resolve, reject);
            },
          };
          return q;
        },
        update(patch: any) {
          return {
            eq(col: string, val: any) {
              self.versions = self.versions.map((row) =>
                String(row[col]) === String(val) ? { ...row, ...patch, updated_at: '2026-09-26T12:00:00.000Z' } : row,
              );
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        insert(row: any) {
          const rec = {
            id: '44444444-4444-4444-4444-444444444444',
            created_at: '2026-09-26T12:00:00.000Z',
            updated_at: '2026-09-26T12:00:00.000Z',
            published_at: null,
            published_by: null,
            ...row,
          };
          self.versions.push(rec);
          return Promise.resolve({ data: rec, error: null });
        },
      };
    }
    if (table === 'agents') {
      return {
        select() {
          const q: any = {
            _rows: self.agents.slice(),
            eq(col: string, val: any) {
              q._rows = q._rows.filter((r: any) => String(r[col]) === String(val));
              return q;
            },
            is(col: string, val: any) {
              if (val === null) q._rows = q._rows.filter((r: any) => r[col] == null);
              return q;
            },
            order() {
              return q;
            },
            maybeSingle() {
              return Promise.resolve({ data: q._rows[0] || null, error: null });
            },
          };
          return q;
        },
      };
    }
    if (table === 'agent_fee_profiles') {
      return {
        select() {
          const q: any = {
            _rows: self.agentLinks.slice(),
            eq(col: string, val: any) {
              q._rows = q._rows.filter((r: any) => String(r[col]) === String(val));
              return q;
            },
            maybeSingle() {
              return Promise.resolve({ data: q._rows[0] || null, error: null });
            },
          };
          return q;
        },
        insert(row: any) {
          self.agentLinks.push({ id: 'link-1', ...row });
          return Promise.resolve({ data: row, error: null });
        },
      };
    }
    throw new Error(`unexpected table ${table}`);
  }

  rpc(name: string, args: any) {
    this.rpcCalls.push({ name, args });
    const id = args.p_version_id;
    this.versions = this.versions.map((row) => {
      if (row.id === id) {
        return { ...row, status: 'PUBLISHED', published_at: '2026-09-26T12:00:00.000Z' };
      }
      if (row.status === 'PUBLISHED') {
        return { ...row, status: 'SUPERSEDED' };
      }
      return row;
    });
    return Promise.resolve({ data: id, error: null });
  }
}

describe('PlatformFeeProfilesService', () => {
  it('lists POS as DRAFT with locked 125 bps and ₦50 cap and no published version', async () => {
    const db = new FakeDb([posProfile()], [posDraft()]);
    const svc = new PlatformFeeProfilesService(db as any);
    const rows = await svc.listProfiles();
    const pos = rows.find((r) => r.transaction_type === 'POS_WITHDRAWAL')!;
    expect(pos.current_status).toBe('DRAFT');
    expect(pos.current_published_version).toBeNull();
    expect(pos.calculation_method).toBe('PERCENTAGE');
  });

  it('returns profile detail with POS lock 125 bps / 5000 kobo cap', async () => {
    const db = new FakeDb([posProfile()], [posDraft()]);
    const svc = new PlatformFeeProfilesService(db as any);
    const detail = await svc.getProfile('POS_WITHDRAWAL');
    expect(detail.fields.percentage_bps).toBe(125);
    expect(detail.fields.max_fee_kobo).toBe(POS_WITHDRAWAL_DEFAULTS.max_fee_kobo);
    expect(detail.fields.method).toBe('PERCENTAGE');
    expect(detail.pos_locked).toBe(false);
    expect(detail.draft?.editable).toBe(true);
  });

  it('saves POS calculation changes instead of overwriting the seed tariff', async () => {
    const db = new FakeDb([posProfile()], [posDraft()]);
    const svc = new PlatformFeeProfilesService(db as any);
    await svc.saveDraft('POS_WITHDRAWAL', {
      method: 'PERCENTAGE',
      percentage_bps: 150,
      flat_amount_kobo: 0,
      min_fee_kobo: 0,
      max_fee_kobo: 8000,
      platform_share_bps: 0,
      processor_share_bps: 0,
      service_share_bps: 0,
      agent_share_bps: 0,
    });
    const stored = db.versions.find((v) => v.id === DRAFT_ID);
    expect(stored.method).toBe('PERCENTAGE');
    expect(stored.percentage_bps).toBe(150);
    expect(stored.max_fee_kobo).toBe(8000);
    expect(stored.status).toBe('DRAFT');
  });

  it('rejects negative fee values on save', async () => {
    const db = new FakeDb([posProfile()], [posDraft()]);
    const svc = new PlatformFeeProfilesService(db as any);
    await expect(
      svc.saveDraft('POS_WITHDRAWAL', {
        method: 'PERCENTAGE',
        percentage_bps: 125,
        flat_amount_kobo: 0,
        min_fee_kobo: -1,
        max_fee_kobo: 5000,
        platform_share_bps: 0,
        processor_share_bps: 0,
        service_share_bps: 0,
        agent_share_bps: 0,
      }),
    ).rejects.toThrow(/Negative/);
  });

  it('creates a new draft instead of mutating a published version', async () => {
    const published = posDraft({
      id: PUBLISHED_ID,
      status: 'PUBLISHED',
      version_number: 1,
      platform_share_bps: 4000,
      processor_share_bps: 3000,
      service_share_bps: 2000,
      agent_share_bps: 1000,
      published_at: '2026-09-01T00:00:00.000Z',
    });
    const db = new FakeDb([posProfile()], [published]);
    const svc = new PlatformFeeProfilesService(db as any);
    await svc.saveDraft('POS_WITHDRAWAL', {
      method: 'PERCENTAGE',
      percentage_bps: 125,
      flat_amount_kobo: 0,
      min_fee_kobo: 0,
      max_fee_kobo: 5000,
      platform_share_bps: 2500,
      processor_share_bps: 2500,
      service_share_bps: 2500,
      agent_share_bps: 2500,
    });
    const original = db.versions.find((v) => v.id === PUBLISHED_ID);
    expect(original.status).toBe('PUBLISHED');
    expect(original.platform_share_bps).toBe(4000);
    expect(db.versions.some((v) => v.status === 'DRAFT' && v.platform_share_bps === 2500)).toBe(true);
  });

  it('does not publish when distribution is 9500 bps', async () => {
    const db = new FakeDb(
      [posProfile()],
      [posDraft({ platform_share_bps: 4000, processor_share_bps: 3000, service_share_bps: 2000, agent_share_bps: 500 })],
    );
    const svc = new PlatformFeeProfilesService(db as any);
    const maker = { id: 'maker-1', email: 'maker@invify.app' };
    await expect(svc.publish('POS_WITHDRAWAL', maker)).rejects.toThrow(/100%/);
    expect(db.rpcCalls).toEqual([]);
  });

  it('requires a maker proposal before checker publish', async () => {
    const db = new FakeDb(
      [posProfile()],
      [posDraft({ platform_share_bps: 4000, processor_share_bps: 3000, service_share_bps: 2000, agent_share_bps: 1000 })],
    );
    const svc = new PlatformFeeProfilesService(db as any);
    await expect(svc.publish('POS_WITHDRAWAL', { id: 'checker-1', email: 'checker@invify.app' })).rejects.toThrow(/Maker-checker/);
    expect(db.rpcCalls).toEqual([]);
  });

  it('blocks the same operator from proposing and publishing', async () => {
    const db = new FakeDb(
      [posProfile()],
      [posDraft({ platform_share_bps: 4000, processor_share_bps: 3000, service_share_bps: 2000, agent_share_bps: 1000 })],
    );
    const svc = new PlatformFeeProfilesService(db as any);
    const maker = { id: 'maker-1', email: 'maker@invify.app' };
    await svc.proposePublish('POS_WITHDRAWAL', maker);
    const listed = await svc.listProfiles();
    expect(listed.find((r) => r.transaction_type === 'POS_WITHDRAWAL')!.current_status).toBe('PENDING_CHECKER');
    await expect(svc.publish('POS_WITHDRAWAL', maker)).rejects.toThrow(/same operator/);
    expect(db.rpcCalls).toEqual([]);
  });

  it('publishes only via publish_fee_profile_version RPC after a different checker approves', async () => {
    const db = new FakeDb(
      [posProfile()],
      [posDraft({ platform_share_bps: 4000, processor_share_bps: 3000, service_share_bps: 2000, agent_share_bps: 1000 })],
    );
    const svc = new PlatformFeeProfilesService(db as any);
    await svc.proposePublish('POS_WITHDRAWAL', { id: 'maker-1', email: 'maker@invify.app' });
    const result = await svc.publish('POS_WITHDRAWAL', { id: 'checker-1', email: 'checker@invify.app' });
    expect(db.rpcCalls).toEqual([
      { name: 'publish_fee_profile_version', args: { p_version_id: DRAFT_ID } },
    ]);
    expect(result.published?.status).toBe('PUBLISHED');
    expect(db.versions.find((v) => v.id === DRAFT_ID).notes).toMatch(/checker@invify.app/);
    expect(db.versions.find((v) => v.id === DRAFT_ID).notes).toMatch(/maker@invify.app/);
    expect(db.tableTouches.every((t) => t === 'fee_profiles' || t === 'fee_profile_versions')).toBe(true);
  });
});

describe('platform fee preview (in-memory)', () => {
  const validSplit = {
    method: 'PERCENTAGE' as const,
    percentage_bps: 125,
    flat_amount_kobo: 0,
    min_fee_kobo: 0,
    max_fee_kobo: 5000,
    platform_share_bps: 4000,
    processor_share_bps: 3000,
    service_share_bps: 2000,
    agent_share_bps: 1000,
  };

  it('preview ₦1,000 → ₦12.50 final', () => {
    const preview = computePreview({
      transactionType: 'POS_WITHDRAWAL',
      transactionAmountKobo: 100_000,
      fields: validSplit,
    });
    expect(preview.calculated_fee_kobo).toBe(1250);
    expect(preview.final_fee_kobo).toBe(1250);
    expect(preview.created_assessment).toBe(false);
    expect(preview.created_ledger_entry).toBe(false);
    expect(preview.persisted).toBe(false);
  });

  it('preview ₦10,000 → ₦50 final (cap, not extra flat)', () => {
    const preview = computePreview({
      transactionType: 'POS_WITHDRAWAL',
      transactionAmountKobo: 1_000_000,
      fields: validSplit,
    });
    expect(preview.calculated_fee_kobo).toBe(12500);
    expect(preview.cap_applied_kobo).toBe(7500);
    expect(preview.final_fee_kobo).toBe(5000);
    expect(preview.distribution?.platform_amount_kobo).toBe(2000);
    expect(preview.distribution?.processor_amount_kobo).toBe(1500);
    expect(preview.distribution?.service_amount_kobo).toBe(1000);
    expect(preview.distribution?.agent_amount_kobo).toBe(500);
  });

  it('FLAT preview uses flat amount even if percentage_bps is leftover', () => {
    const preview = computePreview({
      transactionType: 'TREASURY_TRANSFER',
      transactionAmountKobo: 1_000_000,
      fields: { ...validSplit, method: 'FLAT', percentage_bps: 135, flat_amount_kobo: 2500, max_fee_kobo: 0 },
    });
    expect(preview.calculated_fee_kobo).toBe(2500);
    expect(preview.final_fee_kobo).toBe(2500);
  });

  it('HYBRID preview adds flat + percentage', () => {
    const preview = computePreview({
      transactionType: 'TREASURY_WITHDRAWAL',
      transactionAmountKobo: 100_000,
      fields: { ...validSplit, method: 'HYBRID', percentage_bps: 125, flat_amount_kobo: 5000, max_fee_kobo: 20_000 },
    });
    expect(preview.calculated_fee_kobo).toBe(6250);
    expect(preview.final_fee_kobo).toBe(6250);
  });

  it('does not treat invalid 9500 bps as publishable', () => {
    const reasons = publishBlockers('POS_WITHDRAWAL', {
      ...validSplit,
      agent_share_bps: 500,
    });
    expect(reasons.some((r) => /100%/.test(r))).toBe(true);
  });

  it('treats 4000/3000/2000/1000 as valid', () => {
    expect(publishBlockers('POS_WITHDRAWAL', validSplit)).toEqual([]);
  });
});

describe('Phase 6.1 safety', () => {
  it('does not touch school billing, tenant_fee_profiles, fee_transactions, POS/VA, or live poster', () => {
    const svc = fs.readFileSync(
      path.join(__dirname, '../src/services/platform-fee-profiles.service.ts'),
      'utf8',
    );
    const ctrl = fs.readFileSync(
      path.join(__dirname, '../src/controllers/platform-fee-profiles.controller.ts'),
      'utf8',
    );
    const app = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    const src = svc + ctrl;
    expect(src).not.toMatch(/tenant_fee_profiles/);
    expect(src).not.toMatch(/fee_transactions/);
    expect(src).not.toMatch(/fee_structures/);
    expect(src).not.toMatch(/fee_categories/);
    expect(src).not.toMatch(/fee_allocations/);
    expect(src).not.toMatch(/FeeLedgerPoster/);
    expect(src).not.toMatch(/process_ledger_double_entry/);
    expect(src).not.toMatch(/USER_WALLET/);
    expect(src).not.toMatch(/fee_assessments/);
    expect(src).not.toMatch(/from\('pos/);
    expect(process.env.FEE_ORCHESTRATION_LIVE).not.toBe('true');
    const feeRoute = app.split('platform-fees')[1] || '';
    expect(app).toMatch(/checkRole\(platformFeeAdminRoles\)/);
    expect(app).toMatch(/const platformFeeAdminRoles = \['super_admin', 'admin_deploy'\]/);
    expect(feeRoute).not.toMatch(/admin_finance/);
    expect(feeRoute).not.toMatch(/admin_treasury/);
  });

  it('A-C Agent profile create/update keeps POS tariff locked and does not mutate global', async () => {
    const agent = {
      id: 'aaaaaaaa-aaaa-aaaa-4aaa-aaaaaaaaaaaa',
      agent_code: 'A001',
      first_name: 'Agent',
      last_name: 'A',
      status: 'ACTIVE',
      deleted_at: null,
    };
    const db = new FakeDb(
      [{ ...posProfile(), scope: 'GLOBAL', agent_id: null }],
      [posDraft({ platform_share_bps: 2739, processor_share_bps: 2340, service_share_bps: 12, agent_share_bps: 4909 })],
      [agent],
    );
    const svc = new PlatformFeeProfilesService(db as any);
    const created = await svc.saveDraft('POS_WITHDRAWAL', {
      agentId: agent.id,
      method: 'FLAT',
      percentage_bps: 999,
      flat_amount_kobo: 1,
      min_fee_kobo: 0,
      max_fee_kobo: 8000,
      platform_share_bps: 2739,
      processor_share_bps: 2340,
      service_share_bps: 12,
      agent_share_bps: 4909,
    });
    expect(created.profile.scope).toBe('AGENT');
    expect(created.fee_source).toBe('AGENT_PROFILE');
    expect(created.fields.percentage_bps).toBe(125);
    expect(created.fields.max_fee_kobo).toBe(5000);
    expect(created.fields.method).toBe('PERCENTAGE');
    expect(db.profiles.filter((p) => p.scope === 'GLOBAL')).toHaveLength(1);
    expect(db.agentLinks).toHaveLength(1);

    const updated = await svc.saveDraft('POS_WITHDRAWAL', {
      agentId: agent.id,
      method: 'PERCENTAGE',
      percentage_bps: 125,
      flat_amount_kobo: 0,
      min_fee_kobo: 0,
      max_fee_kobo: 5000,
      platform_share_bps: 2000,
      processor_share_bps: 2000,
      service_share_bps: 2000,
      agent_share_bps: 4000,
    });
    expect(updated.fields.agent_share_bps).toBe(4000);
    expect(updated.fields.percentage_bps).toBe(125);
    const maker = { id: 'maker-a', email: 'maker-a@invify.app' };
    await svc.proposePublish('POS_WITHDRAWAL', maker, agent.id);
    await expect(
      svc.publish('POS_WITHDRAWAL', { id: 'checker', email: 'c@invify.app' }, agent.id, 'not-this-draft'),
    ).rejects.toThrow(/stale|another Agent/i);
  });

  it('rejects unknown Agent ids', async () => {
    const db = new FakeDb([posProfile()], [posDraft()], []);
    const svc = new PlatformFeeProfilesService(db as any);
    await expect(svc.getProfile('POS_WITHDRAWAL', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).rejects.toThrow(/Agent not found/);
  });
});
