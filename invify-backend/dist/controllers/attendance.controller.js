"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("../services/attendance.service");
class AttendanceController {
    static async listStudents(req, res) {
        try {
            const { tenantId } = req.user;
            const { classLevel } = req.query;
            const data = await attendance_service_1.AttendanceService.getStudentsByClass(tenantId, classLevel);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async enroll(req, res) {
        try {
            const { tenantId } = req.user;
            const { fullName, classLevel } = req.body;
            const data = await attendance_service_1.AttendanceService.enrollStudent(tenantId, fullName, classLevel);
            return res.status(201).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async autoSave(req, res) {
        try {
            const { tenantId, id: userId } = req.user;
            const { classLevel, studentId, status, date, lessonNoteId } = req.body;
            const data = await attendance_service_1.AttendanceService.upsertStatus(tenantId, userId, classLevel, studentId, status, date, lessonNoteId);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async bulkPresent(req, res) {
        try {
            const { tenantId, id: userId } = req.user;
            const { classLevel, studentIds } = req.body;
            const data = await attendance_service_1.AttendanceService.markAllPresent(tenantId, userId, classLevel, studentIds);
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /attendance/history
     */
    static async getHistory(req, res) {
        try {
            const { tenantId } = req.user;
            const { data, error } = await require('../db/supabase').supabase
                .from('attendance_records')
                .select(`
          *,
          users (name),
          student_attendance (status)
        `)
                .eq('tenant_id', tenantId)
                .order('date', { ascending: false });
            if (error)
                throw error;
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=attendance.controller.js.map