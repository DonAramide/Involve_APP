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

export const DEFAULT_POLICY: AttendancePolicy = Object.freeze({
  present: 'attended',
  late: 'attended',
  excused: 'excluded',
  absent: 'absent',
});

export const DEFAULT_THRESHOLD_PERCENT = 80;
/** ISO weekday numbers: 1 = Monday ... 7 = Sunday. */
export const DEFAULT_INSTRUCTIONAL_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5];

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
  month: string; // YYYY-MM
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

/* ------------------------------ date helpers ------------------------------ */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string, label = 'date'): void {
  if (!ISO_RE.test(value)) throw new Error(`Invalid ${label}: expected YYYY-MM-DD, got "${value}"`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${label}: "${value}" is not a real calendar date`);
  }
}

function toUtc(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function isoWeekday(d: Date): number {
  const w = d.getUTCDay();
  return w === 0 ? 7 : w;
}

/** Inclusive list of ISO dates from..to. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  if (from > to) return out;
  for (let d = toUtc(from); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86400000)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Instructional dates for a period, after weekday and holiday exclusions. */
export function instructionalDatesBetween(
  from: string,
  to: string,
  nonInstructional: Iterable<string> = [],
  weekdays: readonly number[] = DEFAULT_INSTRUCTIONAL_WEEKDAYS,
): string[] {
  const blocked = new Set(nonInstructional);
  const allowed = new Set(weekdays);
  return eachDate(from, to).filter((d) => allowed.has(isoWeekday(toUtc(d))) && !blocked.has(d));
}

/* ------------------------------ core maths -------------------------------- */

function emptyCounts(): StatusCounts {
  return { present: 0, late: 0, excused: 0, absent: 0, unrecorded: 0 };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function finalize(counts: StatusCounts, attended: number, denominator: number): RateResult {
  const eligibleDays = counts.present + counts.late + counts.excused + counts.absent + counts.unrecorded;
  const recordedDays = eligibleDays - counts.unrecorded;
  const raw = denominator > 0 ? (attended / denominator) * 100 : null;
  return {
    ratePercent: raw === null ? null : round1(raw),
    rawPercent: raw,
    attended,
    denominator,
    counts,
    eligibleDays,
    recordedDays,
    unrecordedDays: counts.unrecorded,
  };
}

function monthOf(date: string): string {
  return date.slice(0, 7);
}

interface Accumulator {
  counts: StatusCounts;
  attended: number;
  denominator: number;
}

function newAcc(): Accumulator {
  return { counts: emptyCounts(), attended: 0, denominator: 0 };
}

function addOutcome(acc: Accumulator, outcome: DayOutcome, policy: AttendancePolicy): void {
  acc.counts[outcome] += 1;
  if (outcome === 'unrecorded') return;
  const c = policy[outcome];
  if (c === 'attended') {
    acc.attended += 1;
    acc.denominator += 1;
  } else if (c === 'absent') {
    acc.denominator += 1;
  }
}

function mergeInto(target: Accumulator, src: Accumulator): void {
  (Object.keys(target.counts) as (keyof StatusCounts)[]).forEach((k) => {
    target.counts[k] += src.counts[k];
  });
  target.attended += src.attended;
  target.denominator += src.denominator;
}

/** Intersect a student's enrollment window with the reporting period. */
export function eligibleWindow(
  student: CalcStudent,
  periodFrom: string,
  periodTo: string,
): { from: string; to: string } | null {
  const from = student.enrolledFrom && student.enrolledFrom > periodFrom ? student.enrolledFrom : periodFrom;
  const to = student.enrolledTo && student.enrolledTo < periodTo ? student.enrolledTo : periodTo;
  return from > to ? null : { from, to };
}

/**
 * Compute the full class report. Everything shown anywhere (screen, PDF, history)
 * must be derived from this function.
 */
export function computeClassReport(input: CalcInput): ClassReport {
  assertIsoDate(input.periodFrom, 'periodFrom');
  assertIsoDate(input.periodTo, 'periodTo');
  if (input.periodFrom > input.periodTo) throw new Error('periodFrom must not be after periodTo');

  const policy: AttendancePolicy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const threshold = input.thresholdPercent ?? DEFAULT_THRESHOLD_PERCENT;
  if (!(threshold >= 0 && threshold <= 100)) throw new Error('thresholdPercent must be between 0 and 100');

  const dates = instructionalDatesBetween(
    input.periodFrom,
    input.periodTo,
    input.nonInstructionalDates || [],
    input.instructionalWeekdays || DEFAULT_INSTRUCTIONAL_WEEKDAYS,
  );

  // Index entries by student|date. Duplicates are a data-integrity error upstream
  // (DB unique constraint); here the last one wins deterministically.
  const entryIndex = new Map<string, AttendanceStatus>();
  for (const e of input.entries) entryIndex.set(`${e.studentId}|${e.date}`, e.status);

  const classByMonth = new Map<string, Accumulator>();
  const classAll = newAcc();
  const instructionalByMonth = new Map<string, number>();
  for (const d of dates) instructionalByMonth.set(monthOf(d), (instructionalByMonth.get(monthOf(d)) || 0) + 1);

  const usedKeys = new Set<string>();
  const students: StudentSummary[] = input.students.map((s) => {
    const win = eligibleWindow(s, input.periodFrom, input.periodTo);
    const sAll = newAcc();
    const sMonths = new Map<string, Accumulator>();
    if (win) {
      for (const d of dates) {
        if (d < win.from || d > win.to) continue;
        const key = `${s.id}|${d}`;
        const status = entryIndex.get(key);
        if (status) usedKeys.add(key);
        const outcome: DayOutcome = status ?? 'unrecorded';
        addOutcome(sAll, outcome, policy);
        const m = monthOf(d);
        if (!sMonths.has(m)) sMonths.set(m, newAcc());
        addOutcome(sMonths.get(m)!, outcome, policy);
        if (!classByMonth.has(m)) classByMonth.set(m, newAcc());
        addOutcome(classByMonth.get(m)!, outcome, policy);
      }
    }
    mergeInto(classAll, sAll);
    const overall = finalize(sAll.counts, sAll.attended, sAll.denominator);
    const months: Record<string, RateResult> = {};
    sMonths.forEach((acc, m) => {
      months[m] = finalize(acc.counts, acc.attended, acc.denominator);
    });
    return {
      studentId: s.id,
      overall,
      months,
      belowThreshold: overall.rawPercent !== null && overall.rawPercent < threshold,
    };
  });

  const monthKeys = Array.from(instructionalByMonth.keys()).sort();
  const months: MonthSummary[] = monthKeys.map((m) => {
    const acc = classByMonth.get(m) || newAcc();
    return { month: m, instructionalDays: instructionalByMonth.get(m) || 0, ...finalize(acc.counts, acc.attended, acc.denominator) };
  });

  const overall = finalize(classAll.counts, classAll.attended, classAll.denominator);
  const ignoredEntries = input.entries.filter((e) => !usedKeys.has(`${e.studentId}|${e.date}`)).length;

  return {
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    thresholdPercent: threshold,
    policy,
    enrolledStudents: input.students.length,
    instructionalDays: dates.length,
    instructionalDates: dates,
    overall,
    months,
    students,
    belowThresholdCount: students.filter((s) => s.belowThreshold).length,
    ignoredEntries,
    hasAnyRecords: overall.recordedDays > 0,
  };
}

/** Convenience wrapper for the student history view (one student, same rules). */
export function computeStudentSummary(
  student: CalcStudent,
  input: Omit<CalcInput, 'students' | 'entries'> & { entries: CalcEntry[] },
): StudentSummary {
  const report = computeClassReport({ ...input, students: [student], entries: input.entries.filter((e) => e.studentId === student.id) });
  return report.students[0];
}
