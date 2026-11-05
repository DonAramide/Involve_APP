/**
 * Attendance calculator — the single source of truth for attendance figures.
 *
 * Pure functions only (no database, no clock, no I/O) so that the REST API,
 * on-screen report and PDF export always agree.
 *
 * RULES (documented school policy)
 * --------------------------------
 * 1. Instructional day = a date inside the reporting period that falls on a
 *    configured instructional weekday (default Mon–Fri) and is NOT listed as a
 *    non-instructional date (holiday, closure, exam break...).
 * 2. A student's eligible days are the instructional days inside
 *    [max(period.from, enrolledFrom), min(period.to, enrolledTo)].
 *    Nothing is counted before enrollment or after withdrawal/transfer.
 * 3. Each eligible day resolves to exactly one of:
 *    present | late | excused | absent | unrecorded.
 *    A missing entry is `unrecorded` — it is NEVER treated as an absence.
 *    Entries that fall on non-eligible days are ignored (and counted in
 *    `ignoredEntries` for diagnostics).
 * 4. Policy maps each recorded status to a contribution:
 *      'attended' -> numerator + denominator
 *      'absent'   -> denominator only
 *      'excluded' -> neither (not penalised, not rewarded)
 *    Default: present=attended, late=attended, excused=excluded, absent=absent.
 * 5. rate = attended / (attended + absent), as a percentage.
 *    The denominator is only *recorded, policy-counted* student-days.
 *    If the denominator is 0 the rate is `null` (not recorded) — never 0, never NaN.
 * 6. Class (monthly / overall) rate is POOLED over eligible student-day records:
 *    sum(attended) / sum(denominator) across all students. It is not an average
 *    of rounded student percentages. Monthly and overall use the same function.
 * 7. A student is "below threshold" only when their overall rate is available
 *    and strictly lower than the threshold (default 80). Students with no
 *    recorded data are never flagged; they are reported as `rate: null`.
 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type DayOutcome = AttendanceStatus | 'unrecorded';
export type Contribution = 'attended' | 'absent' | 'excluded';
export interface AttendancePolicy {
    present: Contribution;
    late: Contribution;
    excused: Contribution;
    absent: Contribution;
}
export declare const DEFAULT_POLICY: AttendancePolicy;
export declare const DEFAULT_THRESHOLD_PERCENT = 80;
/** ISO weekday numbers: 1 = Monday ... 7 = Sunday. */
export declare const DEFAULT_INSTRUCTIONAL_WEEKDAYS: readonly number[];
export interface CalcStudent {
    id: string;
    /** ISO date (YYYY-MM-DD). Absent => enrolled for the whole period. */
    enrolledFrom?: string | null;
    /** ISO date (YYYY-MM-DD), inclusive last day. Absent => still enrolled. */
    enrolledTo?: string | null;
}
export interface CalcEntry {
    studentId: string;
    date: string;
    status: AttendanceStatus;
}
export interface CalcInput {
    periodFrom: string;
    periodTo: string;
    students: CalcStudent[];
    entries: CalcEntry[];
    /** Holiday / closure dates (YYYY-MM-DD). */
    nonInstructionalDates?: Iterable<string>;
    instructionalWeekdays?: readonly number[];
    policy?: Partial<AttendancePolicy>;
    thresholdPercent?: number;
}
export interface StatusCounts {
    present: number;
    late: number;
    excused: number;
    absent: number;
    unrecorded: number;
}
export interface RateResult {
    /** Percentage 0–100 rounded to 1 dp, or null when nothing countable was recorded. */
    ratePercent: number | null;
    /** Unrounded percentage (for threshold comparison); null when unavailable. */
    rawPercent: number | null;
    attended: number;
    denominator: number;
    counts: StatusCounts;
    eligibleDays: number;
    recordedDays: number;
    unrecordedDays: number;
}
export interface MonthSummary extends RateResult {
    month: string;
    instructionalDays: number;
}
export interface StudentSummary {
    studentId: string;
    overall: RateResult;
    months: Record<string, RateResult>;
    belowThreshold: boolean;
}
export interface ClassReport {
    periodFrom: string;
    periodTo: string;
    thresholdPercent: number;
    policy: AttendancePolicy;
    enrolledStudents: number;
    instructionalDays: number;
    instructionalDates: string[];
    overall: RateResult;
    months: MonthSummary[];
    students: StudentSummary[];
    belowThresholdCount: number;
    ignoredEntries: number;
    hasAnyRecords: boolean;
}
export declare function assertIsoDate(value: string, label?: string): void;
/** Inclusive list of ISO dates from..to. */
export declare function eachDate(from: string, to: string): string[];
/** Instructional dates for a period, after weekday and holiday exclusions. */
export declare function instructionalDatesBetween(from: string, to: string, nonInstructional?: Iterable<string>, weekdays?: readonly number[]): string[];
/** Intersect a student's enrollment window with the reporting period. */
export declare function eligibleWindow(student: CalcStudent, periodFrom: string, periodTo: string): {
    from: string;
    to: string;
} | null;
/**
 * Compute the full class report. Everything shown anywhere (screen, PDF, history)
 * must be derived from this function.
 */
export declare function computeClassReport(input: CalcInput): ClassReport;
/** Convenience wrapper for the student history view (one student, same rules). */
export declare function computeStudentSummary(student: CalcStudent, input: Omit<CalcInput, 'students' | 'entries'> & {
    entries: CalcEntry[];
}): StudentSummary;
