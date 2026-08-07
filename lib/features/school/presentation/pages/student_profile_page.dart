import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import '../../domain/entities/school_entities.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/school/domain/services/result_service.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'result_preview_page.dart';
import 'package:involve_app/services/terminal_sync_service.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:involve_app/core/mpos/mpos_device_type.dart';
import 'package:involve_app/services/socket_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';

class StudentProfilePage extends StatefulWidget {
  final int studentId;
  const StudentProfilePage({super.key, required this.studentId});

  @override
  State<StudentProfilePage> createState() => _StudentProfilePageState();
}

class _StudentProfilePageState extends State<StudentProfilePage> {
  bool _awaitingVaProvision = false;
  StreamSubscription<Student>? _studentCreditSub;

  @override
  void initState() {
    super.initState();
    context.read<SchoolBloc>().add(LoadStudentRecordsEvent(widget.studentId));
    _studentCreditSub =
        CustomerWalletCreditService.instance.onStudentCredited.listen((student) {
      if (!mounted || student.id != widget.studentId) return;
      context.read<SchoolBloc>().add(LoadSchoolData());
      context.read<SchoolBloc>().add(LoadStudentRecordsEvent(widget.studentId));
    });
  }

  @override
  void dispose() {
    _studentCreditSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SchoolBloc, SchoolState>(
      listener: (context, state) {
        if (!_awaitingVaProvision) return;

        if (state.error != null && state.status == SchoolStatus.failure) {
          setState(() => _awaitingVaProvision = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error!),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 5),
            ),
          );
          return;
        }

