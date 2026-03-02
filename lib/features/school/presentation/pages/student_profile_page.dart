import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/student.dart';
import '../../domain/entities/school_class.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

class StudentProfilePage extends StatefulWidget {
  final int studentId;
  const StudentProfilePage({super.key, required this.studentId});

  @override
  State<StudentProfilePage> createState() => _StudentProfilePageState();
}

class _StudentProfilePageState extends State<StudentProfilePage> {
  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadStudentRecordsEvent(widget.studentId));
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        final student = state.students.firstWhere((s) => s.id == widget.studentId, orElse: () => const Student(firstName: 'Unknown', lastName: 'Student'));
        final sClass = state.classes.firstWhere((c) => c.id == student.classId, orElse: () => SchoolClass(name: 'N/A'));
        final currency = context.watch<SettingsBloc>().state.settings?.currency ?? '₦';

        return DefaultTabController(
          length: 3,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Student Profile'),
              bottom: const TabBar(
                tabs: [
                  Tab(text: 'General'),
                  Tab(text: 'Academic Records'),
                  Tab(text: 'Payments'),
                ],
              ),
            ),
            body: Column(
              children: [
                _buildHeader(context, student, sClass, currency),
                Expanded(
                  child: TabBarView(
                    children: [
                      _buildGeneralTab(student),
                      _buildRecordsTab(state.studentInvoices, currency),
                      _buildPaymentsTab(state.studentInvoices, currency),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, Student student, SchoolClass sClass, String currency) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
        border: Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.2))),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundImage: student.image != null ? MemoryImage(student.image!) : null,
            child: student.image == null ? const Icon(Icons.person, size: 40) : null,
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Text('Class: ${sClass.name} | ID: ${student.admissionNumber ?? "N/A"}'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: student.balance > 0 ? Colors.red.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Balance: ${CurrencyFormatter.formatWithSymbol(student.balance, symbol: currency)}',
                    style: TextStyle(
                      color: student.balance > 0 ? Colors.red : Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralTab(Student student) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoTile('Parent/Guardian', student.parentName ?? 'Not Set', Icons.person_outline),
        _buildInfoTile('Phone', student.parentPhone ?? 'Not Set', Icons.phone_android),
        _buildInfoTile('Date of Birth', student.dateOfBirth != null ? DateFormat('dd MMM yyyy').format(student.dateOfBirth!) : 'Not Set', Icons.cake_outlined),
        _buildInfoTile('Registration Date', student.registrationDate != null ? DateFormat('dd MMM yyyy').format(student.registrationDate!) : 'Not Set', Icons.calendar_today_outlined),
      ],
    );
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueGrey),
      title: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      subtitle: Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
    );
  }

  Widget _buildRecordsTab(List<dynamic> invoices, String currency) {
    if (invoices.isEmpty) {
      return const Center(child: Text('No academic records found'));
    }
    return ListView.builder(
      itemCount: invoices.length,
      itemBuilder: (context, index) {
        final inv = invoices[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListTile(
            title: Text('Bill #${inv.invoiceNumber}'),
            subtitle: Text(DateFormat('dd MMM yyyy').format(inv.dateCreated)),
            trailing: Text(
              CurrencyFormatter.formatWithSymbol(inv.totalAmount, symbol: currency),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPaymentsTab(List<dynamic> invoices, String currency) {
    // For now, extract invoices with amountPaid > 0 as "Payments"
    final paidInvoices = invoices.where((inv) => inv.amountPaid > 0).toList();
    if (paidInvoices.isEmpty) {
      return const Center(child: Text('No payment history found'));
    }
    return ListView.builder(
      itemCount: paidInvoices.length,
      itemBuilder: (context, index) {
        final inv = paidInvoices[index];
        return ListTile(
          leading: const Icon(Icons.check_circle, color: Colors.green),
          title: Text('Payment for Bill #${inv.invoiceNumber}'),
          subtitle: Text('Method: ${inv.paymentMethod} | ${DateFormat('dd MMM yyyy').format(inv.dateCreated)}'),
          trailing: Text(
            CurrencyFormatter.formatWithSymbol(inv.amountPaid, symbol: currency),
            style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
          ),
        );
      },
    );
  }
}
