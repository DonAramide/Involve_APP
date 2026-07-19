import { defineStore } from 'pinia';
import { CrmRepository } from '../../../../repositories/CrmRepository';
import { FinanceRepository } from '../../../../repositories/FinanceRepository';

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
        const tenantId = localStorage.getItem('tenant_id') || 'demo-tenant';
        
        // Fetch data from repositories
        const [students, financeSummary] = await Promise.all([
          CrmRepository.getCustomers(tenantId, 'STUDENT'),
          FinanceRepository.getExecutiveSummary(tenantId)
        ]);

        // Compute Metrics Dynamically
        const totalStudents = students.length;
        
        let owingCount = 0;
        let totalOwingValue = 0;
        const classStats: Record<string, { total: number; owingCount: number; owingValue: number }> = {};

        students.forEach((student: any) => {
          const balance = student.metadata?.balance || 0;
          const className = student.metadata?.class || 'Unassigned';

          if (!classStats[className]) {
            classStats[className] = { total: 0, owingCount: 0, owingValue: 0 };
          }
          classStats[className].total += 1;

          if (balance > 0) {
            owingCount++;
            totalOwingValue += balance;
            classStats[className].owingCount += 1;
            classStats[className].owingValue += balance;
          }
        });

        const paidCount = totalStudents - owingCount;

        this.metrics = {
          totalStudents,
          paidCount,
          owingCount,
          totalOwingValue,
          revenue: financeSummary?.totalCollected || 0,
          activeUsers: totalStudents,
          transactions: 0
        };

        // Prepare Payment Status Pie Chart
        this.charts.paymentStatus = {
          series: [paidCount, owingCount],
          labels: ['Fully Paid', 'Owing']
        };

        // Prepare Students per Class Bar Chart
        const classNames = Object.keys(classStats).sort();
        this.charts.studentsPerClass = {
          series: [{
            name: 'Students',
            data: classNames.map(name => classStats[name].total)
          }],
          categories: classNames
        };

        // Prepare Owing Students List
        this.charts.owingStudents = students
          .filter((s: any) => (s.metadata?.balance || 0) > 0)
          .map((s: any) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            className: s.metadata?.class || 'Unassigned',
            balance: s.metadata?.balance || 0,
            email: s.email,
            phone: s.phone
          }));

        // Prepare Revenue Trend Line Chart
        this.charts.revenueTrend = {
          series: [{
            name: 'Revenue',
            data: []
          }],
          categories: []
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
