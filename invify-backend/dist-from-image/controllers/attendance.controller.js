"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("../services/attendance.service");
const attendance_pdf_service_1 = require("../services/attendance-pdf.service");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const supabase_1 = require("../db/supabase");
class AttendanceController {
    /**
     * Helper to extract tenantId from request context safely.
     */
    static getTenant(req) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
        if (!tenantId) {
            const err = new Error('Unauthorized: Tenant context missing');
            err.statusCode = 401;
            throw err;
        }
        return tenantId;
    }
    /**
     * GET /attendance/students
     */
    static async listStudents(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const classLevel = (req.query.classLevel || req.query.className || '');
            const data = await attendance_service_1.AttendanceService.getStudentsByClass(tenantId, classLevel);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/enroll
     */
    static async enroll(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { fullName, classLevel, admissionNumber } = req.body;
            if (!fullName || !classLevel) {
                return res.status(400).json({ error: 'fullName and classLevel are required' });
            }
            const data = await attendance_service_1.AttendanceService.enrollStudent(tenantId, fullName, classLevel, admissionNumber);
            return res.status(201).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/settings
     */
    static async getSettings(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const settings = await attendance_service_1.AttendanceService.getSettings(tenantId);
            return res.status(200).json(settings);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * PUT /attendance/settings
     */
    static async updateSettings(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const user = req.user;
            const roles = String(user?.role || '').toLowerCase().split(',');
            const isAuthorized = roles.some((r) => ['super_admin', 'admin', 'owner', 'school_admin'].includes(r.trim()));
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Forbidden: Only school administrators can update attendance settings' });
            }
            const updated = await attendance_service_1.AttendanceService.updateSettings(tenantId, req.body);
            return res.status(200).json(updated);
        }
        catch (error) {
            return res.status(error.statusCode || 400).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/calendar
     */
    static async listCalendarExceptions(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const data = await attendance_service_1.AttendanceService.listCalendarExceptions(tenantId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/calendar
     */
    static async addCalendarException(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { exceptionDate, description, isInstructional } = req.body;
            if (!exceptionDate) {
                return res.status(400).json({ error: 'exceptionDate is required' });
            }
            const data = await attendance_service_1.AttendanceService.addCalendarException(tenantId, exceptionDate, description || 'School Holiday / Closure', isInstructional || false);
            return res.status(201).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * DELETE /attendance/calendar/:id
     */
    static async deleteCalendarException(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { id } = req.params;
            const data = await attendance_service_1.AttendanceService.deleteCalendarException(tenantId, id);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/assignments
     */
    static async listAssignments(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const data = await attendance_service_1.AttendanceService.listAssignments(tenantId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/assignments
     */
    static async createAssignment(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const user = req.user;
            const roles = String(user?.role || '').toLowerCase().split(',');
            const isAuthorized = roles.some((r) => ['super_admin', 'admin', 'owner', 'school_admin'].includes(r.trim()));
            if (!isAuthorized) {
                return res.status(403).json({ error: 'Forbidden: Only school administrators can assign classes' });
            }
            const { className, teacherName, teacherUserId, subjectName, classId } = req.body;
            if (!className || !teacherName) {
                return res.status(400).json({ error: 'className and teacherName are required' });
            }
            const data = await attendance_service_1.AttendanceService.createAssignment(tenantId, {
                className,
                teacherName,
                teacherUserId,
                subjectName,
                classId,
            });
            return res.status(201).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * DELETE /attendance/assignments/:id
     */
    static async deleteAssignment(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { id } = req.params;
            const data = await attendance_service_1.AttendanceService.deleteAssignment(tenantId, id);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/register
     * Fetch digital register for a class on a specific date.
     */
    static async getRegister(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const className = (req.query.className || req.query.classLevel);
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const subjectName = req.query.subjectName;
            if (!className) {
                return res.status(400).json({ error: 'className parameter is required' });
            }
            const data = await attendance_service_1.AttendanceService.getRegister(tenantId, className, date, subjectName);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/save
     * Save draft or finalize register.
     */
    static async saveRegister(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const user = req.user;
            const { className, date, teacherId, teacherName, subjectName, academicYear, term, status, entries } = req.body;
            if (!className) {
                return res.status(400).json({ error: 'className is required' });
            }
            const result = await attendance_service_1.AttendanceService.saveRegister(tenantId, user, {
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
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/bulk-present
     * Bulk mark present with explicit confirmation.
     */
    static async bulkPresent(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const user = req.user;
            const { className, studentIds, date, teacherName, subjectName } = req.body;
            if (!className || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ error: 'className and studentIds array are required' });
            }
            const entries = studentIds.map((id) => ({
                studentId: id,
                status: 'present',
            }));
            const result = await attendance_service_1.AttendanceService.saveRegister(tenantId, user, {
                className,
                date: date || new Date().toISOString().split('T')[0],
                teacherName,
                subjectName,
                status: 'draft',
                entries,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * POST /attendance/correct
     * Audited correction of a finalized attendance record.
     */
    static async correctEntry(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const user = req.user;
            const { sessionId, studentId, newStatus, reason } = req.body;
            if (!sessionId || !studentId || !newStatus || !reason) {
                return res.status(400).json({ error: 'sessionId, studentId, newStatus, and reason are required' });
            }
            const result = await attendance_service_1.AttendanceService.correctEntry(tenantId, user, {
                sessionId,
                studentId,
                newStatus,
                reason,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(error.statusCode || 400).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/report
     * Class attendance report data (matching reference image 1).
     */
    static async getClassReport(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { className, periodFrom, periodTo, subjectName } = req.query;
            if (!className || !periodFrom || !periodTo) {
                return res.status(400).json({ error: 'className, periodFrom, and periodTo are required' });
            }
            const report = await attendance_service_1.AttendanceService.getClassReport(tenantId, {
                className: String(className),
                periodFrom: String(periodFrom),
                periodTo: String(periodTo),
                subjectName: subjectName ? String(subjectName) : undefined,
            });
            return res.status(200).json(report);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/report/pdf
     * Download print-ready Class Attendance Report PDF.
     */
    static async exportClassReportPdf(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { className, periodFrom, periodTo, subjectName } = req.query;
            if (!className || !periodFrom || !periodTo) {
                return res.status(400).json({ error: 'className, periodFrom, and periodTo are required' });
            }
            const reportData = await attendance_service_1.AttendanceService.getClassReport(tenantId, {
                className: String(className),
                periodFrom: String(periodFrom),
                periodTo: String(periodTo),
                subjectName: subjectName ? String(subjectName) : undefined,
            });
            const pdfBuffer = await attendance_pdf_service_1.AttendancePdfService.generateReportPdf({
                schoolName: reportData.schoolName,
                className: String(className),
                teacherName: reportData.teacherName,
                periodFrom: String(periodFrom),
                periodTo: String(periodTo),
                report: reportData,
                studentsWithMeta: reportData.students,
            });
            const filename = `Attendance-Report-${className}-${periodFrom}-to-${periodTo}.pdf`.replace(/\s+/g, '_');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(pdfBuffer);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/register/pdf
     * Download print-ready Weekly Class Attendance Register PDF (matching reference image 2).
     */
    static async exportRegisterPdf(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { className, date, academicYear, term, subjectName } = req.query;
            if (!className) {
                return res.status(400).json({ error: 'className is required' });
            }
            const targetDate = date || new Date().toISOString().split('T')[0];
            const registerData = await attendance_service_1.AttendanceService.getRegister(tenantId, String(className), targetDate, subjectName ? String(subjectName) : undefined);
            const { data: tenant } = await supabase_1.supabaseAdmin
                .from('tenants')
                .select('name')
                .eq('id', tenantId)
                .maybeSingle();
            const pdfBuffer = await attendance_pdf_service_1.AttendancePdfService.generateRegisterPdf({
                schoolName: tenant?.name || 'School of Education',
                className: String(className),
                teacherName: registerData.session?.teacher_name || '',
                subjectName: subjectName || registerData.session?.subject_name || '',
                academicYear: academicYear || registerData.session?.academic_year || '',
                term: term || registerData.session?.term || '',
                students: registerData.students.map((s, idx) => ({
                    sn: idx + 1,
                    fullName: s.full_name,
                    admissionNumber: s.admission_number,
                    attendanceMap: (s.status ? { '0-0': s.status.slice(0, 1).toUpperCase() } : {}),
                })),
            });
            const filename = `Attendance-Register-${className}-${targetDate}.pdf`.replace(/\s+/g, '_');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(pdfBuffer);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/student-history/:studentId
     */
    static async getStudentHistory(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { studentId } = req.params;
            const periodFrom = req.query.periodFrom || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
            const periodTo = req.query.periodTo || new Date().toISOString().split('T')[0];
            const history = await attendance_service_1.AttendanceService.getStudentHistory(tenantId, studentId, { periodFrom, periodTo });
            return res.status(200).json(history);
        }
        catch (error) {
            return res.status(error.statusCode || 500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/history
     */
    static async getHistory(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { data, error } = await supabase_1.supabaseAdmin
                .from('attendance_sessions')
                .select(`
          *,
          users:teacher_id (name)
        `)
                .eq('tenant_id', tenantId)
                .order('date', { ascending: false });
            if (error && !String(error.message).includes('does not exist'))
                throw error;
            return res.status(200).json(data || []);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/audit-log
     */
    static async getAuditLog(req, res) {
        try {
            const tenantId = AttendanceController.getTenant(req);
            const { data, error } = await supabase_1.supabaseAdmin
                .from('attendance_audit_log')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(100);
            if (error && !String(error.message).includes('does not exist'))
                throw error;
            return res.status(200).json(data || []);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=attendance.controller.js.map