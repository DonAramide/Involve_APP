import { TenantInstitutePortService, samePortActor, normalizePortTargetId, instituteRefsEqual } from '../src/services/tenant-institute-port.service';
import { INVIFY_DEFAULT_AGENT_CODE } from '../src/utils/agent-code';

function ok(data: any) {
  return { data, error: null };
}

function createMemDb() {
  const tenants = new Map<string, any>([
    ['t1', { id: 't1', name: 'Alpha School', agent_code: null, settings: {} }],
  ]);
  const agents = [
    { id: 'a-default', agent_code: INVIFY_DEFAULT_AGENT_CODE, first_name: 'Invify', last_name: 'Default', email: 'ops@invify.org', status: 'ACTIVE', deleted_at: null },
    { id: 'a-lagos', agent_code: 'LAG001', first_name: 'Lagos', last_name: 'Institute', email: 'lagos@invify.org', status: 'ACTIVE', deleted_at: null },
    { id: 'a-abuja', agent_code: 'ABJ002', first_name: 'Abuja', last_name: 'Institute', email: 'abuja@invify.org', status: 'ACTIVE', deleted_at: null },
    { id: 'a-dead', agent_code: 'DEAD1', first_name: 'Suspended', last_name: 'Inst', email: 'x@y.z', status: 'SUSPENDED', deleted_at: null },
  ];
  const links: any[] = [];
  let tenantUpdates: any[] = [];
  let linkUpdates: any[] = [];
  let linkInserts: any[] = [];

  const from = (table: string) => {
    const state: any = { table, filters: {} as Record<string, any>, inIds: null as string[] | null, op: 'select', patch: null, insertRow: null };

    const run = async () => {
      if (table === 'tenants') {
        if (state.op === 'update') {
          const row = tenants.get(state.filters.id);
          if (row) Object.assign(row, state.patch);
          tenantUpdates.push(state.patch);
          return ok(row);
        }
        if (state.inIds) return ok([...tenants.values()].filter((row) => state.inIds.includes(row.id)));
        if (state.filters.id) return ok(tenants.get(state.filters.id) || null);
        return ok([...tenants.values()]);
      }
      if (table === 'agents') {
        let rows = agents.filter((row) => !row.deleted_at);
        if (state.filters.id) rows = rows.filter((row) => row.id === state.filters.id);
        if (state.filters.agent_code) rows = rows.filter((row) => row.agent_code === state.filters.agent_code);
        if (state.single) return ok(rows[0] || null);
        return ok(rows);
      }
      if (table === 'agent_tenants') {
        if (state.op === 'insert') {
          const row = { id: `l-${linkInserts.length + 1}`, deleted_at: null, ...state.insertRow };
          links.push(row);
          linkInserts.push(row);
          return ok(row);
        }
        if (state.op === 'update') {
          const row = links.find((item) => item.id === state.filters.id);
          if (row) Object.assign(row, state.patch);
          linkUpdates.push(state.patch);
          return ok(row);
        }
        let rows = links.slice();
        if (state.filters.tenant_id) rows = rows.filter((row) => row.tenant_id === state.filters.tenant_id);
        if (state.inIds) rows = rows.filter((row) => state.inIds.includes(row.tenant_id));
        return ok(rows);
      }
      return ok(null);
    };

    const api: any = {
      select: () => api,
      eq: (col: string, value: string) => {
        state.filters[col] = value;
        return api;
      },
      is: () => api,
      in: (_col: string, ids: string[]) => {
        state.inIds = ids;
        return api;
      },
      order: () => api,
      update: (patch: any) => {
        state.op = 'update';
        state.patch = patch;
        return api;
      },
      insert: (row: any) => {
        state.op = 'insert';
        state.insertRow = row;
        return run();
      },
      maybeSingle: async () => {
        state.single = true;
        return run();
      },
      then: (resolve: any, reject: any) => run().then(resolve, reject),
    };
    return api;
  };

  const rpc = async (name: string, args: any) => {
    if (name === 'set_tenant_institute_agent_code') {
      const row = tenants.get(String(args.p_tenant_id));
      if (row) row.agent_code = args.p_agent_code || null;
      return ok(null);
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  };

  return { from, rpc, tenants, links, tenantUpdates, linkUpdates, linkInserts };
}

describe('tenant institute port', () => {
  test('treats empty / default / AAA000 as platform default target', () => {
    expect(normalizePortTargetId('')).toBe('default');
    expect(normalizePortTargetId('AAA000')).toBe('default');
    expect(normalizePortTargetId('default')).toBe('default');
  });

  test('maker and checker identity matches on email or id', () => {
    expect(samePortActor({ makerId: '1', makerEmail: 'a@x.com' }, { id: '9', email: 'A@x.com' })).toBe(true);
    expect(samePortActor({ makerId: '1', makerEmail: 'a@x.com' }, { id: '1', email: 'other@x.com' })).toBe(true);
    expect(samePortActor({ makerId: '1', makerEmail: 'a@x.com' }, { id: '2', email: 'b@x.com' })).toBe(false);
  });

  test('default institutes compare equal even when only one has an id', () => {
    expect(instituteRefsEqual(
      { id: null, agent_code: null, name: 'Unassigned', isDefault: true },
      { id: 'a-default', agent_code: 'AAA000', name: 'Invify', isDefault: true },
    )).toBe(true);
  });

  test('propose then checker approve writes agent_tenants and tenants.agent_code', async () => {
    const db = createMemDb();
    const service = new TenantInstitutePortService(db);

    await expect(service.propose({
      tenantId: 't1',
      actorId: 'maker-1',
      actorEmail: 'maker@invify.org',
      toAgentId: 'a-lagos',
    })).resolves.toMatchObject({
      proposal: { status: 'pending', makerEmail: 'maker@invify.org' },
    });

    await expect(service.approve({
      tenantId: 't1',
      actorId: 'maker-1',
      actorEmail: 'maker@invify.org',
    })).rejects.toThrow(/Maker cannot approve/);

    const approved = await service.approve({
      tenantId: 't1',
      actorId: 'checker-9',
      actorEmail: 'checker@invify.org',
    });

    expect(approved.current.agent_code).toBe('LAG001');
    expect(approved.current.id).toBe('a-lagos');
    expect(approved.proposal?.status).toBe('approved');
    expect(db.tenants.get('t1').agent_code).toBe('LAG001');
    expect(db.links[0].agent_id).toBe('a-lagos');
    expect(db.links[0].deleted_at).toBeNull();
  });

  test('port from one Institute to another updates the existing agent_tenants row', async () => {
    const db = createMemDb();
    db.links.push({ id: 'l-existing', tenant_id: 't1', agent_id: 'a-lagos', deleted_at: null, business_name: 'Alpha School' });
    db.tenants.get('t1').agent_code = 'LAG001';
    const service = new TenantInstitutePortService(db);

    await service.propose({
      tenantId: 't1',
      actorId: 'm',
      actorEmail: 'm@invify.org',
      toAgentId: 'a-abuja',
    });
    const snap = await service.approve({
      tenantId: 't1',
      actorId: 'c',
      actorEmail: 'c@invify.org',
    });

    expect(snap.current.agent_code).toBe('ABJ002');
    expect(db.links).toHaveLength(1);
    expect(db.links[0].agent_id).toBe('a-abuja');
  });

  test('rejects a second pending proposal and a same-Institute no-op', async () => {
    const db = createMemDb();
    const service = new TenantInstitutePortService(db);
    await service.propose({ tenantId: 't1', actorId: 'm', actorEmail: 'm@invify.org', toAgentId: 'a-lagos' });
    await expect(service.propose({
      tenantId: 't1',
      actorId: 'm',
      actorEmail: 'm@invify.org',
      toAgentId: 'a-abuja',
    })).rejects.toThrow(/already exists/);

    const db2 = createMemDb();
    db2.tenants.get('t1').agent_code = INVIFY_DEFAULT_AGENT_CODE;
    const service2 = new TenantInstitutePortService(db2);
    await expect(service2.propose({
      tenantId: 't1',
      actorId: 'm',
      actorEmail: 'm@invify.org',
      toAgentId: 'default',
    })).rejects.toThrow(/already assigned/);
  });

  test('checker can reject without changing ownership', async () => {
    const db = createMemDb();
    const service = new TenantInstitutePortService(db);
    await service.propose({ tenantId: 't1', actorId: 'm', actorEmail: 'm@invify.org', toAgentId: 'a-lagos' });
    const snap = await service.reject({ tenantId: 't1', actorId: 'c', actorEmail: 'c@invify.org', reason: 'wrong institute' });
    expect(snap.proposal?.status).toBe('rejected');
    expect(db.links).toHaveLength(0);
    expect(db.tenants.get('t1').agent_code).toBeNull();
  });

  test('cannot port onto a suspended Institute', async () => {
    const db = createMemDb();
    const service = new TenantInstitutePortService(db);
    await expect(service.propose({
      tenantId: 't1',
      actorId: 'm',
      actorEmail: 'm@invify.org',
      toAgentId: 'a-dead',
    })).rejects.toThrow(/not active/);
  });
});
