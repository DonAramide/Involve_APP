// invify-backend/src/services/attendance.service.ts
import { supabase, supabaseAdmin } from '../db/supabase';
import { getClient } from '../db/pg';
import {
  computeClassReport,
  computeStudentSummary,
  ClassReport,
  DEFAULT_POLICY,
  DEFAULT_THRESHOLD_PERCENT,
  DEFAULT_INSTRUCTIONAL_WEEKDAYS,
  AttendancePolicy,
  CalcStudent,
  CalcEntry,
  AttendanceStatus,
} from '../modules/attendance/attendance-calculator';

export interface AttendanceEntryInput {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface SaveRegisterPayload {
  className: string;
  date: string; // YYYY-MM-DD
  teacherId?: string;
  teacherName?: string;
  subjectName?: string;
  academicYear?: string;
  term?: string;
  status?: 'draft' | 'finalized';
  entries: AttendanceEntryInput[];
}

export class AttendanceService {
  /**
   * Fast student list for a class (checks both students table & school_entities sync).
   */
  static async getStudentsByClass(tenantId: string, className: string) {
    const trimmedClass = (className || '').trim();

    // 1. Direct from students table
    const { data: dbStudents } = await supabaseAdmin
      .from('students')
      .select('id, full_name, admission_number, current_class, status, registration_date')
      .or(`tenant_id.eq.${tenantId},school_id.eq.${tenantId}`)
      .order('full_name', { ascending: true });

    // Filter by class name (case-insensitive)
    const matched = (dbStudents || []).filter((s: any) => {
      const cls = String(s.current_class || '').trim().toLowerCase();
      return cls === trimmedClass.toLowerCase();
    });

    if (matched.length > 0) {
      return matched.map((s: any) => ({
        id: String(s.id),
        full_name: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
        admission_number: s.admission_number || '',
        current_class: s.current_class || trimmedClass,
        status: s.status || 'active',
        enrolledFrom: s.registration_date ? s.registration_date.split('T')[0] : null,
      }));
    }

    // 2. Fallback to school_entities (if synced from mobile/web sync)
    const { data: entityRows } = await supabaseAdmin
      .from('school_entities')
      .select('sync_id, payload')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'student');

    const fromEntities: any[] = [];
    (entityRows || []).forEach((e: any) => {
      const p = e.payload || {};
      const c = String(p.className || p.current_class || '').trim().toLowerCase();
      if (c === trimmedClass.toLowerCase()) {
        fromEntities.push({
          id: String(e.sync_id || p.id),
          full_name: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Student',
          admission_number: p.admissionNumber || p.admission_number || '',
          current_class: p.className || p.current_class || trimmedClass,
          status: p.enrollmentStatus || 'active',
          enrolledFrom: p.registrationDate ? String(p.registrationDate).split('T')[0] : null,
        });
      }
    });

    return fromEntities.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  /**
   * Fast student enrollment for quick setup.
   */
  static async enrollStudent(tenantId: string, fullName: string, classLevel: string, admissionNumber?: string) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        tenant_id: tenantId,
        full_name: fullName,
        current_class: classLevel,
        admission_number: admissionNumber || `ADM-${Date.now().toString().slice(-6)}`,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Retrieve tenant-specific attendance settings or system defaults.
   */
  static async getSettings(tenantId: string) {
    const { data } = await supabaseAdmin
      .from('attendance_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!data) {
      return {
        tenant_id: tenantId,
        minimum_attendance_threshold: DEFAULT_THRESHOLD_PERCENT,
        policy_present: DEFAULT_POLICY.present,
        policy_late: DEFAULT_POLICY.late,
        policy_excused: DEFAULT_POLICY.excused,
        policy_absent: DEFAULT_POLICY.absent,
        instructional_weekdays: Array.from(DEFAULT_INSTRUCTIONAL_WEEKDAYS),
      };
    }

    return {
      ...data,
      minimum_attendance_threshold: Number(data.minimum_attendance_threshold) || DEFAULT_THRESHOLD_PERCENT,
      instructional_weekdays: data.instructional_weekdays || Array.from(DEFAULT_INSTRUCTIONAL_WEEKDAYS),
    };
  }

