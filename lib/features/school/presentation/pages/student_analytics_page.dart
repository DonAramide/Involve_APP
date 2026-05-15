import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:collection/collection.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';

class StudentAnalyticsPage extends StatefulWidget {
  const StudentAnalyticsPage({super.key});

  @override
  State<StudentAnalyticsPage> createState() => _StudentAnalyticsPageState();
}

class _StudentAnalyticsPageState extends State<StudentAnalyticsPage> {
  bool _isLoading = true;
  List<Invoice> _allInvoices = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final invoiceRepository = context.read<InvoiceRepository>();
    final invoices = await invoiceRepository.getAllInvoices();
    if (mounted) {
      setState(() {
        _allInvoices = invoices;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        if (_isLoading || state.isLoading) {
          return const Scaffold(
            body: InvifyLoadingIndicator(message: 'ANALYZING STUDENT METRICS...'),
          );
        }

        final students = state.students;
        final classes = state.classes;
        final years = state.academicYears;

        // Core Student Metrics
        int totalStudents = students.length;
        
        // Paid vs Owing
        final owingStudents = students.where((s) => (s.balance ?? 0) > 0).toList();
        final paidStudents = students.where((s) => (s.balance ?? 0) <= 0).toList();
        
        int owingCount = owingStudents.length;
        double totalOwingValue = owingStudents.fold(0.0, (sum, s) => sum + (s.balance ?? 0));
        
        int paidCount = paidStudents.length;
        // Total collected from fully paid students (requires interpreting total expected vs balance, or just using amount paid from invoices)
        
        return Scaffold(
          appBar: AppBar(
            title: const Text('Student Analytics'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildSummaryCards(totalStudents, paidCount, owingCount, totalOwingValue),
                const SizedBox(height: 24),
                _buildChartsRow(paidCount.toDouble(), owingCount.toDouble(), classes, students),
                const SizedBox(height: 24),
                _buildRevenueTrendSection(_allInvoices),
                const SizedBox(height: 24),
                _buildClassAnalytics(students, classes),
                const SizedBox(height: 24),
                _buildFinancialAnalytics(classes, years, _allInvoices),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryCards(int totalStudents, int paidCount, int owingCount, double totalOwingValue) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            title: 'Total Students',
            value: totalStudents.toString(),
            icon: Icons.people,
            color: Colors.blue,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            title: 'Fully Paid',
            value: paidCount.toString(),
            subtitle: '${((paidCount / (totalStudents == 0 ? 1 : totalStudents)) * 100).toStringAsFixed(1)}%',
            icon: Icons.check_circle,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            title: 'Owing',
            value: owingCount.toString(),
            subtitle: CurrencyFormatter.format(totalOwingValue),
            icon: Icons.warning,
            color: Colors.red,
          ),
        ),
      ],
    );
  }

  Widget _buildChartsRow(double paid, double owing, List<SchoolClass> classes, List<Student> students) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: _buildPieChartCard(paid, owing),
        ),
        const SizedBox(width: 16),
        Expanded(
          flex: 3,
          child: _buildBarChartCard(classes, students),
        ),
      ],
    );
  }

  Widget _buildPieChartCard(double paid, double owing) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text('Payment Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            SizedBox(
              height: 180,
              child: PieChart(
                PieChartData(
                  sectionsSpace: 2,
                  centerSpaceRadius: 40,
                  sections: [
                    PieChartSectionData(
                      color: Colors.green,
                      value: paid,
                      title: '${((paid / (paid + owing + 0.1)) * 100).toStringAsFixed(0)}%',
                      radius: 50,
                      titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    PieChartSectionData(
                      color: Colors.red,
                      value: owing,
                      title: '${((owing / (paid + owing + 0.1)) * 100).toStringAsFixed(0)}%',
                      radius: 50,
                      titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildLegendItem('Paid', Colors.green),
                const SizedBox(width: 16),
                _buildLegendItem('Owing', Colors.red),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBarChartCard(List<SchoolClass> classes, List<Student> students) {
    final List<BarChartGroupData> groups = [];
    for (int i = 0; i < classes.length && i < 6; i++) {
      final c = classes[i];
      final count = students.where((s) => s.classId == c.id).length;
      groups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: count.toDouble(),
              color: Colors.blue,
              width: 16,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      );
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text('Students per Class', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  barGroups: groups,
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < classes.length) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 8.0),
                              child: Text(classes[index].name.substring(0, 3), style: const TextStyle(fontSize: 10)),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueTrendSection(List<Invoice> invoices) {
    // Group invoices by month for current year
    final now = DateTime.now();
    final monthlyData = <int, double>{};
    for (int i = 1; i <= 12; i++) {
      monthlyData[i] = 0.0;
    }

    for (var inv in invoices) {
      if (inv.dateCreated.year == now.year) {
        final month = inv.dateCreated.month;
        monthlyData[month] = (monthlyData[month] ?? 0) + inv.amountPaid;
      }
    }

    final List<FlSpot> spots = monthlyData.entries
        .map((e) => FlSpot(e.key.toDouble(), e.value / 1000)) // Value in thousands for easier display
        .toList();

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: [Colors.blue.shade900, Colors.blue.shade700],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Revenue Collection Trend (In Thousands)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: Colors.white,
                      barWidth: 3,
                      isStrokeCapRound: true,
                      dotData: const FlDotData(show: false),
                      belowBarData: BarAreaData(
                        show: true,
                        color: Colors.white.withOpacity(0.2),
                      ),
                    ),
                  ],
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
                          final index = value.toInt() - 1;
                          if (index >= 0 && index < 12) {
                            return Text(months[index], style: const TextStyle(color: Colors.white70, fontSize: 12));
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) => Text('${value.toInt()}K', style: const TextStyle(color: Colors.white70, fontSize: 10)),
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(color: Colors.white.withOpacity(0.1), strokeWidth: 1),
                  ),
                  borderData: FlBorderData(show: false),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 12, height: 12, color: color),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildClassAnalytics(List<Student> students, List<SchoolClass> classes) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Students by Class', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Divider(),
            ...classes.map((c) {
              final count = students.where((s) => s.classId == c.id).length;
              if (count == 0) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(c.name, style: const TextStyle(fontSize: 16)),
                    Text(count.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildYearAnalytics(List<Student> students, List<AcademicYear> years, List<Invoice> allInvoices) {
    // Map students per year based on their involvement in invoices for that year
    // Since Student entity doesn't inherently belong to one specific year, 
    // we establish their 'presence' in a year if they have an invoice in it.
    
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Active Students by Year', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Divider(),
            ...years.map((y) {
              final studentIdsInYear = allInvoices
                  .where((i) => i.academicYearId == y.id && i.studentId != null)
                  .map((i) => i.studentId!)
                  .toSet();
              
              if (studentIdsInYear.isEmpty) return const SizedBox.shrink();
              
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(y.name, style: const TextStyle(fontSize: 16)),
                    Text(studentIdsInYear.length.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
              );
            }),
            if (years.isEmpty || allInvoices.isEmpty)
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text('Not enough data to map students to years.'),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialAnalytics(List<SchoolClass> classes, List<AcademicYear> years, List<Invoice> allInvoices) {
    // Expected vs Recovered grouped by Year, then Class
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Revenue: Expected vs Recovered', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Divider(),
            ...years.map((y) {
              final yearInvoices = allInvoices.where((i) => i.academicYearId == y.id).toList();
              if (yearInvoices.isEmpty) return const SizedBox.shrink();

              // Calculate over all classes for this year
              double yearExpected = yearInvoices.fold(0.0, (sum, i) => sum + i.totalAmount);
              double yearRecovered = yearInvoices.fold(0.0, (sum, i) => sum + i.amountPaid);
              
              return ExpansionTile(
                title: Text(y.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('Expected: ${CurrencyFormatter.format(yearExpected)} | Recovered: ${CurrencyFormatter.format(yearRecovered)}'),
                children: classes.map((c) {
                  final classInvoices = yearInvoices.where((i) => i.classId == c.id).toList();
                  if (classInvoices.isEmpty) return const SizedBox.shrink();

                  double classExpected = classInvoices.fold(0.0, (sum, i) => sum + i.totalAmount);
                  double classRecovered = classInvoices.fold(0.0, (sum, i) => sum + i.amountPaid);

                  return ListTile(
                    title: Text(c.name),
                    trailing: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Exp: ${CurrencyFormatter.format(classExpected)}', style: const TextStyle(fontSize: 12)),
                        Text('Rec: ${CurrencyFormatter.format(classRecovered)}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                      ],
                    ),
                  );
                }).toList(),
              );
            }),
            if (allInvoices.isEmpty)
               const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text('No invoice financial data found.'),
              )
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10, color: Theme.of(context).textTheme.bodySmall?.color),
            ),
          ]
        ],
      ),
    );
  }
}
