// src/controllers/school-sync.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { AuditService } from '../services/audit.service';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import crypto from 'crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Deterministic UUID so local-1 / local-2 re-sync stably into UUID PKs. */
function toStableUuid(tenantId: string, entityType: string, raw: string): string {
  const key = String(raw || '').trim();
  if (UUID_RE.test(key)) return key.toLowerCase();
  const hash = crypto
    .createHash('sha1')
    .update(`invify-school:${tenantId}:${entityType}:${key || crypto.randomUUID()}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** execute_sql wraps input as a subquery — close early, run DDL, comment trailer. */
function ddlInject(sql: string): string {
  return `select 1) t; ${sql}; SELECT json_build_object('ok', true) as val --`;
}

/**
 * School-mode Web Sync: push local SQLite academic entities to Supabase
 * so invify-admin tenant pages can show students / academics / roster.
 */
export class SchoolSyncController {
  /**
   * POST /api/school/bulk-sync
   * Body: { years, terms, classes, teachers, subjects, students, results }
   */
  static async bulkSync(req: Request, res: Response) {
    try {
      const tenantId =
        (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      const {
        years = [],
        terms = [],
        classes = [],
        teachers = [],
        subjects = [],
        students = [],
        parents = [],
        parentVirtualAccounts = [],
        parentPayments = [],
        parentPaymentAllocations = [],
        results = [],
      } = req.body || {};

      await SchoolSyncController.ensureSchoolRow(tenantId);
      const tableReady = await SchoolSyncController.ensureEntitiesTable();
      if (!tableReady) {
        return res.status(500).json({
          error:
            'school_entities table is missing. Restart backend after applying school_entities migration, or ensure execute_sql / DATABASE_URL DDL works.',
        });
      }

      const summary: Record<string, { synced: number; errors: string[] }> = {};

      summary.years = await SchoolSyncController.upsertEntities(
        tenantId,
        'academic_year',
        years,
      );
      summary.terms = await SchoolSyncController.upsertEntities(
        tenantId,
        'term',
        terms,
      );
      summary.classes = await SchoolSyncController.upsertEntities(
        tenantId,
        'class',
        classes,
      );
      summary.teachers = await SchoolSyncController.upsertEntities(
        tenantId,
        'teacher',
        teachers,
      );
      summary.subjects = await SchoolSyncController.upsertEntities(
        tenantId,
        'subject',
        subjects,
      );
      summary.results = await SchoolSyncController.upsertEntities(
        tenantId,
        'result',
        results,
      );
      summary.students = await SchoolSyncController.upsertStudents(
        tenantId,
        students,
        classes,
      );
      summary.parents = await SchoolSyncController.upsertEntities(
        tenantId,
        'parent',
        parents,
      );
      summary.parentVirtualAccounts = await SchoolSyncController.upsertEntities(
        tenantId,
        'parent_virtual_account',
        parentVirtualAccounts,
      );
      summary.parentPayments = await SchoolSyncController.upsertEntities(
        tenantId,
        'parent_payment',
        parentPayments,
      );
      summary.parentPaymentAllocations = await SchoolSyncController.upsertEntities(
        tenantId,
        'parent_payment_allocation',
        parentPaymentAllocations,
      );
      await SchoolSyncController.upsertParentCustomers(
        tenantId,
        parents,
        parentVirtualAccounts,
      );

      const totalSynced = Object.values(summary).reduce(
        (n, s) => n + s.synced,
        0,
      );
      const allErrors = Object.values(summary).flatMap((s) => s.errors);

      await AuditService.log({
        eventType: 'school.bulk_sync' as any,
        reference: `SCHOOL-SYNC-${tenantId}-${Date.now()}`,
        tenantId,
        payload: { totalSynced, errors: allErrors.length, summary },
      });

      return res.status(200).json({
        success: allErrors.length === 0,
        synced: totalSynced,
        summary,
        errors: allErrors,
      });
    } catch (error: any) {
      console.error('[SchoolSyncController] bulkSync Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/school/roster
   * Returns synced school entities + students for the tenant.
   */
  static async getRoster(req: Request, res: Response) {
    try {
      const tenantId = resolveTenantScope(req);

      if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
      }

      await SchoolSyncController.ensureEntitiesTable();

      const entityType = (req.query.type as string) || undefined;

      let entitiesQuery = supabaseAdmin
        .from('school_entities')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (entityType) {
        entitiesQuery = entitiesQuery.eq('entity_type', entityType);
      }

      const [{ data: entities, error: entErr }, { data: students, error: stuErr }] =
        await Promise.all([
          entitiesQuery.limit(2000),
          supabaseAdmin
            .from('students')
            .select('*')
            .or(`tenant_id.eq.${tenantId},school_id.eq.${tenantId}`)
            .limit(2000),
        ]);

      if (entErr && !String(entErr.message).includes('does not exist')) {
        console.warn('[SchoolSync] entities read:', entErr.message);
      }
      if (stuErr) {
        console.warn('[SchoolSync] students read:', stuErr.message);
      }

      const byType = (type: string): any[] =>
        (entities || [])
          .filter((e: any) => e.entity_type === type)
          .map((e: any) => {
            const payload = (e.payload as Record<string, any>) || {};
            return {
              ...payload,
              localId: payload.id,
              id: e.sync_id,
              syncId: e.sync_id,
            };
          });

      // Prefer students table; enrich from school_entities payloads so web
      // keeps middle names, parents, and other device-only fields.
      const entityStudents = byType('student');
      let studentRows = students || [];
      if (!studentRows.length) {
        studentRows = entityStudents.map((p: any) => ({
          id: p.id || p.syncId,
          first_name: p.firstName || p.first_name,
          middle_name: p.middleName || p.middle_name,
          last_name: p.lastName || p.last_name,
          admission_number: p.admissionNumber || p.admission_number,
          current_class: p.className || p.current_class,
          running_balance: p.balance ?? p.running_balance ?? 0,
          ...p,
        }));
      } else {
        const byAdmission = new Map<string, any>();
        const byId = new Map<string, any>();
        for (const p of entityStudents) {
          const adm = String(p.admissionNumber || p.admission_number || '').trim().toLowerCase();
          if (adm) byAdmission.set(adm, p);
          if (p.syncId) byId.set(String(p.syncId), p);
          if (p.id) byId.set(String(p.id), p);
        }
        studentRows = studentRows.map((row: any) => {
          const adm = String(row.admission_number || '').trim().toLowerCase();
          const extra = byAdmission.get(adm) || byId.get(String(row.id)) || {};
          return {
            ...extra,
            ...row,
            localId: extra.localId ?? extra.id,
            middle_name: row.middle_name || extra.middleName || extra.middle_name || null,
            first_name: row.first_name || extra.firstName,
            last_name: row.last_name || extra.lastName,
            parent_name: row.parent_name || extra.parentName || extra.parent_name,
            parent_phone: row.parent_phone || extra.parentPhone || extra.parent_phone,
            gender: row.gender || extra.gender,
            department: row.department || extra.department,
            className: row.current_class || extra.className,
            academicYearName: extra.academicYearName || row.academicYearName,
            classId: row.classId || extra.classId,
            parentSyncId: extra.parentSyncId || extra.parentId || row.parentSyncId || null,
            parentId: extra.parentId || row.parentId || extra.parentSyncId || null,
          };
        });
      }

      // Collapse twin rows created by older syncs (same admission / name+class).
      studentRows = SchoolSyncController.dedupeStudents(studentRows);

      return res.status(200).json({
        tenantId,
        students: studentRows,
        years: byType('academic_year'),
        terms: byType('term'),
        classes: byType('class'),
        teachers: byType('teacher'),
        subjects: byType('subject'),
        results: byType('result'),
        parents: byType('parent'),
        parentVirtualAccounts: byType('parent_virtual_account'),
        parentPayments: byType('parent_payment'),
        parentPaymentAllocations: byType('parent_payment_allocation'),
      });
    } catch (error: any) {
      console.error('[SchoolSyncController] getRoster Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  /** Keep one row per admission number (or name+class). Prefer richer / newer rows. */
  private static dedupeStudents(rows: any[]): any[] {
    const groups = new Map<string, any>();
    for (const raw of rows || []) {
      const adm = String(raw.admission_number || raw.admissionNumber || '')
        .trim()
        .toLowerCase();
      const name = `${raw.first_name || raw.firstName || ''} ${raw.last_name || raw.lastName || ''}`
        .trim()
        .toLowerCase();
      const cls = String(raw.current_class || raw.className || '')
        .trim()
        .toLowerCase();
      const key = adm ? `adm:${adm}` : `name:${name}|${cls}`;
      const prev = groups.get(key);
      if (!prev) {
        groups.set(key, raw);
        continue;
      }
      const prevScore =
        (Number(prev.running_balance ?? prev.balance) !== 0 ? 2 : 0) +
        (prev.virtual_account_number || prev.virtualAccountNumber ? 1 : 0) +
        (prev.created_at ? 0.5 : 0);
      const nextScore =
        (Number(raw.running_balance ?? raw.balance) !== 0 ? 2 : 0) +
        (raw.virtual_account_number || raw.virtualAccountNumber ? 1 : 0) +
        (raw.created_at ? 0.5 : 0);
      if (nextScore >= prevScore) groups.set(key, raw);
    }
    return Array.from(groups.values());
  }

  private static async ensureSchoolRow(tenantId: string) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .maybeSingle();

    await supabaseAdmin.from('schools').upsert(
      {
        id: tenantId,
        name: tenant?.name || 'School',
      },
      { onConflict: 'id' },
    );
  }

  /** Returns true when school_entities is queryable. */
  private static async ensureEntitiesTable(): Promise<boolean> {
    const probe = await supabaseAdmin.from('school_entities').select('id').limit(1);
    if (!probe.error) return true;

    const createSql = `
      CREATE TABLE IF NOT EXISTS public.school_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        entity_type TEXT NOT NULL,
        sync_id TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, entity_type, sync_id)
      );
      CREATE INDEX IF NOT EXISTS idx_school_entities_tenant_type
        ON public.school_entities (tenant_id, entity_type);
      NOTIFY pgrst, 'reload schema'
    `;

    // 1) Preferred: direct Postgres
    try {
      const { dbQuery } = await import('../db/pg');
      if (process.env.DATABASE_URL) {
        await dbQuery(createSql);
        console.log('[SchoolSync] school_entities created via DATABASE_URL');
      }
    } catch (e: any) {
      console.warn('[SchoolSync] pg create failed:', e?.message || e);
    }

    // 2) Fallback: execute_sql DDL injection (staging pattern)
    try {
      const { error } = await supabaseAdmin.rpc('execute_sql', {
        sql_query: ddlInject(createSql.replace(/\n/g, ' ')),
      });
      if (error) {
        console.warn('[SchoolSync] execute_sql DDL:', error.message);
      } else {
        console.log('[SchoolSync] school_entities DDL via execute_sql OK');
      }
    } catch (e: any) {
      console.warn('[SchoolSync] execute_sql unavailable:', e?.message || e);
    }

    // Brief wait for PostgREST schema cache
    await new Promise((r) => setTimeout(r, 400));
    const again = await supabaseAdmin.from('school_entities').select('id').limit(1);
    if (again.error) {
      console.error('[SchoolSync] school_entities still missing:', again.error.message);
      return false;
    }
    return true;
  }

  private static async upsertEntities(
    tenantId: string,
    entityType: string,
    items: any[],
  ): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    if (!Array.isArray(items) || items.length === 0) {
      return { synced: 0, errors: [] };
    }

    const rows = items.map((item) => {
      const raw = String(item.syncId || item.sync_id || item.id || '').trim();
      const syncId = toStableUuid(tenantId, entityType, raw || crypto.randomUUID());
      return {
        tenant_id: tenantId,
        entity_type: entityType,
        sync_id: syncId,
        payload: { ...item, localKey: raw, syncId },
        updated_at: new Date().toISOString(),
      };
    });

    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { data, error } = await supabaseAdmin
        .from('school_entities')
        .upsert(batch, { onConflict: 'tenant_id,entity_type,sync_id' })
        .select('id');

      if (error) {
        errors.push(`${entityType} batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        synced += (data || []).length || batch.length;
      }
    }

    return { synced, errors };
  }

  private static async upsertStudents(
    tenantId: string,
    students: any[],
    classes: any[],
  ): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;
    if (!Array.isArray(students) || students.length === 0) {
      return { synced: 0, errors: [] };
    }

    const classNameByLocalId = new Map<string, string>();
    for (const c of classes || []) {
      const key = String(c.id ?? c.localId ?? '');
      if (key) classNameByLocalId.set(key, String(c.name || ''));
    }

    const studentRows: any[] = [];
    const customerRows: any[] = [];
    const entityPayloads: any[] = [];

    for (const s of students) {
      const raw = String(s.syncId || s.sync_id || '').trim();
      const first =
        String(s.firstName || s.first_name || '').trim() ||
        String(s.name || 'Student').split(/\s+/)[0];
      const middle = String(s.middleName || s.middle_name || '').trim();
      const last =
        String(s.lastName || s.last_name || '').trim() ||
        String(s.name || '')
          .split(/\s+/)
          .slice(1)
          .join(' ') ||
        'Learner';
      const admission = String(
        s.admissionNumber || s.admission_number || '',
      ).trim();
      // Prefer the device UUID so tablet and web share the same student id.
      // Fall back to admission so older payloads without syncId stay stable.
      const identityKey = UUID_RE.test(raw)
        ? raw
        : admission
          ? `admission:${admission}`
          : String(s.id || '').trim() || crypto.randomUUID();
      const syncId = toStableUuid(tenantId, 'student', identityKey);
      const admissionFinal = admission || `ADM-${syncId.slice(0, 8)}`;
      const className =
        String(s.className || s.current_class || '').trim() ||
        classNameByLocalId.get(String(s.classId ?? '')) ||
        null;
      const balance = Number(s.balance ?? s.running_balance ?? 0) || 0;

      studentRows.push({
        id: syncId,
        school_id: tenantId,
        tenant_id: tenantId,
        first_name: first,
        middle_name: middle || null,
        last_name: last,
        admission_number: admissionFinal,
        current_class: className,
        running_balance: balance,
        parent_name: s.parentName || s.parent_name || null,
        parent_phone: s.parentPhone || s.parent_phone || null,
        gender: s.gender || null,
        department: s.department || null,
        date_of_birth: s.dateOfBirth || s.date_of_birth || null,
        virtual_account_number: s.virtualAccountNumber || s.virtual_account_number || null,
        virtual_account_bank: s.virtualAccountBank || s.virtual_account_bank || null,
        virtual_account_status: s.virtualAccountStatus || s.virtual_account_status || null,
      });

      customerRows.push({
        id: syncId,
        tenant_id: tenantId,
        name: [first, middle, last].filter(Boolean).join(' ').trim(),
        phone: s.parentPhone || s.parent_phone || s.phone || null,
        email: s.email || null,
        address: s.address || null,
        balance,
        // Linked children share the parent VA. Do not keep a child-owned customer VA.
        virtual_account_number: (s.parentSyncId || s.parentId)
          ? null
          : (s.virtualAccountNumber || s.virtual_account_number || null),
        virtual_account_bank: (s.parentSyncId || s.parentId)
          ? null
          : (s.virtualAccountBank || s.virtual_account_bank || null),
        virtual_account_name: `${first} ${last}`.trim(),
        updated_at: new Date().toISOString(),
        created_at: s.createdAt || s.created_at || new Date().toISOString(),
      });

      entityPayloads.push({ ...s, syncId, localKey: raw, admissionNumber: admissionFinal });
    }

    for (let i = 0; i < studentRows.length; i += 50) {
      const batch = studentRows.slice(i, i + 50);
      const { error } = await supabaseAdmin
        .from('students')
        .upsert(batch, { onConflict: 'id' });
      if (error) {
        const slim = batch.map(({
          school_id,
          middle_name,
          parent_name,
          parent_phone,
          gender,
          department,
          date_of_birth,
          ...rest
        }) => rest);
        const retry = await supabaseAdmin.from('students').upsert(slim, { onConflict: 'id' });
        if (retry.error) {
          errors.push(`students batch ${Math.floor(i / 50) + 1}: ${error.message}`);
        } else {
          synced += batch.length;
        }
      } else {
        synced += batch.length;
      }
    }

    for (let i = 0; i < customerRows.length; i += 50) {
      const batch = customerRows.slice(i, i + 50);
      const { error } = await supabaseAdmin
        .from('customers')
        .upsert(batch, { onConflict: 'id' });
      if (error) {
        errors.push(`student→customers batch ${Math.floor(i / 50) + 1}: ${error.message}`);
      }
    }

    await SchoolSyncController.upsertEntities(tenantId, 'student', entityPayloads);

    return { synced, errors };
  }

  /** Mirror parent VAs (canonical + legacy) as customers so webhooks prefer par-* ids. */
  private static async upsertParentCustomers(
    tenantId: string,
    parents: any[],
    vas: any[],
  ) {
    if (!Array.isArray(parents) || parents.length === 0) return;
    const parentByLocalId = new Map<string, any>();
    for (const p of parents) {
      parentByLocalId.set(String(p.id ?? ''), p);
    }
    const rows: any[] = [];
    const pushVa = (parent: any, accountNumber: string, bank?: string, kind = 'canonical') => {
      const number = String(accountNumber || '').trim();
      if (!number) return;
      const rawSync = String(parent.syncId || parent.sync_id || parent.id || '').trim();
      const parentKey = rawSync.startsWith('par-') ? rawSync : `par-${rawSync || number}`;
      const id =
        kind === 'canonical' ? parentKey : `${parentKey}-legacy-${number}`;
      rows.push({
        id,
        tenant_id: tenantId,
        name: parent.fullName || parent.name || 'Parent',
        phone: parent.phone || null,
        email: parent.email || null,
        virtual_account_number: number,
        virtual_account_bank: bank || parent.virtualAccountBank || null,
        virtual_account_name: parent.virtualAccountName || parent.fullName || 'Parent',
        updated_at: new Date().toISOString(),
      });
    };
    for (const p of parents) {
      if (p.virtualAccountNumber) {
        pushVa(p, p.virtualAccountNumber, p.virtualAccountBank, 'canonical');
      }
    }
    for (const v of vas || []) {
      const parent = parentByLocalId.get(String(v.parentId ?? ''));
      if (!parent) continue;
      const canonical = v.isCanonical === true || v.kind === 'canonical';
      pushVa(parent, v.accountNumber, v.bankName, canonical ? 'canonical' : 'legacy');
    }
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabaseAdmin.from('customers').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.warn('[SchoolSync] parent customers:', error.message);
      }
    }
  }
}
