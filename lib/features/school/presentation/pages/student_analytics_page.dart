import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';

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
            body: Center(child: CircularProgressIndicator()),
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
                _buildClassAnalytics(students, classes),
                const SizedBox(height: 24),
                _buildYearAnalytics(students, years, _allInvoices),
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
