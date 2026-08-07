import { defineStore } from 'pinia';
import { CrmRepository } from '../../../../repositories/CrmRepository';
import { FinanceRepository } from '../../../../repositories/FinanceRepository';
import { schoolApi } from '../../../../api/index';

function splitName(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || 'Student',
    last: parts.slice(1).join(' ') || '',
  };
}

/** Normalize roster / CRM / students-table shapes into one analytics row. */
function normalizeStudent(raw: any) {
  const nameParts = splitName(raw.name || raw.fullName || '');
  const first =
    raw.first_name ||
    raw.firstName ||
    nameParts.first;
  const last =
    raw.last_name ||
    raw.lastName ||
    nameParts.last;
  const balance = Number(
    raw.running_balance ??
      raw.balance ??
      raw.metadata?.balance ??
      0,
  );
  const className =
    raw.current_class ||
    raw.className ||
    raw.metadata?.class ||
    raw.class ||
    'Unassigned';
  const admission = String(raw.admission_number || raw.admissionNumber || '').trim();

  return {
    id: raw.id || raw.syncId || raw.sync_id,
    first_name: first,
    last_name: last,
    admission,
    email: raw.email || null,
    phone: raw.phone || raw.parentPhone || raw.parent_phone || null,
    balance,
    className,
  };
}

/** Collapse twin sync rows (same admission / name+class). */
function dedupeStudents(students: ReturnType<typeof normalizeStudent>[]) {
  const map = new Map<string, (typeof students)[0]>();
  for (const s of students) {
    const key = s.admission
      ? `adm:${s.admission.toLowerCase()}`
      : `name:${String(s.first_name || '').toLowerCase()} ${String(s.last_name || '').toLowerCase()}|${String(s.className || '').toLowerCase()}`;
    const prev = map.get(key);
    if (!prev || Math.abs(Number(s.balance)) >= Math.abs(Number(prev.balance))) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

export const useTenantAnalyticsStore = defineStore('tenantAnalytics', {
  state: () => ({
    metrics: {
      totalStudents: 0,
      paidCount: 0,
      owingCount: 0,
      totalOwingValue: 0,
      revenue: 0,
      activeUsers: 0,
      transactions: 0
    },
    charts: {
      paymentStatus: {
        series: [],
        labels: []
      },
      studentsPerClass: {
        series: [],
        categories: []
      },
      revenueTrend: {
        series: [],
        categories: []
      },
      owingStudents: [] as any[]
    },
    isLoading: false,
    error: null as string | null
  }),
  actions: {
    async loadMetrics() {
      this.isLoading = true;
      this.error = null;
      try {
        const tenantId = localStorage.getItem('tenant_id') || '';

        const [rosterRes, crmStudents, financeSummary] = await Promise.all([
          schoolApi.getRoster(tenantId && tenantId !== 'global' ? { params: { tenantId } } : undefined)
            .then((r) => r.data)
            .catch(() => null),
          CrmRepository.getCustomers(tenantId, 'STUDENT', { refresh: true }),
          FinanceRepository.getExecutiveSummary(tenantId, { refresh: true }),
        ]);

        // Prefer school roster students (synced from device), fall back to CRM.
        const rosterStudents = Array.isArray(rosterRes?.students) ? rosterRes.students : [];
        const source = rosterStudents.length > 0 ? rosterStudents : (crmStudents || []);
        const students = dedupeStudents(source.map(normalizeStudent));

        const totalStudents = students.length;
        let owingCount = 0;
        let totalOwingValue = 0;
        const classStats: Record<string, { total: number; owingCount: number; owingValue: number }> = {};

        students.forEach((student) => {
          const balance = Number(student.balance || 0);
          const className = student.className || 'Unassigned';

          if (!classStats[className]) {
            classStats[className] = { total: 0, owingCount: 0, owingValue: 0 };
          }
          classStats[className].total += 1;

          // Convention: balance > 0 = owing
          if (balance > 0) {
            owingCount++;
            totalOwingValue += balance;
            classStats[className].owingCount += 1;
            classStats[className].owingValue += balance;
          }
        });

        const paidCount = Math.max(0, totalStudents - owingCount);

        this.metrics = {
          totalStudents,
          paidCount,
          owingCount,
          totalOwingValue,
          revenue: financeSummary?.totalCollected || 0,
          activeUsers: totalStudents,
          transactions: (financeSummary as any)?.salesSummary?.invoiceCount || 0
        };

        this.charts.paymentStatus = {
          series: [paidCount, owingCount],
          labels: ['Fully Paid', 'Owing']
        };

        const classNames = Object.keys(classStats).sort();
        this.charts.studentsPerClass = {
          series: [{
            name: 'Students',
            data: classNames.map(name => classStats[name].total)
          }],
          categories: classNames
        };

        this.charts.owingStudents = students
          .filter((s) => Number(s.balance || 0) > 0)
          .map((s) => ({
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            className: s.className || 'Unassigned',
            balance: s.balance || 0,
            email: s.email,
            phone: s.phone
          }));

        // Simple revenue point from executive summary (enough to show a non-empty trend)
        const collected = Number(financeSummary?.totalCollected || 0);
        this.charts.revenueTrend = {
          series: [{
            name: 'Revenue',
            data: collected > 0 ? [collected] : []
          }],
          categories: collected > 0 ? ['Collected'] : []
        };

      } catch (err: any) {
        console.error('Failed to load analytics metrics:', err);
        this.error = err.message || 'Failed to load analytics';
      } finally {
        this.isLoading = false;
      }
    }
  }
});
