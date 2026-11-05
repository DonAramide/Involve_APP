import { ClassReport } from '../modules/attendance/attendance-calculator';
export interface RegisterPdfOptions {
    schoolName: string;
    className: string;
    teacherName?: string;
    registrationNumber?: string;
    subjectName?: string;
    academicYear?: string;
    term?: string;
    weeks?: Array<{
        weekLabel: string;
        days: string[];
    }>;
    students: Array<{
        sn?: number;
        fullName: string;
        admissionNumber?: string;
        attendanceMap?: Record<string, string>;
    }>;
}
export interface ReportPdfOptions {
    schoolName: string;
    schoolAddress?: string;
    schoolMotto?: string;
    className: string;
    teacherName?: string;
    academicYear?: string;
    periodFrom: string;
    periodTo: string;
    report: ClassReport;
    studentsWithMeta: Array<{
        studentId: string;
        studentName: string;
        admissionNumber?: string;
        months: Record<string, {
            ratePercent: number | null;
        }>;
        overall: {
            ratePercent: number | null;
        };
        belowThreshold: boolean;
    }>;
}
export declare class AttendancePdfService {
    /**
     * PDF 1: Weekly Class Attendance Register (A4 Landscape)
     * Matches the visual layout and structure of Reference Image 2.
     */
    static generateRegisterPdf(options: RegisterPdfOptions): Promise<Buffer>;
    /**
     * PDF 2: Class Attendance Report (A4 Portrait)
     * Reproduces the exact visual hierarchy of Reference Image 1.
     */
    static generateReportPdf(options: ReportPdfOptions): Promise<Buffer>;
}
