import {
  computeClassReport,
  computeStudentSummary,
  instructionalDatesBetween,
  CalcEntry,
  AttendanceStatus,
} from '../src/modules/attendance/attendance-calculator';

// Isolated synthetic fixtures only — no real student data.
// Reference week: Mon 2026-03-02 .. Fri 2026-03-06, next week 03-09 .. 03-13.
const WEEK1 = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06'];
const WEEK2 = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'];

function entries(studentId: string, dates: string[], status: AttendanceStatus): CalcEntry[] {
  return dates.map((date) => ({ studentId, date, status }));
}

describe('attendance calculator — working days', () => {
  it('excludes weekends', () => {
    const d = instructionalDatesBetween('2026-03-02', '2026-03-08');
    expect(d).toEqual(WEEK1);
  });

  it('excludes school holidays / non-instructional dates', () => {
    const d = instructionalDatesBetween('2026-03-02', '2026-03-06', ['2026-03-04']);
    expect(d).toHaveLength(4);
    expect(d).not.toContain('2026-03-04');
  });

  it('honours a custom instructional weekday set', () => {
    const d = instructionalDatesBetween('2026-03-02', '2026-03-08', [], [1, 2, 3, 4, 5, 6]);
    expect(d).toHaveLength(6);
  });

  it('rejects invalid dates', () => {
    expect(() =>
      computeClassReport({ periodFrom: '2026-02-30', periodTo: '2026-03-06', students: [], entries: [] }),
    ).toThrow(/not a real calendar date/);
  });
});

describe('attendance calculator — rates', () => {
  it('computes a simple perfect and partial rate', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }, { id: 'b' }],
      entries: [
        ...entries('a', WEEK1, 'present'),
        ...entries('b', WEEK1.slice(0, 4), 'present'),
        ...entries('b', [WEEK1[4]], 'absent'),
      ],
    });
    expect(r.instructionalDays).toBe(5);
    expect(r.students.find((s) => s.studentId === 'a')!.overall.ratePercent).toBe(100);
    expect(r.students.find((s) => s.studentId === 'b')!.overall.ratePercent).toBe(80);
    // pooled: 9 attended / 10
    expect(r.overall.ratePercent).toBe(90);
    expect(r.overall.denominator).toBe(10);
  });

  it('counts Late as attended by default', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 3), 'present'), ...entries('a', WEEK1.slice(3), 'late')],
    });
    expect(r.students[0].overall.ratePercent).toBe(100);
    expect(r.students[0].overall.counts.late).toBe(2);
  });

  it('can be configured so Late counts against attendance', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 3), 'present'), ...entries('a', WEEK1.slice(3), 'late')],
      policy: { late: 'absent' },
    });
    expect(r.students[0].overall.ratePercent).toBe(60);
  });

  it('excludes Excused from the denominator by default (not penalised)', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 4), 'present'), ...entries('a', [WEEK1[4]], 'excused')],
    });
    const o = r.students[0].overall;
    expect(o.ratePercent).toBe(100);
    expect(o.denominator).toBe(4);
    expect(o.counts.excused).toBe(1);
  });

  it('can count Excused as attended or as absent via policy', () => {
    const base = {
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 4), 'present'), ...entries('a', [WEEK1[4]], 'excused')],
    };
    expect(computeClassReport({ ...base, policy: { excused: 'attended' } }).students[0].overall.ratePercent).toBe(100);
    expect(computeClassReport({ ...base, policy: { excused: 'absent' } }).students[0].overall.ratePercent).toBe(80);
  });

  it('does not exclude an excused-only student into a fake 0%: rate is unavailable', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[0],
      students: [{ id: 'a' }],
      entries: entries('a', [WEEK1[0]], 'excused'),
    });
    expect(r.students[0].overall.ratePercent).toBeNull();
    expect(r.students[0].belowThreshold).toBe(false);
  });
});

