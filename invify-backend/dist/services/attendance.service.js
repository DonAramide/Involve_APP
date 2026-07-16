"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
// src/services/attendance.service.ts
const supabase_1 = require("../db/supabase");
class AttendanceService {
    /**
     * Fetches students for a specific class.
     */
    static async getStudentsByClass(tenantId, classLevel) {
        const { data, error } = await supabase_1.supabase
            .from('students')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('current_class', classLevel)
            .order('full_name', { ascending: true });
        if (error)
            throw error;
        return data;
    }
    /**
     * Fast enrollment of a student.
     */
    static async enrollStudent(tenantId, fullName, classLevel) {
        const { data, error } = await supabase_1.supabase
            .from('students')
            .insert({
            tenant_id: tenantId,
            full_name: fullName,
            current_class: classLevel,
            status: 'active'
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Auto-save (Upsert) attendance status for a student in a session.
     */
    static async upsertStatus(tenantId, teacherId, classLevel, studentId, status, date, lessonNoteId) {
        // 1. Ensure Record Header exists for today/class
        const { data: record, error: recordError } = await supabase_1.supabase
            .from('attendance_records')
            .upsert({
            tenant_id: tenantId,
            teacher_id: teacherId,
            class_level: classLevel,
            date: date || new Date().toISOString().split('T')[0],
            lesson_note_id: lessonNoteId || null
        }, { onConflict: 'tenant_id, class_level, date' })
            .select()
            .single();
        if (recordError)
            throw recordError;
        // 2. Upsert Student Line Item
        const { data: attendance, error: attrError } = await supabase_1.supabase
            .from('student_attendance')
            .upsert({
            record_id: record.id,
            student_id: studentId,
            status: status,
            updated_at: new Date().toISOString()
        }, { onConflict: 'record_id, student_id' })
            .select()
            .single();
        if (attrError)
            throw attrError;
        return attendance;
    }
    /**
     * Bulk mark all present for a session.
     */
    static async markAllPresent(tenantId, teacherId, classLevel, studentIds) {
        // 1. Ensure Record Header
        const { data: record } = await supabase_1.supabase
            .from('attendance_records')
            .upsert({
            tenant_id: tenantId,
            teacher_id: teacherId,
            class_level: classLevel,
            date: new Date().toISOString().split('T')[0]
        }, { onConflict: 'tenant_id, class_level, date' })
            .select()
            .single();
        if (!record)
            throw new Error('Failed to create attendance session');
        // 2. Bulk Upsert Line Items
        const items = studentIds.map(sid => ({
            record_id: record.id,
            student_id: sid,
            status: 'present',
            updated_at: new Date().toISOString()
        }));
        const { error } = await supabase_1.supabase
            .from('student_attendance')
            .upsert(items, { onConflict: 'record_id, student_id' });
        if (error)
            throw error;
        return { status: 'success' };
    }
}
exports.AttendanceService = AttendanceService;
//# sourceMappingURL=attendance.service.js.map