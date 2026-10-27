// invify-backend/src/modules/health-insurance/services/health-member.service.ts
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext, HealthMemberCategory } from '../types';
import { HealthAuditService } from './health-audit.service';

export interface CreateMemberParams {
  category: HealthMemberCategory;
  studentId?: string;
  tenantStaffId?: string;
  staffCategory?: 'teaching' | 'non_teaching';
  department?: string;
  customerId?: string;
  cohortLabel?: string;
}

export class HealthMemberService {
  /**
   * List insured members for the authenticated tenant.
   */
  static async listMembers(
    ctx: HealthContext,
    params: {
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('hw_members')
      .select(`
        id,
        mode,
        member_category,
        insurer_member_ref,
        cohort_label,
        status,
        created_at,
        students (
          id,
          first_name,
          last_name,
          admission_number,
          current_class
        ),
        hw_staff_profiles (
          id,
          employment_category,
          department,
          tenant_staff (
            id,
            name,
            staff_id,
            phone
          )
        )
      `, { count: 'exact' })
      .eq('tenant_id', ctx.tenantId);

    if (params.category) {
      query = query.eq('member_category', params.category);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`Failed to list members: ${error.message}`);

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Enrol an existing student as a health member.
   */
  static async enrolStudentMember(ctx: HealthContext, studentId: string, cohortLabel?: string) {
    // 1. Verify student exists and belongs to this tenant
    const { data: student, error: stuError } = await supabaseAdmin
      .from('students')
      .select('id, tenant_id, school_id, first_name, last_name, admission_number')
      .eq('id', studentId)
      .maybeSingle();

    if (stuError || !student) {
      throw new Error('Student not found');
    }

    const studentTenant = student.tenant_id || student.school_id;
    if (studentTenant !== ctx.tenantId) {
      throw new Error('Cross-tenant student enrolment rejected');
    }

    // 2. Check for duplicate membership
    const { data: existing } = await supabaseAdmin
      .from('hw_members')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      return existing; // idempotent return
    }

    // 3. Create member record
    const { data: member, error: insError } = await supabaseAdmin
      .from('hw_members')
      .insert({
        tenant_id: ctx.tenantId,
        mode: 'school',
        member_category: 'student',
        student_id: studentId,
        cohort_label: cohortLabel || null,
        status: 'active',
        created_by: ctx.userId
      })
      .select()
      .single();

    if (insError) throw new Error(`Failed to create student member: ${insError.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'member.enrolled_student',
      resourceType: 'hw_members',
      resourceId: member.id,
      changes: { studentId, admissionNumber: student.admission_number }
    });

    return member;
  }

  /**
   * Enrol an existing staff member from tenant_staff as a health member.
   * Requires health.hr_admin permission.
   */
  static async enrolStaffMember(
    ctx: HealthContext,
    params: {
      tenantStaffId: string;
      employmentCategory: 'teaching' | 'non_teaching';
      department?: string;
      userId?: string;
    }
  ) {
    // 1. Verify tenant_staff exists
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('tenant_staff')
      .select('id, tenant_id, name, staff_id')
      .eq('id', params.tenantStaffId)
      .maybeSingle();

    if (staffErr || !staff) {
      throw new Error('Staff record not found');
    }

    if (staff.tenant_id !== ctx.tenantId) {
      throw new Error('Cross-tenant staff enrolment rejected');
    }

    // 2. Upsert hw_staff_profiles
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('hw_staff_profiles')
      .upsert(
        {
          tenant_id: ctx.tenantId,
          tenant_staff_id: params.tenantStaffId,
          user_id: params.userId || null,
          employment_category: params.employmentCategory,
          department: params.department || null,
          employment_status: 'active',
          created_by: ctx.userId
        },
        { onConflict: 'tenant_id,tenant_staff_id' }
      )
      .select()
      .single();

    if (profErr) throw new Error(`Failed to create staff profile: ${profErr.message}`);

    // 3. Upsert hw_members
    const category: HealthMemberCategory = params.employmentCategory === 'teaching' 
      ? 'teaching_staff' 
      : 'non_teaching_staff';

    const { data: member, error: memErr } = await supabaseAdmin
      .from('hw_members')
      .upsert(
        {
          tenant_id: ctx.tenantId,
          mode: 'school',
          member_category: category,
          staff_profile_id: profile.id,
          status: 'active',
          created_by: ctx.userId
        },
        { onConflict: 'tenant_id,staff_profile_id' }
      )
      .select()
      .single();

    if (memErr) throw new Error(`Failed to create staff member: ${memErr.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'member.enrolled_staff',
      resourceType: 'hw_members',
      resourceId: member.id,
      changes: { tenantStaffId: params.tenantStaffId, employmentCategory: params.employmentCategory }
    });

    return member;
  }
}
