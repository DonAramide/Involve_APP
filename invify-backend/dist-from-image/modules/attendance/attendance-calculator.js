"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INSTRUCTIONAL_WEEKDAYS = exports.DEFAULT_THRESHOLD_PERCENT = exports.DEFAULT_POLICY = void 0;
exports.assertIsoDate = assertIsoDate;
exports.eachDate = eachDate;
exports.instructionalDatesBetween = instructionalDatesBetween;
exports.eligibleWindow = eligibleWindow;
exports.computeClassReport = computeClassReport;
exports.computeStudentSummary = computeStudentSummary;
exports.DEFAULT_POLICY = Object.freeze({
    present: 'attended',
    late: 'attended',
    excused: 'excluded',
    absent: 'absent',
});
exports.DEFAULT_THRESHOLD_PERCENT = 80;
/** ISO weekday numbers: 1 = Monday ... 7 = Sunday. */
exports.DEFAULT_INSTRUCTIONAL_WEEKDAYS = [1, 2, 3, 4, 5];
/* ------------------------------ date helpers ------------------------------ */
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function assertIsoDate(value, label = 'date') {
    if (!ISO_RE.test(value))
        throw new Error(`Invalid ${label}: expected YYYY-MM-DD, got "${value}"`);
    const d = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
        throw new Error(`Invalid ${label}: "${value}" is not a real calendar date`);
    }
}
function toUtc(value) {
    return new Date(`${value}T00:00:00Z`);
}
function isoWeekday(d) {
    const w = d.getUTCDay();
    return w === 0 ? 7 : w;
}
/** Inclusive list of ISO dates from..to. */
function eachDate(from, to) {
    const out = [];
    if (from > to)
        return out;
    for (let d = toUtc(from); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86400000)) {
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
}
/** Instructional dates for a period, after weekday and holiday exclusions. */
function instructionalDatesBetween(from, to, nonInstructional = [], weekdays = exports.DEFAULT_INSTRUCTIONAL_WEEKDAYS) {
    const blocked = new Set(nonInstructional);
    const allowed = new Set(weekdays);
    return eachDate(from, to).filter((d) => allowed.has(isoWeekday(toUtc(d))) && !blocked.has(d));
}
/* ------------------------------ core maths -------------------------------- */
function emptyCounts() {
    return { present: 0, late: 0, excused: 0, absent: 0, unrecorded: 0 };
}
function round1(n) {
    return Math.round(n * 10) / 10;
}
function finalize(counts, attended, denominator) {
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
function monthOf(date) {
    return date.slice(0, 7);
}
function newAcc() {
    return { counts: emptyCounts(), attended: 0, denominator: 0 };
}
function addOutcome(acc, outcome, policy) {
    acc.counts[outcome] += 1;
    if (outcome === 'unrecorded')
        return;
    const c = policy[outcome];
    if (c === 'attended') {
        acc.attended += 1;
        acc.denominator += 1;
    }
    else if (c === 'absent') {
        acc.denominator += 1;
    }
}
function mergeInto(target, src) {
    Object.keys(target.counts).forEach((k) => {
        target.counts[k] += src.counts[k];
    });
    target.attended += src.attended;
    target.denominator += src.denominator;
}
/** Intersect a student's enrollment window with the reporting period. */
function eligibleWindow(student, periodFrom, periodTo) {
    const from = student.enrolledFrom && student.enrolledFrom > periodFrom ? student.enrolledFrom : periodFrom;
    const to = student.enrolledTo && student.enrolledTo < periodTo ? student.enrolledTo : periodTo;
    return from > to ? null : { from, to };
}
/**
 * Compute the full class report. Everything shown anywhere (screen, PDF, history)
 * must be derived from this function.
 */
function computeClassReport(input) {
    assertIsoDate(input.periodFrom, 'periodFrom');
    assertIsoDate(input.periodTo, 'periodTo');
    if (input.periodFrom > input.periodTo)
        throw new Error('periodFrom must not be after periodTo');
    const policy = { ...exports.DEFAULT_POLICY, ...(input.policy || {}) };
    const threshold = input.thresholdPercent ?? exports.DEFAULT_THRESHOLD_PERCENT;
    if (!(threshold >= 0 && threshold <= 100))
        throw new Error('thresholdPercent must be between 0 and 100');
    const dates = instructionalDatesBetween(input.periodFrom, input.periodTo, input.nonInstructionalDates || [], input.instructionalWeekdays || exports.DEFAULT_INSTRUCTIONAL_WEEKDAYS);
    // Index entries by student|date. Duplicates are a data-integrity error upstream
    // (DB unique constraint); here the last one wins deterministically.
    const entryIndex = new Map();
    for (const e of input.entries)
        entryIndex.set(`${e.studentId}|${e.date}`, e.status);
    const classByMonth = new Map();
    const classAll = newAcc();
    const instructionalByMonth = new Map();
    for (const d of dates)
        instructionalByMonth.set(monthOf(d), (instructionalByMonth.get(monthOf(d)) || 0) + 1);
    const usedKeys = new Set();
    const students = input.students.map((s) => {
        const win = eligibleWindow(s, input.periodFrom, input.periodTo);
        const sAll = newAcc();
        const sMonths = new Map();
        if (win) {
            for (const d of dates) {
                if (d < win.from || d > win.to)
                    continue;
                const key = `${s.id}|${d}`;
                const status = entryIndex.get(key);
                if (status)
                    usedKeys.add(key);
                const outcome = status ?? 'unrecorded';
                addOutcome(sAll, outcome, policy);
                const m = monthOf(d);
                if (!sMonths.has(m))
                    sMonths.set(m, newAcc());
                addOutcome(sMonths.get(m), outcome, policy);
                if (!classByMonth.has(m))
                    classByMonth.set(m, newAcc());
                addOutcome(classByMonth.get(m), outcome, policy);
            }
        }
        mergeInto(classAll, sAll);
        const overall = finalize(sAll.counts, sAll.attended, sAll.denominator);
        const months = {};
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
    const months = monthKeys.map((m) => {
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
function computeStudentSummary(student, input) {
    const report = computeClassReport({ ...input, students: [student], entries: input.entries.filter((e) => e.studentId === student.id) });
    return report.students[0];
}
//# sourceMappingURL=attendance-calculator.js.map