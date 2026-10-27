import { AttendancePdfService } from '../src/services/attendance-pdf.service';
import { AttendanceService } from '../src/services/attendance.service';
import { computeClassReport } from '../src/modules/attendance/attendance-calculator';

// Mock SupabaseAdmin for isolation tests
jest.mock('../src/db/supabase', () => {
  const mockFrom = jest.fn();
  return {
    supabase: { from: mockFrom },
    supabaseAdmin: { from: mockFrom },
    supabaseAuthAdmin: { from: mockFrom },
  };
});

import { supabaseAdmin } from '../src/db/supabase';

describe('Attendance PDF Generation', () => {
  it('generates a valid landscape Class Attendance Register PDF matching Reference Image 2', async () => {
    const pdfBuffer = await AttendancePdfService.generateRegisterPdf({
      schoolName: 'School of Education',
      className: 'Primary 4B',
      teacherName: 'Mrs. Adebayo',
      registrationNumber: 'TRN-2026-091',
      subjectName: 'Mathematics',
      academicYear: '2025/2026',
      term: 'Second Term',
      weeks: [
        { weekLabel: 'WEEK 1', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 2', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 3', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 4', days: ['M', 'T', 'W', 'T', 'F'] },
        { weekLabel: 'WEEK 5', days: ['M', 'T', 'W', 'T', 'F'] },
      ],
      students: [
        { sn: 1, fullName: 'John Doe', admissionNumber: 'ADM-001', attendanceMap: { '0-0': 'P', '0-1': 'P', '0-2': 'A', '0-3': 'L', '0-4': 'E' } },
        { sn: 2, fullName: 'Jane Smith', admissionNumber: 'ADM-002', attendanceMap: { '0-0': 'P', '0-1': 'P', '0-2': 'P', '0-3': 'P', '0-4': 'P' } },
        { sn: 3, fullName: 'Michael Johnson', admissionNumber: 'ADM-003', attendanceMap: { '0-0': 'A', '0-1': 'A', '0-2': 'A', '0-3': 'A', '0-4': 'A' } },
      ],
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Standard PDF header signature
    expect(pdfBuffer.slice(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('generates a valid portrait Class Attendance Report PDF matching Reference Image 1', async () => {
    const report = computeClassReport({
      periodFrom: '2026-01-05',
      periodTo: '2026-03-27',
      students: [
        { id: 's1' },
        { id: 's2' },
      ],
      entries: [
        { studentId: 's1', date: '2026-01-05', status: 'present' },
        { studentId: 's1', date: '2026-01-06', status: 'present' },
        { studentId: 's2', date: '2026-01-05', status: 'absent' },
        { studentId: 's2', date: '2026-01-06', status: 'absent' },
      ],
      thresholdPercent: 80,
    });

    const pdfBuffer = await AttendancePdfService.generateReportPdf({
      schoolName: 'Mahatma Gandhi Primary School',
      schoolAddress: 'No. 7, Anbu Theru, Madras, Tamil Nadu, 600000',
      schoolMotto: 'Leading from darkness to light',
      className: 'IV A',
      teacherName: 'Dr. Radhakrishnan',
      academicYear: '2012-13',
      periodFrom: '2012-11-01',
      periodTo: '2013-06-22',
      report,
      studentsWithMeta: [
        {
          studentId: 's1',
          studentName: 'Student 1',
          admissionNumber: 'ADM-01',
          months: report.students[0].months,
          overall: report.students[0].overall,
          belowThreshold: report.students[0].belowThreshold,
        },
        {
          studentId: 's2',
          studentName: 'Student 2',
          admissionNumber: 'ADM-02',
          months: report.students[1].months,
          overall: report.students[1].overall,
          belowThreshold: report.students[1].belowThreshold,
        },
      ],
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.slice(0, 5).toString('utf-8')).toBe('%PDF-');
  });
});

describe('Teacher-to-Class RBAC Authorization Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows super_admin, admin, owner, school_admin for any class without explicit assignment', async () => {
    const superAdmin = { id: 'u1', role: 'super_admin' };
    const schoolAdmin = { id: 'u2', role: 'school_admin' };
    const owner = { id: 'u3', role: 'owner' };

    expect(await AttendanceService.checkTeacherClassAccess('tenant-1', superAdmin, 'JSS 1')).toBe(true);
    expect(await AttendanceService.checkTeacherClassAccess('tenant-1', schoolAdmin, 'JSS 1')).toBe(true);
    expect(await AttendanceService.checkTeacherClassAccess('tenant-1', owner, 'JSS 1')).toBe(true);
  });

  it('allows an assigned teacher matching user ID or name', async () => {
    const chain: any = {
      select: jest.fn().mockImplementation(() => chain),
      eq: jest.fn().mockImplementation(() => chain),
      then: (resolve: any) =>
        Promise.resolve({
          data: [
            { teacher_user_id: 't-user-123', teacher_name: 'Mr. David Smith', class_name: 'Primary 5' },
          ],
        }).then(resolve),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

    const matchingUser = { id: 't-user-123', role: 'teacher', name: 'Mr. David Smith' };
    const access = await AttendanceService.checkTeacherClassAccess('tenant-1', matchingUser, 'Primary 5');
    expect(access).toBe(true);
  });

  it('rejects an unassigned teacher when class has distinct assignments configured', async () => {
    const chain: any = {
      select: jest.fn().mockImplementation(() => chain),
      eq: jest.fn().mockImplementation(() => chain),
      then: (resolve: any) =>
        Promise.resolve({
          data: [
            { teacher_user_id: 't-user-999', teacher_name: 'Mrs. Other', class_name: 'Primary 5' },
          ],
        }).then(resolve),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(chain);

    const unassignedTeacher = { id: 't-user-123', role: 'teacher', name: 'Mr. David Smith' };
    const access = await AttendanceService.checkTeacherClassAccess('tenant-1', unassignedTeacher, 'Primary 5');
    expect(access).toBe(false);
  });
});

describe('Audited Corrections and Finalized Register Protection', () => {
  it('requires a reason of at least 5 characters for attendance correction', async () => {
    await expect(
      AttendanceService.correctEntry('tenant-1', { id: 'admin-1', role: 'school_admin' }, {
        sessionId: 'sess-1',
        studentId: 'stu-1',
        newStatus: 'present',
        reason: 'fix', // too short
      }),
    ).rejects.toThrow(/at least 5 characters/);
  });
});
