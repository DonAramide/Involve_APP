import { ClassReport, AttendanceStatus } from '../modules/attendance/attendance-calculator';
export interface AttendanceEntryInput {
    studentId: string;
    studentName?: string;
    admissionNumber?: string;
    status: AttendanceStatus;
    notes?: string;
}
export interface SaveRegisterPayload {
    className: string;
    date: string;
    teacherId?: string;
    teacherName?: string;
    subjectName?: string;
    academicYear?: string;
    term?: string;
    status?: 'draft' | 'finalized';
    entries: AttendanceEntryInput[];
}
export declare class AttendanceService {
    /**
     * Fast student list for a class (checks both students table & school_entities sync).
     */
    static getStudentsByClass(tenantId: string, className: string): Promise<any[]>;
    /**
     * Fast student enrollment for quick setup.
     */
    static enrollStudent(tenantId: string, fullName: string, classLevel: string, admissionNumber?: string): Promise<any>;
    /**
     * Retrieve tenant-specific attendance settings or system defaults.
     */
    static getSettings(tenantId: string): Promise<any>;
    /**
     * Update or initialize attendance settings.
     */
    static updateSettings(tenantId: string, updates: {
        minimum_attendance_threshold?: number;
        policy_present?: string;
        policy_late?: string;
        policy_excused?: string;
        policy_absent?: string;
        instructional_weekdays?: number[];
    }): Promise<any>;
    /**
     * List calendar non-instructional dates / holidays.
     */
    static listCalendarExceptions(tenantId: string): Promise<any[]>;
    /**
     * Add calendar exception.
     */
    static addCalendarException(tenantId: string, exceptionDate: string, description: string, isInstructional?: boolean): Promise<any>;
    /**
     * Delete calendar exception.
     */
    static deleteCalendarException(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    /**
     * Teacher-to-class assignments list.
     */
    static listAssignments(tenantId: string): Promise<any[]>;
    /**
     * Create or update teacher-to-class assignment.
     */
    static createAssignment(tenantId: string, payload: {
        className: string;
        teacherName: string;
        teacherUserId?: string;
        subjectName?: string;
        classId?: string;
    }): Promise<any>;
    /**
     * Delete assignment.
     */
    static deleteAssignment(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    /**
     * Enforce teacher authorization for class marking.
     * Super admins, school admins, owners have universal school access.
     * Teachers must have an assignment matching their name or user ID.
     */
    static checkTeacherClassAccess(tenantId: string, user: any, className: string): Promise<boolean>;
    /**
     * Load attendance register (session + student entries) for a specific class and date.
     */
    static getRegister(tenantId: string, className: string, date: string, subjectName?: string): Promise<{
        session: any;
        className: string;
        date: string;
        subjectName: string | null;
        students: any[];
        isFinalized: boolean;
    }>;
    /**
     * Save or finalize attendance register with transaction protection and audit logging.
     */
    static saveRegister(tenantId: string, user: any, payload: SaveRegisterPayload): Promise<{
        success: boolean;
        sessionId: any;
        status: "draft" | "finalized";
    }>;
    /**
     * Authorized correction of a finalized attendance entry.
     */
    static correctEntry(tenantId: string, user: any, payload: {
        sessionId: string;
        studentId: string;
        newStatus: AttendanceStatus;
        reason: string;
    }): Promise<{
        success: boolean;
        entry: any;
    }>;
    /**
     * Authoritative Class Attendance Report calculation.
     * Reproduces the information hierarchy of reference image 1.
     */
    static getClassReport(tenantId: string, filters: {
        className: string;
        periodFrom: string;
        periodTo: string;
        subjectName?: string;
    }): Promise<ClassReport & {
        schoolName: string;
        teacherName?: string;
    }>;
    /**
     * Student attendance history (for individual student & guardian portal).
     */
    static getStudentHistory(tenantId: string, studentId: string, filters: {
        periodFrom: string;
        periodTo: string;
    }): Promise<{
        student: {
            id: any;
            fullName: any;
            admissionNumber: any;
            className: any;
        };
        summary: import("../modules/attendance/attendance-calculator").StudentSummary;
        dailyLogs: any[];
    }>;
}
