// src/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  static async listStudents(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;
      const { classLevel } = req.query;
      const data = await AttendanceService.getStudentsByClass(tenantId, classLevel as string);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async enroll(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;
      const { fullName, classLevel } = req.body;
      const data = await AttendanceService.enrollStudent(tenantId, fullName, classLevel);
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async autoSave(req: Request, res: Response) {
    try {
      const { tenantId, id: userId } = (req as any).user;
      const { classLevel, studentId, status, date, lessonNoteId } = req.body;
      const data = await AttendanceService.upsertStatus(tenantId, userId, classLevel, studentId, status, date, lessonNoteId);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async bulkPresent(req: Request, res: Response) {
    try {
      const { tenantId, id: userId } = (req as any).user;
      const { classLevel, studentIds } = req.body;
      const data = await AttendanceService.markAllPresent(tenantId, userId, classLevel, studentIds);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /attendance/history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;
      const { data, error } = await require('../db/supabase').supabase
        .from('attendance_records')
        .select(`
          *,
          users (name),
          student_attendance (status)
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