        if (state.status == SchoolStatus.success && !state.isLoading) {
          final student = state.students.firstWhereOrNull((s) => s.id == widget.studentId);
          if (student?.virtualAccountNumber != null) {
            setState(() => _awaitingVaProvision = false);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Virtual account generated: ${student!.virtualAccountNumber}',
                ),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      },
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
                _buildHeader(context, student, sClass, assignedTeacher, currency, state.studentInvoices),
                Expanded(
                  child: TabBarView(
                    children: [
                      _buildGeneralTab(student, isProvisioningVa: _awaitingVaProvision),
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

  Widget _buildHeader(
    BuildContext context,
    Student student,
    SchoolClass sClass,
    Teacher? assignedTeacher,
    String currency,
    List<Invoice> studentInvoices,
  ) {
    final theme = Theme.of(context);
    // Convention: balance > 0 = debt owed. Negative balance is a sync glitch (over-applied).
    final rawBalance = student.balance;
    final ledgerDebt = rawBalance > 0 ? rawBalance : 0.0;
    final invoiceDebt = studentInvoices
        .where((inv) => inv.studentId == student.id)
        .fold(0.0, (sum, inv) {
      final owing = inv.totalAmount - inv.amountPaid;
      return sum + (owing > 0 ? owing : 0);
    });
    final debt = ledgerDebt > 0.001 ? ledgerDebt : invoiceDebt;
    final hasDebit = debt > 0.001;
    final hasCredit = student.creditBalance > 0.001;
    // CLEAR applies wallet credit to open debt / bills.
    final canClearWithCredit = hasCredit && (hasDebit || rawBalance < -0.001);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.05),
        border: Border(bottom: BorderSide(color: Colors.grey.withOpacity(0.15))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
            backgroundImage: student.image != null ? MemoryImage(student.image!) : null,
            child: student.image == null
                ? Icon(Icons.person_rounded, size: 34, color: theme.colorScheme.primary)
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, height: 1.2),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    sClass.name,
                    if (student.department != null && student.department!.isNotEmpty) student.department!,
                    'ID ${student.admissionNumber}',
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
                if (assignedTeacher != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Teacher: ${assignedTeacher.fullName}',
                    style: TextStyle(fontSize: 13, color: Colors.blueGrey.shade600),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: hasDebit ? Colors.red.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        hasDebit
                            ? 'Balance: ${CurrencyFormatter.formatWithSymbol(debt, symbol: currency)}'
                            : 'Balance: ${CurrencyFormatter.formatWithSymbol(0, symbol: currency)}',
                        style: TextStyle(
                          color: hasDebit ? Colors.red.shade700 : Colors.green.shade700,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    if (hasCredit)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.teal.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'Credit: ${CurrencyFormatter.formatWithSymbol(student.creditBalance, symbol: currency)}',
                          style: TextStyle(
                            color: Colors.teal.shade700,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    if (hasDebit)
                      TextButton.icon(
                        onPressed: () => _showPaymentDialog(context, student),
                        icon: const Icon(Icons.payment, size: 16),
                        label: const Text('PAY'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                          backgroundColor: theme.colorScheme.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    if (canClearWithCredit)
                      TextButton.icon(
                        onPressed: () {
                          context.read<SchoolBloc>().add(ClearStudentDebitEvent(student.id!));
                        },
                        icon: const Icon(Icons.auto_fix_high, size: 16),
                        label: const Text('CLEAR'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                          backgroundColor: Colors.green.shade700,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneralTab(Student student, {bool isProvisioningVa = false}) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        _buildSectionLabel('Payment Account'),
        const SizedBox(height: 10),
        _buildVirtualAccountSection(context, student, isProvisioningVa: isProvisioningVa),
        const SizedBox(height: 22),
        _buildSectionLabel('Guardian Contact'),
        const SizedBox(height: 10),
        _buildDetailsCard([
          _buildInfoRow(
            icon: Icons.person_outline_rounded,
            label: 'Parent / Guardian',
            value: student.parentName?.trim().isNotEmpty == true ? student.parentName! : 'Not set',
          ),
          _buildInfoRow(
            icon: Icons.phone_android_rounded,
            label: 'Phone',
            value: student.parentPhone?.trim().isNotEmpty == true ? student.parentPhone! : 'Not set',
            onTap: student.parentPhone?.trim().isNotEmpty == true
                ? () => _showCommunicationOptions(context, student.parentPhone!)
                : null,
            trailing: student.parentPhone?.trim().isNotEmpty == true
                ? Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.grey.shade500)
                : null,
          ),
        ]),
        const SizedBox(height: 22),
        _buildSectionLabel('Personal Details'),
        const SizedBox(height: 10),
        _buildDetailsCard([
          _buildInfoRow(
            icon: Icons.cake_outlined,
            label: 'Date of Birth',
            value: student.dateOfBirth != null
                ? DateFormat('dd MMM yyyy').format(student.dateOfBirth!)
                : 'Not set',
          ),
          _buildInfoRow(
            icon: Icons.wc_outlined,
            label: 'Gender',
            value: student.gender?.trim().isNotEmpty == true ? student.gender! : 'Not set',
          ),
          _buildInfoRow(
            icon: Icons.event_available_outlined,
            label: 'Registered',
            value: DateFormat('dd MMM yyyy').format(student.registrationDate),
            showDivider: false,
          ),
        ]),
      ],
    );
  }

  Widget _buildSectionLabel(String title) {
    return Text(
      title.toUpperCase(),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
        color: Colors.grey.shade600,
      ),
    );
  }

  Widget _buildDetailsCard(List<Widget> children) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.15)),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    VoidCallback? onTap,
    Widget? trailing,
    bool showDivider = true,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.blueGrey.shade600, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        value,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                if (trailing != null) trailing,
              ],
            ),
          ),
        ),
        if (showDivider)
          Divider(height: 1, indent: 66, color: Colors.grey.withOpacity(0.12)),
      ],
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
    final schoolState = context.read<SchoolBloc>().state;
    final student = schoolState.students.firstWhere((s) => s.id == widget.studentId);
    
    AcademicYear? selectedYear = schoolState.activeYear;
    Term? selectedTerm = schoolState.activeTerm;
    String printMode = 'pdf'; // 'pdf' or 'thermal'

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Print Results Options'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Select Academic Period', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<int?>(
                    value: selectedYear?.id,
                    decoration: const InputDecoration(
                      labelText: 'Academic Year',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: schoolState.academicYears.map((y) => DropdownMenuItem(value: y.id, child: Text(y.name))).toList(),
                    onChanged: (val) {
                      setState(() {
                        selectedYear = schoolState.academicYears.firstWhereOrNull((y) => y.id == val);
                      });
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int?>(
                    value: selectedTerm?.id,
                    decoration: const InputDecoration(
                      labelText: 'Academic Term',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    items: schoolState.terms.map((t) => DropdownMenuItem(value: t.id, child: Text(t.name))).toList(),
                    onChanged: (val) {
                      setState(() {
                        selectedTerm = schoolState.terms.firstWhereOrNull((t) => t.id == val);
                      });
                    },
                  ),
                  const SizedBox(height: 20),
                  const Text('Select Print Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('A4 PDF / System'),
                          selected: printMode == 'pdf',
                          onSelected: (selected) {
                            if (selected) setState(() => printMode = 'pdf');
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text('Direct Thermal'),
                          selected: printMode == 'thermal',
                          onSelected: (selected) {
                            if (selected) setState(() => printMode = 'thermal');
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _executePrint(context, student, selectedYear, selectedTerm, printMode);
                  },
                  child: const Text('PROCEED'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _executePrint(
    BuildContext context,
    Student student,
    AcademicYear? year,
    Term? term,
    String mode,
  ) {
    final state = context.read<SchoolBloc>().state;
    final results = state.results.where((r) => 
      r.studentId == student.id &&
      r.termId == term?.id &&
      r.academicYearId == year?.id
    ).toList();
    
    if (results.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('No results found for ${student.fullName} in ${term?.name ?? "selected term"} (${year?.name ?? "selected year"}).'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final sClass = state.classes.firstWhereOrNull((c) => c.id == student.classId);

    if (mode == 'pdf') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ResultPreviewPage(
            student: student,
            results: results,
            subjects: state.subjects,
            academicYear: year,
            term: term,
            className: sClass?.name,
            classAverage: state.classAverage,
            studentPosition: state.studentPosition,
            classSize: state.classSize,
          ),
        ),
      );
    } else {
      // Direct thermal printing using PrinterBloc
      final printerBloc = context.read<PrinterBloc>();
      if (printerBloc.state.connectedDevice == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No external printer connected. Please connect a printer in Settings > Printer Settings.'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      final settings = context.read<SettingsBloc>().state.settings;
      if (settings == null) return;

      final commands = ResultService().generateResultThermalCommands(
        student: student,
        results: results,
        subjects: state.subjects,
        settings: settings,
        academicYear: year,
        term: term,
        className: sClass?.name,
        classAverage: state.classAverage,
        studentPosition: state.studentPosition,
        classSize: state.classSize,
      );

      printerBloc.add(PrintCommandsEvent(commands, settings.paperWidth));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sending result to external printer...')),
      );
    }
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

  Widget _buildVirtualAccountSection(BuildContext context, Student student, {bool isProvisioningVa = false}) {
    final hasVa = student.virtualAccountNumber != null &&
        student.virtualAccountNumber!.trim().isNotEmpty &&
        student.virtualAccountBank != null &&
        student.virtualAccountBank!.trim().isNotEmpty;

    if (!hasVa) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.blueGrey.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.blueGrey.withOpacity(0.12)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.account_balance_rounded, color: Colors.blue.shade800),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No virtual account yet',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Generate a dedicated account for fee payments.',
                        style: TextStyle(fontSize: 12, color: Colors.blueGrey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isProvisioningVa
                    ? null
                    : () {
                        setState(() => _awaitingVaProvision = true);
                        context.read<SchoolBloc>().add(ProvisionStudentVirtualAccountEvent(student.id!));
                      },
                icon: isProvisioningVa
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.add_card_rounded),
                label: Text(isProvisioningVa ? 'Generating…' : 'Generate Virtual Account'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade800,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      );
    }

    final accountNumber = student.virtualAccountNumber!.trim();
    final bankName = student.virtualAccountBank!.trim();
    final status = (student.virtualAccountStatus ?? 'ACTIVE').toUpperCase();
    final accountName = student.fullName;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFF0F766E), const Color(0xFF0D9488)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F766E).withOpacity(0.28),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.account_balance_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'DEDICATED VIRTUAL ACCOUNT',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            'Account Number',
            style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  accountNumber,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Copy account number',
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: accountNumber));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Account number copied'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                icon: const Icon(Icons.copy_rounded, color: Colors.white),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                _buildVaMetaRow('Bank', bankName),
                const SizedBox(height: 8),
                _buildVaMetaRow('Account Name', accountName),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    final details =
                        'Pay school fees for $accountName\nBank: $bankName\nAccount: $accountNumber';
                    Clipboard.setData(ClipboardData(text: details));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Payment details copied'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  icon: const Icon(Icons.content_copy_rounded, size: 16),
                  label: const Text('Copy details'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white.withOpacity(0.35)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: student.parentPhone?.trim().isNotEmpty == true
                      ? () async {
                          final phone = student.parentPhone!.replaceAll(RegExp(r'\D'), '');
                          final message = Uri.encodeComponent(
                            'Payment details for $accountName:\n'
                            'Bank: $bankName\n'
                            'Account Number: $accountNumber\n\n'
                            'Please use this account for school fee payments.',
                          );
                          final url = Uri.parse('https://wa.me/$phone?text=$message');
                          if (await canLaunchUrl(url)) {
                            await launchUrl(url, mode: LaunchMode.externalApplication);
                          }
                        }
                      : null,
                  icon: const Icon(Icons.share_rounded, size: 16),
                  label: const Text('Share'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF0F766E),
                    disabledBackgroundColor: Colors.white24,
                    disabledForegroundColor: Colors.white54,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVaMetaRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 12),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  void _showPaymentDialog(BuildContext context, Student student) async {
    final config = await TerminalSyncService.loadCachedConfig();
    final bool isPosConfigured = config != null &&
        config.posSerialNumber != null &&
        config.posSerialNumber!.isNotEmpty;

    final amountController = TextEditingController(text: student.balance.toString());
    final remarksController = TextEditingController();
    String paymentMethod = 'Cash';
    bool isProcessing = false;
    String? statusMessage;
    void Function(dynamic)? socketCallback;

    final List<String> methods = ['Cash'];
    if (isPosConfigured) {
      methods.add('POS');
    }
    methods.add('Transfer');

    if (!context.mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        void cleanup() {
          if (socketCallback != null) {
            SocketService().offEvent('payment.success', socketCallback);
            socketCallback = null;
          }
        }

        return PopScope(
          onPopInvokedWithResult: (didPop, result) {
            if (didPop) {
              cleanup();
            }
          },
          child: StatefulBuilder(
            builder: (context, setDialogState) {
              if (paymentMethod == 'Transfer' && socketCallback == null) {
                socketCallback = (data) {
                  debugPrint('[StudentPaymentSocket] Received event: $data');
                  if (data != null && data['metadata'] != null) {
                    final meta = data['metadata'] is Map
                        ? Map<String, dynamic>.from(data['metadata'] as Map)
                        : <String, dynamic>{};
                    final sId = meta['studentId']?.toString();
                    final admission = meta['admissionNumber']?.toString();
                    final va = (meta['virtualAccountNumber'] ?? meta['accountNumber'])
                        ?.toString()
                        .trim();
                    final matchesStudent = sId == student.id.toString() ||
                        sId == 'stu-${student.admissionNumber}' ||
                        admission == student.admissionNumber ||
                        (va != null &&
                            va.isNotEmpty &&
                            va == student.virtualAccountNumber?.trim());
                    if (matchesStudent) {
                      cleanup();
                      
                      final amount = double.tryParse(data['amount']?.toString() ?? '') ?? 0.0;
                      if (amount > 0) {
                        // Local VA credit path already applies debt/credit; still record payment receipt.
                        unawaited(
                          CustomerWalletCreditService.instance.applyPaymentSuccess(data),
                        );
                        context.read<SchoolBloc>().add(LoadSchoolData());
                        context.read<SchoolBloc>().add(LoadStudentRecordsEvent(student.id!));
                      }
                      
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Payment of ₦${amount.toStringAsFixed(2)} confirmed via Transfer!'),
                          backgroundColor: Colors.green,
                        ),
                      );
                      
                      Navigator.pop(ctx);
                    }
                  }
                };
                SocketService().onEvent('payment.success', socketCallback!);
              } else if (paymentMethod != 'Transfer' && socketCallback != null) {
                cleanup();
              }

              final hasVirtualAccount = student.virtualAccountNumber != null && 
                  student.virtualAccountBank != null;

              return AlertDialog(
                title: const Text('Processes Payment'),
                content: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isProcessing) ...[
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(
                          statusMessage ?? 'Processing payment...',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontStyle: FontStyle.italic),
                        ),
                      ] else ...[
                        TextField(
                          controller: amountController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Amount to Pay', prefixText: '₦ '),
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: paymentMethod,
                          decoration: const InputDecoration(labelText: 'Payment Method'),
                          items: methods.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                          onChanged: (val) => setDialogState(() {
                            paymentMethod = val!;
                          }),
                        ),
                        const SizedBox(height: 16),
                        if (paymentMethod == 'Transfer') ...[
                          if (hasVirtualAccount) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text(
                                    'TRANSFER TO THIS ACCOUNT',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.blue),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    student.virtualAccountNumber!,
                                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    student.virtualAccountBank!,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                    textAlign: TextAlign.center,
                                  ),
                                  Text(
                                    student.fullName,
                                    style: const TextStyle(fontSize: 12),
                                    textAlign: TextAlign.center,
                                  ),
                                  const Divider(),
                                  const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 12,
                                        height: 12,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                      SizedBox(width: 8),
                                      Text(
                                        'Waiting for payment confirmation...',
                                        style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                              ),
                              child: const Column(
                                children: [
                                  Icon(Icons.warning, color: Colors.red),
                                  SizedBox(height: 8),
                                  Text(
                                    'Dedicated Virtual Account not found. Please generate a virtual account first.',
                                    style: TextStyle(color: Colors.red, fontSize: 12),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                        ],
                        TextField(
                          controller: remarksController,
                          decoration: const InputDecoration(labelText: 'Remarks (Optional)'),
                        ),
                      ],
                    ],
                  ),
                ),
                actions: [
                  TextButton(
                    onPressed: isProcessing 
                        ? null 
                        : () {
                            cleanup();
                            Navigator.pop(ctx);
                          },
                    child: const Text('Cancel'),
                  ),
                  if (paymentMethod != 'Transfer')
                    ElevatedButton(
                      onPressed: isProcessing 
                          ? null 
                          : () async {
                              final amount = double.tryParse(amountController.text) ?? 0.0;
                              if (amount <= 0) return;

                              if (paymentMethod == 'POS') {
                                final connectivityResult = await Connectivity().checkConnectivity();
                                if (connectivityResult.contains(ConnectivityResult.none) || connectivityResult.isEmpty) {
                                  if (context.mounted) {
                                    showDialog(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text('No Internet'),
                                        content: const Text('POS requires an active network connection.'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
                                        ],
                                      ),
                                    );
                                  }
                                  return;
                                }

                                final terminalId = config!.terminalId ?? config.mposTerminalId ?? '2214OTGF';
                                final activeHost = config.activeHost ?? 'MEDUSA';
                                final deviceType = MposDeviceType.channelValue(MposDeviceType.resolve(config.terminalType));
                                final routingRules = config.routingRules ?? {};
                                final processOnDevice = routingRules['processOnDevice'] == true;
                                final effectiveProcessOnDevice = MposDeviceType.isMoreFun(config.terminalType) ? true : processOnDevice;

                                try {
                                  setDialogState(() {
                                    isProcessing = true;
                                    statusMessage = 'Connecting to POS terminal... Please insert card';
                                  });

                                  final result = await MposService().initiatePayment(
                                    amount: amount,
                                    terminalId: terminalId,
                                    activeHost: activeHost,
                                    processOnDevice: effectiveProcessOnDevice,
                                    deviceType: deviceType,
                                  );

                                  if (result.status == 'payment_success') {
                                    if (context.mounted) {
                                      context.read<SchoolBloc>().add(MakeStudentPaymentEvent(
                                        studentId: student.id!,
                                        amount: amount,
                                        method: 'POS',
                                        remarks: remarksController.text.isNotEmpty 
                                            ? remarksController.text 
                                            : 'POS Approved: ${result.transaction?.rrn ?? ""}',
                                      ));
                                    }

                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('POS Payment Approved!'),
                                          backgroundColor: Colors.green,
                                        ),
                                      );
                                    }

                                    Navigator.pop(ctx);
                                  } else {
                                    final errorMsg = result.error?.message ?? result.transaction?.message ?? 'POS Transaction Failed';
                                    setDialogState(() {
                                      isProcessing = false;
                                      statusMessage = null;
                                    });

                                    if (context.mounted) {
                                      showDialog(
                                        context: context,
                                        builder: (c) => AlertDialog(
                                          title: const Text('POS Payment Failed'),
                                          content: Text(errorMsg),
                                          actions: [
                                            TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
                                          ],
                                        ),
                                      );
                                    }
                                  }
                                } catch (e) {
                                  setDialogState(() {
                                    isProcessing = false;
                                    statusMessage = null;
                                  });

                                  if (context.mounted) {
                                    showDialog(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text('POS Payment Error'),
                                        content: Text('An unexpected error occurred: $e'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
                                        ],
                                      ),
                                    );
                                  }
                                }
                              } else {
                                // Cash
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
              );
            },
          ),
        );
      },
    );
  }
}
