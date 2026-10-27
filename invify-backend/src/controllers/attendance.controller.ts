// src/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AttendancePdfService } from '../services/attendance-pdf.service';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { supabaseAdmin } from '../db/supabase';

export class AttendanceController {
  /**
   * Helper to extract tenantId from request context safely.
   */
  private static getTenant(req: Request): string {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      const err = new Error('Unauthorized: Tenant context missing');
      (err as any).statusCode = 401;
      throw err;
    }
    return tenantId;
  }

  /**
   * GET /attendance/students
   */
  static async listStudents(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const classLevel = (req.query.classLevel || req.query.className || '') as string;
      const data = await AttendanceService.getStudentsByClass(tenantId, classLevel);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/enroll
   */
  static async enroll(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { fullName, classLevel, admissionNumber } = req.body;
      if (!fullName || !classLevel) {
        return res.status(400).json({ error: 'fullName and classLevel are required' });
      }
      const data = await AttendanceService.enrollStudent(tenantId, fullName, classLevel, admissionNumber);
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const settings = await AttendanceService.getSettings(tenantId);
      return res.status(200).json(settings);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * PUT /attendance/settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const user = (req as any).user;
      const roles: string[] = String(user?.role || '').toLowerCase().split(',');
      const isAuthorized = roles.some((r) =>
        ['super_admin', 'admin', 'owner', 'school_admin'].includes(r.trim()),
      );
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Forbidden: Only school administrators can update attendance settings' });
      }

      const updated = await AttendanceService.updateSettings(tenantId, req.body);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/calendar
   */
  static async listCalendarExceptions(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const data = await AttendanceService.listCalendarExceptions(tenantId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/calendar
   */
  static async addCalendarException(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { exceptionDate, description, isInstructional } = req.body;
      if (!exceptionDate) {
        return res.status(400).json({ error: 'exceptionDate is required' });
      }
      const data = await AttendanceService.addCalendarException(
        tenantId,
        exceptionDate,
        description || 'School Holiday / Closure',
        isInstructional || false,
      );
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * DELETE /attendance/calendar/:id
   */
  static async deleteCalendarException(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { id } = req.params;
      const data = await AttendanceService.deleteCalendarException(tenantId, id);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/assignments
   */
  static async listAssignments(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const data = await AttendanceService.listAssignments(tenantId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/assignments
   */
  static async createAssignment(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const user = (req as any).user;
      const roles: string[] = String(user?.role || '').toLowerCase().split(',');
      const isAuthorized = roles.some((r) =>
        ['super_admin', 'admin', 'owner', 'school_admin'].includes(r.trim()),
      );
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Forbidden: Only school administrators can assign classes' });
      }

      const { className, teacherName, teacherUserId, subjectName, classId } = req.body;
      if (!className || !teacherName) {
        return res.status(400).json({ error: 'className and teacherName are required' });
      }

      const data = await AttendanceService.createAssignment(tenantId, {
        className,
        teacherName,
        teacherUserId,
        subjectName,
        classId,
      });
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * DELETE /attendance/assignments/:id
   */
  static async deleteAssignment(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { id } = req.params;
      const data = await AttendanceService.deleteAssignment(tenantId, id);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/register
   * Fetch digital register for a class on a specific date.
   */
  static async getRegister(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const className = (req.query.className || req.query.classLevel) as string;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const subjectName = req.query.subjectName as string | undefined;

      if (!className) {
        return res.status(400).json({ error: 'className parameter is required' });
      }

      const data = await AttendanceService.getRegister(tenantId, className, date, subjectName);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/save
   * Save draft or finalize register.
   */
  static async saveRegister(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const user = (req as any).user;
      const { className, date, teacherId, teacherName, subjectName, academicYear, term, status, entries } = req.body;

      if (!className) {
        return res.status(400).json({ error: 'className is required' });
      }

      const result = await AttendanceService.saveRegister(tenantId, user, {
        className,
        date: date || new Date().toISOString().split('T')[0],
        teacherId,
        teacherName,
        subjectName,
        academicYear,
        term,
        status: status || 'draft',
        entries: entries || [],
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/bulk-present
   * Bulk mark present with explicit confirmation.
   */
  static async bulkPresent(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const user = (req as any).user;
      const { className, studentIds, date, teacherName, subjectName } = req.body;

      if (!className || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: 'className and studentIds array are required' });
      }

      const entries = studentIds.map((id: string) => ({
        studentId: id,
        status: 'present' as const,
      }));

      const result = await AttendanceService.saveRegister(tenantId, user, {
        className,
        date: date || new Date().toISOString().split('T')[0],
        teacherName,
        subjectName,
        status: 'draft',
        entries,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/correct
   * Audited correction of a finalized attendance record.
   */
  static async correctEntry(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const user = (req as any).user;
      const { sessionId, studentId, newStatus, reason } = req.body;

      if (!sessionId || !studentId || !newStatus || !reason) {
        return res.status(400).json({ error: 'sessionId, studentId, newStatus, and reason are required' });
      }

      const result = await AttendanceService.correctEntry(tenantId, user, {
        sessionId,
        studentId,
        newStatus,
        reason,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/report
   * Class attendance report data (matching reference image 1).
   */
  static async getClassReport(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { className, periodFrom, periodTo, subjectName } = req.query;

      if (!className || !periodFrom || !periodTo) {
        return res.status(400).json({ error: 'className, periodFrom, and periodTo are required' });
      }

      const report = await AttendanceService.getClassReport(tenantId, {
        className: String(className),
        periodFrom: String(periodFrom),
        periodTo: String(periodTo),
        subjectName: subjectName ? String(subjectName) : undefined,
      });

      return res.status(200).json(report);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/report/pdf
   * Download print-ready Class Attendance Report PDF.
   */
  static async exportClassReportPdf(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { className, periodFrom, periodTo, subjectName } = req.query;

      if (!className || !periodFrom || !periodTo) {
        return res.status(400).json({ error: 'className, periodFrom, and periodTo are required' });
      }

      const reportData = await AttendanceService.getClassReport(tenantId, {
        className: String(className),
        periodFrom: String(periodFrom),
        periodTo: String(periodTo),
        subjectName: subjectName ? String(subjectName) : undefined,
      });

      const pdfBuffer = await AttendancePdfService.generateReportPdf({
        schoolName: reportData.schoolName,
        className: String(className),
        teacherName: reportData.teacherName,
        periodFrom: String(periodFrom),
        periodTo: String(periodTo),
        report: reportData,
        studentsWithMeta: reportData.students as any,
      });

      const filename = `Attendance-Report-${className}-${periodFrom}-to-${periodTo}.pdf`.replace(/\s+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/register/pdf
   * Download print-ready Weekly Class Attendance Register PDF (matching reference image 2).
   */
  static async exportRegisterPdf(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { className, date, academicYear, term, subjectName } = req.query;

      if (!className) {
        return res.status(400).json({ error: 'className is required' });
      }

      const targetDate = (date as string) || new Date().toISOString().split('T')[0];
      const registerData = await AttendanceService.getRegister(
        tenantId,
        String(className),
        targetDate,
        subjectName ? String(subjectName) : undefined,
      );

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .maybeSingle();

      const pdfBuffer = await AttendancePdfService.generateRegisterPdf({
        schoolName: tenant?.name || 'School of Education',
        className: String(className),
        teacherName: registerData.session?.teacher_name || '',
        subjectName: (subjectName as string) || registerData.session?.subject_name || '',
        academicYear: (academicYear as string) || registerData.session?.academic_year || '',
        term: (term as string) || registerData.session?.term || '',
        students: registerData.students.map((s, idx) => ({
          sn: idx + 1,
          fullName: s.full_name,
          admissionNumber: s.admission_number,
          attendanceMap: (s.status ? { '0-0': s.status.slice(0, 1).toUpperCase() } : {}) as Record<string, string>,
        })),
      });

      const filename = `Attendance-Register-${className}-${targetDate}.pdf`.replace(/\s+/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/student-history/:studentId
   */
  static async getStudentHistory(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { studentId } = req.params;
      const periodFrom = (req.query.periodFrom as string) || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
      const periodTo = (req.query.periodTo as string) || new Date().toISOString().split('T')[0];

      const history = await AttendanceService.getStudentHistory(tenantId, studentId, { periodFrom, periodTo });
      return res.status(200).json(history);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { data, error } = await supabaseAdmin
        .from('attendance_sessions')
        .select(`
          *,
          users:teacher_id (name)
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error && !String(error.message).includes('does not exist')) throw error;
      return res.status(200).json(data || []);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/audit-log
   */
  static async getAuditLog(req: Request, res: Response) {
    try {
      const tenantId = AttendanceController.getTenant(req);
      const { data, error } = await supabaseAdmin
        .from('attendance_audit_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error && !String(error.message).includes('does not exist')) throw error;
      return res.status(200).json(data || []);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