  /**
   * Update or initialize attendance settings.
   */
  static async updateSettings(
    tenantId: string,
    updates: {
      minimum_attendance_threshold?: number;
      policy_present?: string;
      policy_late?: string;
      policy_excused?: string;
      policy_absent?: string;
      instructional_weekdays?: number[];
    },
  ) {
    const threshold = updates.minimum_attendance_threshold ?? DEFAULT_THRESHOLD_PERCENT;
    if (threshold < 0 || threshold > 100) {
      throw new Error('Minimum attendance threshold must be between 0 and 100');
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_settings')
      .upsert(
        {
          tenant_id: tenantId,
          minimum_attendance_threshold: threshold,
          policy_present: updates.policy_present || DEFAULT_POLICY.present,
          policy_late: updates.policy_late || DEFAULT_POLICY.late,
          policy_excused: updates.policy_excused || DEFAULT_POLICY.excused,
          policy_absent: updates.policy_absent || DEFAULT_POLICY.absent,
          instructional_weekdays: updates.instructional_weekdays || Array.from(DEFAULT_INSTRUCTIONAL_WEEKDAYS),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * List calendar non-instructional dates / holidays.
   */
  static async listCalendarExceptions(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('attendance_calendar_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('exception_date', { ascending: true });

    if (error && !String(error.message).includes('does not exist')) throw error;
    return data || [];
  }

  /**
   * Add calendar exception.
   */
  static async addCalendarException(
    tenantId: string,
    exceptionDate: string,
    description: string,
    isInstructional: boolean = false,
  ) {
    const { data, error } = await supabaseAdmin
      .from('attendance_calendar_exceptions')
      .upsert(
        {
          tenant_id: tenantId,
          exception_date: exceptionDate,
          description,
          is_instructional: isInstructional,
        },
        { onConflict: 'tenant_id, exception_date' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete calendar exception.
   */
  static async deleteCalendarException(tenantId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('attendance_calendar_exceptions')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Teacher-to-class assignments list.
   */
  static async listAssignments(tenantId: string) {
    const { data, error } = await supabaseAdmin
      .from('attendance_class_assignments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('class_name', { ascending: true });

    if (error && !String(error.message).includes('does not exist')) throw error;
    return data || [];
  }

  /**
   * Create or update teacher-to-class assignment.
   */
  static async createAssignment(
    tenantId: string,
    payload: {
      className: string;
      teacherName: string;
      teacherUserId?: string;
      subjectName?: string;
      classId?: string;
    },
  ) {
    const { data, error } = await supabaseAdmin
      .from('attendance_class_assignments')
      .insert({
        tenant_id: tenantId,
        class_name: payload.className,
        teacher_name: payload.teacherName,
        teacher_user_id: payload.teacherUserId || null,
        subject_name: payload.subjectName || null,
        class_id: payload.classId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete assignment.
   */
  static async deleteAssignment(tenantId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('attendance_class_assignments')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Enforce teacher authorization for class marking.
   * Super admins, school admins, owners have universal school access.
   * Teachers must have an assignment matching their name or user ID.
   */
  static async checkTeacherClassAccess(tenantId: string, user: any, className: string): Promise<boolean> {
    if (!user) return false;
    const roles: string[] = String(user.role || '').toLowerCase().split(',').map((r) => r.trim());
    const isPrivileged = roles.some((r) =>
      ['super_admin', 'admin', 'owner', 'school_admin', 'principal', 'head_teacher'].includes(r),
    );
    if (isPrivileged) return true;

    // Check teacher assignments
    const { data: assignments } = await supabaseAdmin
      .from('attendance_class_assignments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('class_name', className);

    if (!assignments || assignments.length === 0) {
      // If no assignments configured yet, allow teacher if role includes teacher
      return roles.includes('teacher');
    }

    const userId = user.id;
    const userName = String(user.name || user.fullName || '').toLowerCase().trim();

    return assignments.some((a: any) => {
      if (userId && a.teacher_user_id && a.teacher_user_id === userId) return true;
      if (userName && a.teacher_name && a.teacher_name.toLowerCase().trim() === userName) return true;
      return false;
    });
  }

  /**
   * Load attendance register (session + student entries) for a specific class and date.
   */
  static async getRegister(
    tenantId: string,
    className: string,
    date: string,
    subjectName?: string,
  ) {
    const students = await AttendanceService.getStudentsByClass(tenantId, className);

    let sessionQuery = supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('class_name', className)
      .eq('date', date);

    if (subjectName) {
      sessionQuery = sessionQuery.eq('subject_name', subjectName);
    }

    const { data: sessions } = await sessionQuery.maybeSingle();

    const studentMap = new Map<string, any>();
    students.forEach((s) => {
      studentMap.set(s.id, {
        ...s,
        status: null,
        notes: '',
      });
    });

    if (sessions?.id) {
      const { data: entryRows } = await supabaseAdmin
        .from('student_attendance_entries')
        .select('*')
        .eq('session_id', sessions.id);

      (entryRows || []).forEach((row: any) => {
        const existing = studentMap.get(row.student_id);
        if (existing) {
          existing.status = row.status as AttendanceStatus;
          existing.notes = row.notes || '';
        } else {
          studentMap.set(row.student_id, {
            id: row.student_id,
            full_name: row.student_name,
            admission_number: row.admission_number || '',
            current_class: className,
            status: row.status as AttendanceStatus,
            notes: row.notes || '',
          });
        }
      });
    }

    return {
      session: sessions || null,
      className,
      date,
      subjectName: subjectName || null,
      students: Array.from(studentMap.values()),
      isFinalized: sessions?.status === 'finalized',
    };
  }

  /**
   * Save or finalize attendance register with transaction protection and audit logging.
   */
  static async saveRegister(tenantId: string, user: any, payload: SaveRegisterPayload) {
    const authorized = await AttendanceService.checkTeacherClassAccess(tenantId, user, payload.className);
    if (!authorized) {
      const err = new Error(`Unauthorized: You are not assigned to mark attendance for class ${payload.className}`);
      (err as any).statusCode = 403;
      throw err;
    }

    const targetDate = payload.date || new Date().toISOString().split('T')[0];
    const isFinalizing = payload.status === 'finalized';

    // Check if session already exists
    let sessionQuery = supabaseAdmin
      .from('attendance_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('class_name', payload.className)
      .eq('date', targetDate);

    if (payload.subjectName) {
      sessionQuery = sessionQuery.eq('subject_name', payload.subjectName);
    }

    const { data: existingSession } = await sessionQuery.maybeSingle();

    if (existingSession && existingSession.status === 'finalized' && !isFinalizing) {
      const err = new Error(
        `Cannot modify finalized attendance session: This attendance register for ${payload.className} on ${targetDate} is finalized and cannot be overwritten without an authorized correction.`,
      );
      (err as any).statusCode = 409;
      throw err;
    }

    // Attempt PostgreSQL transaction if DATABASE_URL available, else Supabase fallback
    if (process.env.DATABASE_URL) {
      let client;
      try {
        client = await getClient();
        await client.query('BEGIN');

        // 1. Upsert session
        const sessionSql = `
          INSERT INTO public.attendance_sessions (
            tenant_id, class_name, date, teacher_id, teacher_name, subject_name,
            academic_year, term, status, finalized_at, finalized_by, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
          ON CONFLICT (tenant_id, class_name, date, COALESCE(subject_name, ''))
          DO UPDATE SET
            teacher_name = COALESCE(EXCLUDED.teacher_name, attendance_sessions.teacher_name),
            status = EXCLUDED.status,
            finalized_at = COALESCE(EXCLUDED.finalized_at, attendance_sessions.finalized_at),
            finalized_by = COALESCE(EXCLUDED.finalized_by, attendance_sessions.finalized_by),
            updated_at = now()
          RETURNING id;
        `;

        const sessionRes = await client.query(sessionSql, [
          tenantId,
          payload.className,
          targetDate,
          user.id || null,
          payload.teacherName || user.name || 'Teacher',
          payload.subjectName || null,
          payload.academicYear || null,
          payload.term || null,
          payload.status || 'draft',
          isFinalizing ? new Date().toISOString() : null,
          isFinalizing ? user.id || null : null,
        ]);

        const sessionId = sessionRes.rows[0].id;

        // 2. Upsert each student entry
        for (const entry of payload.entries || []) {
          if (!entry.status) continue;
          const entrySql = `
            INSERT INTO public.student_attendance_entries (
              tenant_id, session_id, student_id, student_name, admission_number, status, notes, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
            ON CONFLICT (session_id, student_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              updated_at = now();
          `;
          await client.query(entrySql, [
            tenantId,
            sessionId,
            entry.studentId,
            entry.studentName || 'Student',
            entry.admissionNumber || '',
            entry.status,
            entry.notes || null,
          ]);
        }

        // 3. Write Audit record
        const auditSql = `
          INSERT INTO public.attendance_audit_log (
            tenant_id, session_id, action, performed_by, performer_role, performer_name, reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7);
        `;
        await client.query(auditSql, [
          tenantId,
          sessionId,
          isFinalizing ? 'FINALIZED' : existingSession ? 'DRAFT_SAVED' : 'SESSION_CREATED',
          user.id || null,
          user.role || 'teacher',
          user.name || 'User',
          isFinalizing ? 'Final register submission' : 'Saved draft attendance',
        ]);

        await client.query('COMMIT');
        return { success: true, sessionId, status: payload.status || 'draft' };
      } catch (e) {
        if (client) await client.query('ROLLBACK');
        throw e;
      } finally {
        if (client) client.release();
      }
    } else {
      // Supabase REST fallback
      let session: any;
      if (existingSession?.id) {
        const { data: updated, error: uErr } = await supabaseAdmin
          .from('attendance_sessions')
          .update({
            teacher_id: user.id || null,
            teacher_name: payload.teacherName || user.name || existingSession.teacher_name || 'Teacher',
            subject_name: payload.subjectName || existingSession.subject_name || null,
            academic_year: payload.academicYear || existingSession.academic_year || null,
            term: payload.term || existingSession.term || null,
            status: payload.status || existingSession.status || 'draft',
            finalized_at: isFinalizing ? (existingSession.finalized_at || new Date().toISOString()) : null,
            finalized_by: isFinalizing ? (existingSession.finalized_by || user.id || null) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSession.id)
          .select()
          .single();

        if (uErr) throw uErr;
        session = updated;
      } else {
        const { data: inserted, error: iErr } = await supabaseAdmin
          .from('attendance_sessions')
          .insert({
            tenant_id: tenantId,
            class_name: payload.className,
            date: targetDate,
            teacher_id: user.id || null,
            teacher_name: payload.teacherName || user.name || 'Teacher',
            subject_name: payload.subjectName || null,
            academic_year: payload.academicYear || null,
            term: payload.term || null,
            status: payload.status || 'draft',
            finalized_at: isFinalizing ? new Date().toISOString() : null,
            finalized_by: isFinalizing ? user.id || null : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (iErr) {
          if (
            iErr.code === '23505' ||
            String(iErr.message).includes('unique constraint') ||
            String(iErr.message).includes('already exists')
          ) {
            // Concurrent insert won the race — fetch the existing session and update it
            const { data: retrySession, error: rErr } = await sessionQuery.maybeSingle();
            if (rErr || !retrySession) throw iErr;
            if (retrySession.status === 'finalized' && !isFinalizing) {
              const err = new Error(
                `Cannot modify finalized attendance session: This attendance register for ${payload.className} on ${targetDate} is finalized and cannot be overwritten without an authorized correction.`,
              );
              (err as any).statusCode = 409;
              throw err;
            }
            const { data: updated, error: uErr } = await supabaseAdmin
              .from('attendance_sessions')
              .update({
                teacher_id: user.id || null,
                teacher_name: payload.teacherName || user.name || retrySession.teacher_name || 'Teacher',
                subject_name: payload.subjectName || retrySession.subject_name || null,
                status: payload.status || retrySession.status || 'draft',
                updated_at: new Date().toISOString(),
              })
              .eq('id', retrySession.id)
              .select()
              .single();
            if (uErr) throw uErr;
            session = updated;
          } else {
            throw iErr;
          }
        } else {
          session = inserted;
        }
      }

      const items = (payload.entries || [])
        .filter((e) => Boolean(e.status))
        .map((e) => ({
          tenant_id: tenantId,
          session_id: session.id,
          student_id: e.studentId,
          student_name: e.studentName || 'Student',
          admission_number: e.admissionNumber || '',
          status: e.status,
          notes: e.notes || null,
          updated_at: new Date().toISOString(),
        }));

      if (items.length > 0) {
        const { error: eErr } = await supabaseAdmin
          .from('student_attendance_entries')
          .upsert(items, { onConflict: 'session_id, student_id' });
        if (eErr) throw eErr;
      }

      // Log audit
      await supabaseAdmin.from('attendance_audit_log').insert({
        tenant_id: tenantId,
        session_id: session.id,
        action: isFinalizing ? 'FINALIZED' : existingSession ? 'DRAFT_SAVED' : 'SESSION_CREATED',
        performed_by: user.id || null,
        performer_role: user.role || 'teacher',
        performer_name: user.name || 'User',
        reason: isFinalizing ? 'Final register submission' : 'Saved draft attendance',
      });

      return { success: true, sessionId: session.id, status: payload.status || 'draft' };
    }
  }

  /**
   * Authorized correction of a finalized attendance entry.
   */
  static async correctEntry(
    tenantId: string,
    user: any,
    payload: {
      sessionId: string;
      studentId: string;
      newStatus: AttendanceStatus;
      reason: string;
    },
  ) {
    if (!payload.reason || payload.reason.trim().length < 5) {
      const err = new Error('Reason must be at least 5 characters: A detailed reason is required to correct attendance.');
      (err as any).statusCode = 400;
      throw err;
    }

    // 1. Fetch current entry
    const { data: currentEntry } = await supabaseAdmin
      .from('student_attendance_entries')
      .select('*')
      .eq('session_id', payload.sessionId)
      .eq('student_id', payload.studentId)
      .maybeSingle();

    const previousStatus = currentEntry?.status || 'unrecorded';

    // 2. Update entry
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('student_attendance_entries')
      .upsert(
        {
          tenant_id: tenantId,
          session_id: payload.sessionId,
          student_id: payload.studentId,
          student_name: currentEntry?.student_name || 'Student',
          status: payload.newStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id, student_id' },
      )
      .select()
      .single();

    if (uErr) throw uErr;

    // 3. Log audited correction
    await supabaseAdmin.from('attendance_audit_log').insert({
      tenant_id: tenantId,
      session_id: payload.sessionId,
      entry_id: updated.id,
      student_id: payload.studentId,
      action: 'CORRECTION',
      performed_by: user.id || null,
      performer_role: user.role || 'staff',
      performer_name: user.name || 'User',
      previous_status: previousStatus,
      new_status: payload.newStatus,
      reason: payload.reason,
    });

    return { success: true, entry: updated };
  }

  /**
   * Authoritative Class Attendance Report calculation.
   * Reproduces the information hierarchy of reference image 1.
   */
  static async getClassReport(
    tenantId: string,
    filters: {
      className: string;
      periodFrom: string;
      periodTo: string;
      subjectName?: string;
    },
  ): Promise<ClassReport & { schoolName: string; teacherName?: string }> {
    const { className, periodFrom, periodTo, subjectName } = filters;

    // 1. Fetch Settings
    const settings = await AttendanceService.getSettings(tenantId);
    const policy: AttendancePolicy = {
      present: settings.policy_present,
      late: settings.policy_late,
      excused: settings.policy_excused,
      absent: settings.policy_absent,
    };

    // 2. Fetch Calendar Exceptions / Holidays
    const exceptions = await AttendanceService.listCalendarExceptions(tenantId);
    const nonInstructionalDates = exceptions
      .filter((e: any) => !e.is_instructional)
      .map((e: any) => String(e.exception_date).split('T')[0]);

    // 3. Fetch Enrolled Students for class
    const students = await AttendanceService.getStudentsByClass(tenantId, className);

    // 4. Fetch Sessions in date range
    let sessionQuery = supabaseAdmin
      .from('attendance_sessions')
      .select('id, date, teacher_name, subject_name')
      .eq('tenant_id', tenantId)
      .eq('class_name', className)
      .gte('date', periodFrom)
      .lte('date', periodTo);

    if (subjectName) {
      sessionQuery = sessionQuery.eq('subject_name', subjectName);
    }

    const { data: sessions } = await sessionQuery;
    const sessionMap = new Map<string, string>(); // sessionId -> date
    (sessions || []).forEach((s: any) => sessionMap.set(s.id, String(s.date).split('T')[0]));

    // 5. Fetch Entries for these sessions
    const entries: CalcEntry[] = [];
    const entryStudentMap = new Map<string, any>();
    if (sessionMap.size > 0) {
      const sessionIds = Array.from(sessionMap.keys());
      const { data: entryRows } = await supabaseAdmin
        .from('student_attendance_entries')
        .select('student_id, student_name, admission_number, session_id, status')
        .in('session_id', sessionIds);

      (entryRows || []).forEach((e: any) => {
        const d = sessionMap.get(e.session_id);
        if (d && e.status) {
          entries.push({
            studentId: String(e.student_id),
            date: d,
            status: e.status as AttendanceStatus,
          });
        }
        if (e.student_id && !entryStudentMap.has(String(e.student_id))) {
          entryStudentMap.set(String(e.student_id), {
            id: String(e.student_id),
            full_name: e.student_name || 'Student',
            admission_number: e.admission_number || '',
            current_class: className,
            enrolledFrom: null,
          });
        }
      });
    }

    // Merge registered students with entry students
    const studentMetaMap = new Map<string, any>();
    students.forEach((s) => studentMetaMap.set(s.id, s));
    entryStudentMap.forEach((meta, id) => {
      if (!studentMetaMap.has(id)) {
        studentMetaMap.set(id, meta);
      }
    });

    const calcStudents: CalcStudent[] = Array.from(studentMetaMap.values()).map((s) => ({
      id: s.id,
      enrolledFrom: s.enrolledFrom || null,
    }));

    // 6. Run domain calculator
    const report = computeClassReport({
      periodFrom,
      periodTo,
      students: calcStudents,
      entries,
      nonInstructionalDates,
      instructionalWeekdays: settings.instructional_weekdays,
      policy,
      thresholdPercent: settings.minimum_attendance_threshold,
    });

    // 7. Enrich student summaries with student names & admission numbers
    const enrichedStudents = report.students.map((st) => {
      const meta = studentMetaMap.get(st.studentId) || {};
      return {
        ...st,
        studentName: meta.full_name || 'Student',
        admissionNumber: meta.admission_number || '',
      };
    });

    // Fetch tenant name
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle();

    const teacherName = sessions?.[0]?.teacher_name || 'Class Teacher';

    return {
      ...report,
      students: enrichedStudents as any,
      schoolName: tenant?.name || 'School',
      teacherName,
    };
  }

  /**
   * Student attendance history (for individual student & guardian portal).
   */
  static async getStudentHistory(
    tenantId: string,
    studentId: string,
    filters: { periodFrom: string; periodTo: string },
  ) {
    const { periodFrom, periodTo } = filters;

    // Verify student exists and belongs to tenant
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', studentId)
      .or(`tenant_id.eq.${tenantId},school_id.eq.${tenantId}`)
      .maybeSingle();

    let studentMeta: any = student;
    if (!studentMeta) {
      const { data: entry } = await supabaseAdmin
        .from('student_attendance_entries')
        .select('student_id, student_name, admission_number')
        .eq('tenant_id', tenantId)
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle();

      if (entry) {
        studentMeta = {
          id: entry.student_id,
          full_name: entry.student_name,
          admission_number: entry.admission_number,
        };
      }
    }

    if (!studentMeta) {
      const err = new Error('Student not found or access denied');
      (err as any).statusCode = 404;
      throw err;
    }

    const settings = await AttendanceService.getSettings(tenantId);
    const exceptions = await AttendanceService.listCalendarExceptions(tenantId);
    const nonInstructionalDates = exceptions
      .filter((e: any) => !e.is_instructional)
      .map((e: any) => String(e.exception_date).split('T')[0]);

    // Fetch all entries for this student
    const { data: entries } = await supabaseAdmin
      .from('student_attendance_entries')
      .select('id, session_id, status, notes, created_at, attendance_sessions (date, class_name, subject_name, teacher_name)')
      .eq('tenant_id', tenantId)
      .eq('student_id', studentId);

    const calcEntries: CalcEntry[] = [];
    const dailyLogs: any[] = [];

    (entries || []).forEach((e: any) => {
      const date = e.attendance_sessions?.date ? String(e.attendance_sessions.date).split('T')[0] : null;
      if (date && date >= periodFrom && date <= periodTo) {
        calcEntries.push({
          studentId,
          date,
          status: e.status,
        });
        dailyLogs.push({
          id: e.id,
          date,
          status: e.status,
          notes: e.notes,
          className: e.attendance_sessions?.class_name,
          subjectName: e.attendance_sessions?.subject_name,
          teacherName: e.attendance_sessions?.teacher_name,
        });
      }
    });

    const summary = computeStudentSummary(
      { id: studentId, enrolledFrom: studentMeta.registration_date ? studentMeta.registration_date.split('T')[0] : null },
      {
        periodFrom,
        periodTo,
        entries: calcEntries,
        nonInstructionalDates,
        instructionalWeekdays: settings.instructional_weekdays,
        policy: {
          present: settings.policy_present,
          late: settings.policy_late,
          excused: settings.policy_excused,
          absent: settings.policy_absent,
        },
        thresholdPercent: settings.minimum_attendance_threshold,
      },
    );

    return {
      student: {
        id: studentMeta.id,
        fullName: studentMeta.full_name || `${studentMeta.first_name || ''} ${studentMeta.last_name || ''}`.trim() || 'Student',
        admissionNumber: studentMeta.admission_number || '',
        className: studentMeta.current_class || '',
      },
      summary,
      dailyLogs: dailyLogs.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }
}