describe('attendance calculator — unrecorded vs absent', () => {
  it('does not treat unmarked days as absences', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: entries('a', WEEK1.slice(0, 2), 'present'), // 3 days unmarked
    });
    const o = r.students[0].overall;
    expect(o.ratePercent).toBe(100);
    expect(o.counts.absent).toBe(0);
    expect(o.unrecordedDays).toBe(3);
    expect(o.recordedDays).toBe(2);
    expect(o.eligibleDays).toBe(5);
  });

  it('returns null (not NaN / not 0) when nothing is recorded, and reports empty state', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }, { id: 'b' }],
      entries: [],
    });
    expect(r.overall.ratePercent).toBeNull();
    expect(r.hasAnyRecords).toBe(false);
    expect(r.belowThresholdCount).toBe(0);
    expect(r.overall.unrecordedDays).toBe(10);
    r.months.forEach((m) => expect(m.ratePercent).toBeNull());
  });

  it('handles an empty class and zero instructional days safely', () => {
    const r = computeClassReport({
      periodFrom: '2026-03-07', // Saturday
      periodTo: '2026-03-08', // Sunday
      students: [{ id: 'a' }],
      entries: [],
    });
    expect(r.instructionalDays).toBe(0);
    expect(r.overall.ratePercent).toBeNull();
    expect(r.months).toEqual([]);
  });
});

describe('attendance calculator — holidays', () => {
  it('ignores entries recorded on a holiday and excludes the day from totals', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 3), 'present'), ...entries('a', [WEEK1[3]], 'absent')],
      nonInstructionalDates: [WEEK1[3]],
    });
    expect(r.instructionalDays).toBe(4);
    expect(r.students[0].overall.counts.absent).toBe(0);
    expect(r.students[0].overall.ratePercent).toBe(100);
    expect(r.ignoredEntries).toBe(1);
  });
});

describe('attendance calculator — enrollment windows', () => {
  it('does not count days before a mid-term joiner enrolled', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK2[4],
      students: [{ id: 'new', enrolledFrom: WEEK2[0] }],
      entries: [...entries('new', WEEK1, 'absent'), ...entries('new', WEEK2, 'present')],
    });
    const o = r.students[0].overall;
    expect(o.eligibleDays).toBe(5);
    expect(o.counts.absent).toBe(0);
    expect(o.ratePercent).toBe(100);
    expect(r.ignoredEntries).toBe(5);
  });

  it('does not count days after a student withdrew/transferred out (inclusive last day)', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK2[4],
      students: [{ id: 'gone', enrolledTo: WEEK1[2] }],
      entries: [...entries('gone', WEEK1.slice(0, 3), 'present'), ...entries('gone', WEEK1.slice(3), 'absent')],
    });
    const o = r.students[0].overall;
    expect(o.eligibleDays).toBe(3);
    expect(o.unrecordedDays).toBe(0);
    expect(o.ratePercent).toBe(100);
  });

  it('gives a student with a window entirely outside the period no data', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'x', enrolledFrom: '2026-06-01' }],
      entries: [],
    });
    expect(r.students[0].overall.eligibleDays).toBe(0);
    expect(r.students[0].overall.ratePercent).toBeNull();
  });

  it('keeps class pooled rate consistent when students have different windows', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK2[4],
      students: [{ id: 'full' }, { id: 'late-joiner', enrolledFrom: WEEK2[0] }],
      entries: [...entries('full', [...WEEK1, ...WEEK2], 'present'), ...entries('late-joiner', WEEK2, 'absent')],
    });
    // 10 attended of 10 + 0 attended of 5 => 10/15
    expect(r.overall.attended).toBe(10);
    expect(r.overall.denominator).toBe(15);
    expect(r.overall.ratePercent).toBe(66.7);
  });
});

