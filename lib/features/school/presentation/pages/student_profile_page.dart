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
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'result_preview_page.dart';

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
        final assignedTeacher = state.teachers.firstWhereOrNull(
          (t) => t.classId == sClass.id && sClass.id != 0,
        );
        final currency = context.watch<SettingsBloc>().state.settings?.currency ?? '₦';

        return DefaultTabController(
          length: 4,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('Student Profile'),
              bottom: const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: 'General'),
                  Tab(text: 'Billing Records'),
                  Tab(text: 'Results'),
                  Tab(text: 'Payments'),
                ],
              ),
            ),
            body: Column(
              children: [
                _buildHeader(context, student, sClass, assignedTeacher, currency),
                Expanded(
                  child: TabBarView(
                    children: [
                      _buildGeneralTab(student),
                       _buildRecordsTab(student, state.studentInvoices, currency),
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

  Widget _buildHeader(BuildContext context, Student student, SchoolClass sClass, Teacher? assignedTeacher, String currency) {
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
                if (assignedTeacher != null)
                  Text('Teacher: ${assignedTeacher.fullName}', style: const TextStyle(fontSize: 14, color: Colors.blueGrey)),
                const SizedBox(height: 8),
                Row(
                  children: [
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
                    if (student.balance > 0) ...[
                      const SizedBox(width: 8),
                      TextButton.icon(
                        onPressed: () => _showPaymentDialog(context, student),
                        icon: const Icon(Icons.payment, size: 16),
                        label: const Text('PAY BALANCE'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                      if (student.creditBalance > 0) ...[
                        const SizedBox(width: 8),
                        TextButton.icon(
                          onPressed: () {
                            context.read<SchoolBloc>().add(ClearStudentDebitEvent(student.id!));
                          },
                          icon: const Icon(Icons.auto_fix_high, size: 16),
                          label: const Text('CLEAR DEBIT'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.white,
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
                if (student.creditBalance > 0) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Credit: ${CurrencyFormatter.formatWithSymbol(student.creditBalance, symbol: currency)}',
                      style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
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
                  _buildVirtualAccountSection(context, student),
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
        _buildInfoTile('Gender', student.gender ?? 'Not Set', Icons.transgender_outlined),
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
        final filteredResults = results.where((r) => 
          r.termId == state.activeTerm?.id && 
          r.academicYearId == state.activeYear?.id
        ).toList();

        return Column(
          children: [
            if (state.studentAverage != null || state.studentPosition != null)
              _buildResultsSummary(state.studentAverage, state.classAverage, state.studentPosition, state.classSize),
            if (filteredResults.isEmpty)
              const Expanded(child: Center(child: Text('No academic results for the current term.')))
            else
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredResults.length,
                  itemBuilder: (context, index) {
                    final res = filteredResults[index];
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
        ),
      ),
    ],
  );
},
);
}

  Widget _buildResultsSummary(double? average, double? classAverage, int? position, int? classSize) {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          const Text(
            'ACTIVE TERM SUMMARY',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey, letterSpacing: 1.2),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem(
                'STUDENT AVG',
                average != null ? '${average.toStringAsFixed(1)}%' : 'N/A',
                Icons.analytics_outlined,
                Colors.blue,
              ),
              _buildSummaryItem(
                'CLASS AVG',
                classAverage != null ? '${classAverage.toStringAsFixed(1)}%' : 'N/A',
                Icons.waves_outlined,
                Colors.teal,
              ),
              _buildSummaryItem(
                'CLASS POSITION',
                position != null ? '${position}${_getOrdinalSuffix(position)}' : 'N/A',
                Icons.emoji_events_outlined,
                Colors.orange,
                subtitle: classSize != null ? 'Out of $classSize' : null,
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _printResults(context),
              icon: const Icon(Icons.print_outlined, size: 18),
              label: const Text('PRINT RESULTS SHEET'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.blue[700],
                side: BorderSide(color: Colors.blue[200]!),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _printResults(BuildContext context) {
    final state = context.read<SchoolBloc>().state;
    final student = state.students.firstWhere((s) => s.id == widget.studentId);
    final results = state.results.where((r) => 
      r.studentId == widget.studentId &&
      r.termId == state.activeTerm?.id &&
      r.academicYearId == state.activeYear?.id
    ).toList();
    final sClass = state.classes.firstWhereOrNull((c) => c.id == student.classId);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ResultPreviewPage(
          student: student,
          results: results,
          subjects: state.subjects,
          academicYear: state.activeYear,
          term: state.activeTerm,
          className: sClass?.name,
          classAverage: state.classAverage,
          studentPosition: state.studentPosition,
          classSize: state.classSize,
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, IconData icon, Color color, {String? subtitle}) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Colors.grey),
        ),
        if (subtitle != null)
          Text(
            subtitle,
            style: const TextStyle(fontSize: 9, color: Colors.blueGrey),
          ),
      ],
    );
  }

  String _getOrdinalSuffix(int value) {
    if (value >= 11 && value <= 13) {
      return 'th';
    }
    switch (value % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
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

  Widget _buildRecordsTab(Student student, List<Invoice> invoices, String currency) {
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
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  CurrencyFormatter.formatWithSymbol(inv.totalAmount, symbol: currency),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                if (inv.balanceAmount > 0)
                  IconButton(
                    icon: const Icon(Icons.payment, color: Colors.green, size: 20),
                    tooltip: 'Pay Balance',
                    onPressed: () => _showPaymentDialog(context, student),
                  ),
                IconButton(
                  icon: const Icon(Icons.print, color: Colors.blueGrey, size: 20),
                  tooltip: 'Print Bill',
                  onPressed: () => _openReceipt(context, inv, "ACADEMIC BILL"),
                ),
              ],
            ),
            onTap: () => _openReceipt(context, inv, "ACADEMIC BILL"),
          ),
        );
      },
    );
  }

  Widget _buildPaymentsTab(List<Invoice> invoices, String currency) {
    // Extract invoices with amountPaid > 0 as "Payments"
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
          subtitle: Text('Method: ${inv.paymentMethod ?? "Unknown"} | ${DateFormat('dd MMM yyyy').format(inv.dateCreated)}'),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                CurrencyFormatter.formatWithSymbol(inv.amountPaid, symbol: currency),
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.print, color: Colors.blueGrey, size: 20),
                onPressed: () => _openReceipt(context, inv, "PAYMENT RECEIPT"),
              ),
            ],
          ),
          onTap: () => _openReceipt(context, inv, "PAYMENT RECEIPT"),
        );
      },
    );
  }

  void _openReceipt(BuildContext context, Invoice invoice, String title) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReceiptPreviewPage(invoice: invoice, receiptTitle: title),
      ),
    );
  }

  Widget _buildVirtualAccountSection(BuildContext context, Student student) {
    if (student.virtualAccountNumber != null && student.virtualAccountBank != null) {
      return Card(
        margin: const EdgeInsets.only(top: 16, bottom: 8),
        color: Colors.green.shade50,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Dedicated Virtual Account', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('Bank: ${student.virtualAccountBank}'),
              Text('Account: ${student.virtualAccountNumber}'),
              Text('Status: ${student.virtualAccountStatus ?? "ACTIVE"}'),
            ],
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: ElevatedButton.icon(
        onPressed: () {
          context.read<SchoolBloc>().add(ProvisionStudentVirtualAccountEvent(student.id!));
        },
        icon: const Icon(Icons.account_balance),
        label: const Text('Generate Virtual Account'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue.shade800,
          foregroundColor: Colors.white,
        ),
      ),
    );
  }

  void _showPaymentDialog(BuildContext context, Student student) {
    final amountController = TextEditingController(text: student.balance.toString());
    final remarksController = TextEditingController();
    String paymentMethod = 'Cash';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Processes Payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount to Pay', prefixText: '₦ '),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: paymentMethod,
                decoration: const InputDecoration(labelText: 'Payment Method'),
                items: ['Cash', 'POS', 'Transfer'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (val) => setDialogState(() => paymentMethod = val!),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: remarksController,
                decoration: const InputDecoration(labelText: 'Remarks (Optional)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                final amount = double.tryParse(amountController.text) ?? 0;
                if (amount > 0) {
                  context.read<SchoolBloc>().add(MakeStudentPaymentEvent(
                    studentId: student.id!,
                    amount: amount,
                    method: paymentMethod,
                    remarks: remarksController.text,
                  ));
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Submit Payment'),
            ),
          ],
        ),
      ),
    );
  }
}
