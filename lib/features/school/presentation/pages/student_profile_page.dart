import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:collection/collection.dart';

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
        final student = state.students.firstWhere(
          (s) => s.id == widget.studentId, 
          orElse: () => Student(
            admissionNumber: 'N/A', 
            firstName: 'Unknown', 
            lastName: 'Student', 
            classId: 0, 
            registrationDate: DateTime.now(),
          ),
        );
        final sClass = state.classes.firstWhere(
          (c) => c.id == student.classId, 
          orElse: () => const SchoolClass(id: 0, name: 'N/A'),
        );
        final currency = context.watch<SettingsBloc>().state.settings?.currency ?? '₦';

        return DefaultTabController(
          length: 3,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Student Profile'),
              bottom: const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: 'General'),
                  Tab(text: 'Academic Records'),
                  Tab(text: 'Results'),
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
                      _buildResultsTab(state.results),
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
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                children: [
                  _buildInfoTile('Parent/Guardian', student.parentName ?? 'Not Set', Icons.person_outline),
                  _buildInteractivePhoneTile('Phone', student.parentPhone ?? 'Not Set', Icons.phone_android),
                ],
              ),
            ),
            const SizedBox(width: 16),
            if (student.image != null)
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  image: DecorationImage(
                    image: MemoryImage(student.image!),
                    fit: BoxFit.cover,
                  ),
                ),
              )
            else
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person, size: 50, color: Colors.grey),
              ),
          ],
        ),
        const Divider(height: 32),
        _buildInfoTile('Date of Birth', student.dateOfBirth != null ? DateFormat('dd MMM yyyy').format(student.dateOfBirth!) : 'Not Set', Icons.cake_outlined),
        _buildInfoTile('Registration Date', student.registrationDate != null ? DateFormat('dd MMM yyyy').format(student.registrationDate!) : 'Not Set', Icons.calendar_today_outlined),
      ],
    );
  }

  Widget _buildInteractivePhoneTile(String label, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueGrey),
      title: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      subtitle: Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
      onTap: value == 'Not Set' ? null : () => _showCommunicationOptions(context, value),
    );
  }

  void _showCommunicationOptions(BuildContext context, String phoneNumber) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Contact Parent: $phoneNumber',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Colors.blue, child: Icon(Icons.call, color: Colors.white)),
              title: const Text('Call'),
              onTap: () {
                _launchCaller(phoneNumber);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Colors.orange, child: Icon(Icons.message, color: Colors.white)),
              title: const Text('Send SMS'),
              onTap: () {
                _launchSMS(phoneNumber);
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Colors.green, child: Icon(Icons.forum, color: Colors.white)),
              title: const Text('WhatsApp Message'),
              onTap: () {
                _launchWhatsApp(phoneNumber);
                Navigator.pop(context);
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Future<void> _launchCaller(String phoneNumber) async {
    final Uri url = Uri(scheme: 'tel', path: phoneNumber);
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  Future<void> _launchSMS(String phoneNumber) async {
    final Uri url = Uri(scheme: 'sms', path: phoneNumber);
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  Future<void> _launchWhatsApp(String phoneNumber) async {
    // Normalize phone number (strip non-digits)
    final String cleanNumber = phoneNumber.replaceAll(RegExp(r'\D'), '');
    // WhatsApp URL format
    final Uri url = Uri.parse('https://wa.me/$cleanNumber');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Widget _buildInfoTile(String label, String value, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: Colors.blueGrey),
      title: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      subtitle: Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
    );
  }

  Widget _buildResultsTab(List<AcademicResult> results) {
    if (results.isEmpty) {
      return const Center(child: Text('No academic results recorded yet'));
    }

    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, state) {
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: results.length,
          itemBuilder: (context, index) {
            final res = results[index];
            final subject = state.subjects.firstWhereOrNull((s) => s.id == res.subjectId);
            final term = state.terms.firstWhereOrNull((t) => t.id == res.termId);
            
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          subject?.name ?? 'Unknown Subject',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            res.grade ?? 'N/A',
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Term: ${term?.name ?? "N/A"}',
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildScoreItem('CA', res.assessmentScore.toString()),
                        _buildScoreItem('Exam', res.examScore.toString()),
                        _buildScoreItem('Total', res.totalScore.toString(), isBold: true),
                      ],
                    ),
                    if (res.remarks != null && res.remarks!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Remarks: ${res.remarks}',
                        style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildScoreItem(String label, String score, {bool isBold = false}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        Text(
          score,
          style: TextStyle(
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            fontSize: 14,
          ),
        ),
      ],
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