describe('attendance calculator — monthly and overall consistency', () => {
  const entriesAcrossMonths: CalcEntry[] = [
    // Feb 2026: 2026-02-26 (Thu), 02-27 (Fri). Mar: 03-02 (Mon), 03-03 (Tue)
    { studentId: 'a', date: '2026-02-26', status: 'present' },
    { studentId: 'a', date: '2026-02-27', status: 'absent' },
    { studentId: 'a', date: '2026-03-02', status: 'present' },
    { studentId: 'a', date: '2026-03-03', status: 'present' },
  ];

  it('splits instructional days and rates per month and ties to overall', () => {
    const r = computeClassReport({
      periodFrom: '2026-02-26',
      periodTo: '2026-03-03',
      students: [{ id: 'a' }],
      entries: entriesAcrossMonths,
    });
    expect(r.months.map((m) => [m.month, m.instructionalDays, m.ratePercent])).toEqual([
      ['2026-02', 2, 50],
      ['2026-03', 2, 100],
    ]);
    expect(r.overall.ratePercent).toBe(75);
    const sumAttended = r.months.reduce((a, m) => a + m.attended, 0);
    const sumDen = r.months.reduce((a, m) => a + m.denominator, 0);
    expect(sumAttended).toBe(r.overall.attended);
    expect(sumDen).toBe(r.overall.denominator);
    expect(r.students[0].months['2026-02'].ratePercent).toBe(50);
  });
});

describe('attendance calculator — threshold', () => {
  it('flags only students strictly below the 80% default and uses unrounded value', () => {
    const r = computeClassReport({
      periodFrom: WEEK1[0],
      periodTo: WEEK2[4],
      students: [{ id: 'exact80' }, { id: 'below' }],
      entries: [
        ...entries('exact80', [...WEEK1, ...WEEK2].slice(0, 8), 'present'),
        ...entries('exact80', [...WEEK1, ...WEEK2].slice(8), 'absent'),
        ...entries('below', [...WEEK1, ...WEEK2].slice(0, 7), 'present'),
        ...entries('below', [...WEEK1, ...WEEK2].slice(7), 'absent'),
      ],
    });
    expect(r.students.find((s) => s.studentId === 'exact80')!.belowThreshold).toBe(false);
    expect(r.students.find((s) => s.studentId === 'below')!.belowThreshold).toBe(true);
    expect(r.belowThresholdCount).toBe(1);
  });

  it('respects a configured threshold and validates the range', () => {
    const base = {
      periodFrom: WEEK1[0],
      periodTo: WEEK1[4],
      students: [{ id: 'a' }],
      entries: [...entries('a', WEEK1.slice(0, 4), 'present'), ...entries('a', [WEEK1[4]], 'absent')],
    };
    expect(computeClassReport({ ...base, thresholdPercent: 85 }).belowThresholdCount).toBe(1);
    expect(() => computeClassReport({ ...base, thresholdPercent: 101 })).toThrow();
  });
});

describe('attendance calculator — student summary shares the class rules', () => {
  it('produces the same figure for a student as the class report', () => {
    const all = [...entries('a', WEEK1.slice(0, 4), 'present'), ...entries('a', [WEEK1[4]], 'absent'), ...entries('b', WEEK1, 'present')];
    const common = { periodFrom: WEEK1[0], periodTo: WEEK1[4] };
    const cls = computeClassReport({ ...common, students: [{ id: 'a' }, { id: 'b' }], entries: all });
    const one = computeStudentSummary({ id: 'a' }, { ...common, entries: all });
    expect(one.overall.ratePercent).toBe(cls.students[0].overall.ratePercent);
  });
});

describe('attendance calculator — large class', () => {
  it('handles 500 students over a term without error', () => {
    const students = Array.from({ length: 500 }, (_, i) => ({ id: `s${i}` }));
    const dates = instructionalDatesBetween('2026-01-05', '2026-03-27');
    const all: CalcEntry[] = [];
    students.forEach((s) => dates.forEach((date) => all.push({ studentId: s.id, date, status: 'present' })));
    const r = computeClassReport({ periodFrom: '2026-01-05', periodTo: '2026-03-27', students, entries: all });
    expect(r.students).toHaveLength(500);
    expect(r.overall.ratePercent).toBe(100);
  });
});
