export declare class AttendanceService {
    /**
     * Fetches students for a specific class.
     */
    static getStudentsByClass(tenantId: string, classLevel: string): Promise<any[]>;
    /**
     * Fast enrollment of a student.
     */
    static enrollStudent(tenantId: string, fullName: string, classLevel: string): Promise<any>;
    /**
     * Auto-save (Upsert) attendance status for a student in a session.
     */
    static upsertStatus(tenantId: string, teacherId: string, classLevel: string, studentId: string, status: string, date: string, lessonNoteId?: string): Promise<any>;
    /**
     * Bulk mark all present for a session.
     */
    static markAllPresent(tenantId: string, teacherId: string, classLevel: string, studentIds: string[]): Promise<{
        status: string;
    }>;
}
