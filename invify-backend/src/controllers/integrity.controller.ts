// src/controllers/integrity.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import {
  computeStudentBalanceMismatches,
  studentBelongsToTenant,
} from '../utils/student-balance-integrity';

export class IntegrityController {
  /**
   * GET /api/finance/integrity/student-balances
   * Validates running_balance cache against raw ledger sums for the
   * authenticated tenant only. The historical 0-arg RPC
   * `validate_student_balances()` is unscoped and must not be called.
   */
  static async validateStudentBalances(req: Request, res: Response) {
    let tenantId: string;
    try {
      tenantId = resolveAuthoritativeTenantId(req);
    } catch (err: any) {
      return res.status(err?.status || 403).json({ error: err?.message || 'Tenant ID required' });
    }

    try {
      const [{ data: bySchool, error: schoolErr }, { data: byTenant, error: tenantErr }] =
        await Promise.all([
          supabaseAdmin
            .from('students')
            .select('id, running_balance, school_id, tenant_id')
            .eq('school_id', tenantId),
          supabaseAdmin
            .from('students')
            .select('id, running_balance, school_id, tenant_id')
            .eq('tenant_id', tenantId),
        ]);
      if (schoolErr) throw schoolErr;
      if (tenantErr) throw tenantErr;

      const studentsById = new Map<string, any>();
      for (const row of [...(bySchool || []), ...(byTenant || [])]) {
        studentsById.set(String(row.id), row);
      }
      const students = Array.from(studentsById.values());

      const [{ data: ledgerBySchool }, { data: ledgerByTenant }] = await Promise.all([
        supabaseAdmin
          .from('ledgers')
          .select('student_id, amount, school_id, tenant_id')
          .eq('school_id', tenantId),
        supabaseAdmin
          .from('ledgers')
          .select('student_id, amount, school_id, tenant_id')
          .eq('tenant_id', tenantId),
      ]);

      const ledgerRows = [...(ledgerBySchool || []), ...(ledgerByTenant || [])];
      const mismatches = computeStudentBalanceMismatches(students, ledgerRows, tenantId);

      if (mismatches.length > 0) {
        console.error(`[Integrity Error] Found ${mismatches.length} student balance mismatches!`);
        return res.status(400).json({
          status: 'CORRUPTED',
          message: 'Integrity mismatch detected between running_balance and ledger sums.',
          mismatches,
        });
      }

      return res.status(200).json({
        status: 'VALID',
        message: 'All student running balances are in sync with the ledger.',
        count: 0,
      });
    } catch (error: any) {
      console.error('[IntegrityController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to perform integrity check' });
    }
  }

  /**
   * POST /api/finance/integrity/recompute
   * Forced recomputation of running_balances from raw ledgers for this tenant.
   */
  static async recomputeBalances(req: Request, res: Response) {
    let tenantId: string;
    try {
      tenantId = resolveAuthoritativeTenantId(req);
    } catch (err: any) {
      return res.status(err?.status || 403).json({ error: err?.message || 'Tenant ID required' });
    }

    try {
      const [{ data: ledgerBySchool, error: ledgerSchoolErr }, { data: ledgerByTenant, error: ledgerTenantErr }] =
        await Promise.all([
          supabaseAdmin.from('ledgers').select('student_id, amount, school_id, tenant_id').eq('school_id', tenantId),
          supabaseAdmin.from('ledgers').select('student_id, amount, school_id, tenant_id').eq('tenant_id', tenantId),
        ]);
      if (ledgerSchoolErr) throw ledgerSchoolErr;
      if (ledgerTenantErr) throw ledgerTenantErr;

      const [{ data: studentsBySchool }, { data: studentsByTenant }] = await Promise.all([
        supabaseAdmin.from('students').select('id, school_id, tenant_id').eq('school_id', tenantId),
        supabaseAdmin.from('students').select('id, school_id, tenant_id').eq('tenant_id', tenantId),
      ]);
      const allowedStudents = [...(studentsBySchool || []), ...(studentsByTenant || [])];
      const allowedIds = new Set(
        allowedStudents.filter((s) => studentBelongsToTenant(s, tenantId)).map((s) => String(s.id)),
      );

      const balances: Record<string, number> = {};
      for (const row of [...(ledgerBySchool || []), ...(ledgerByTenant || [])]) {
        const studentId = String(row.student_id || '');
        if (!allowedIds.has(studentId)) continue;
        if (
          (row.school_id || row.tenant_id) &&
          !studentBelongsToTenant({ school_id: row.school_id, tenant_id: row.tenant_id }, tenantId)
        ) {
          continue;
        }
        balances[studentId] = (balances[studentId] || 0) + Number(row.amount);
      }

      for (const [studentId, amount] of Object.entries(balances)) {
        if (!allowedIds.has(studentId)) continue;
        await supabaseAdmin
          .from('students')
          .update({ running_balance: amount })
          .eq('id', studentId)
          .eq('school_id', tenantId);
        await supabaseAdmin
          .from('students')
          .update({ running_balance: amount })
          .eq('id', studentId)
          .eq('tenant_id', tenantId);
      }

      return res.status(200).json({ success: true, message: 'Recomputation completed.' });
    } catch (error: any) {
      console.error('[IntegrityController] Recompute Error:', error.message);
      return res.status(500).json({ error: 'Recomputation failed' });
    }
  }
}
