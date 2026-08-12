import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
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
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/core/utils/progress_dialog_utils.dart';
import 'package:involve_app/core/utils/nibss_response_codes.dart';
import 'package:involve_app/core/utils/iso_response_codes.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/core/widgets/va_credentials_required_dialog.dart';
import 'package:involve_app/features/invoicing/domain/templates/pos_receipt_commands.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/invoicing/domain/templates/template_registry.dart';

class StudentProfilePage extends StatefulWidget {
  final int studentId;
  const StudentProfilePage({super.key, required this.studentId});

  @override
  State<StudentProfilePage> createState() => _StudentProfilePageState();
}

class _StudentProfilePageState extends State<StudentProfilePage> {
  bool _awaitingVaProvision = false;
  bool _awaitingPaymentSuccess = false;
  MposTransactionData? _pendingPosTx;
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
        if (_awaitingPaymentSuccess &&
            state.status == SchoolStatus.success &&
            state.lastPaymentReceipt != null) {
          _awaitingPaymentSuccess = false;
          final receipt = state.lastPaymentReceipt!;
          final posTx = _pendingPosTx;
          _pendingPosTx = null;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            unawaited(_showPaymentSuccessAndPrint(
              receipt: receipt,
              posTx: posTx,
            ));
          });
        }

        if (_awaitingPaymentSuccess &&
            state.status == SchoolStatus.failure &&
            state.error != null) {
          _awaitingPaymentSuccess = false;
          _pendingPosTx = null;
          showDialog(
            context: context,
            builder: (c) => AlertDialog(
              title: const Text('Payment Failed'),
              content: Text(
                friendlyApiError(
                  state.error,
                  fallback: 'Payment could not be completed. Please try again.',
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }

        if (!_awaitingVaProvision) return;

        if (state.error != null && state.status == SchoolStatus.failure) {
          setState(() => _awaitingVaProvision = false);
          final message = friendlyApiError(
            state.error,
            fallback: 'Could not generate virtual account. Please try again.',
          );
          final isTrialLock = message.toLowerCase().contains('free trial');
          showDialog(
            context: context,
            builder: (c) => AlertDialog(
              title: Text(isTrialLock ? 'Free Trial' : 'Virtual Account'),
              content: Text(message),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('OK'),
                ),
                if (isTrialLock)
                  TextButton(
                    onPressed: () {
                      Navigator.pop(c);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ActivationPage(isExpired: false),
                        ),
                      );
                    },
                    child: const Text('Activate'),
                  ),
              ],
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
                      _buildPaymentsTab(student, state.studentInvoices, currency),
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
        .where((inv) => inv.studentId == student.id && !inv.invoiceNumber.startsWith('PMT-'))
        .fold(0.0, (sum, inv) {
      final owing = inv.totalAmount - inv.amountPaid;
      return sum + (owing > 0 ? owing : 0);
    });
    // Prefer live open-bill debt; fall back to ledger when bills are missing.
    final debt = invoiceDebt > 0.001 ? invoiceDebt : ledgerDebt;
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

  Widget _buildPaymentsTab(Student student, List<Invoice> invoices, String currency) {
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
          subtitle: Text(
            'Method: ${inv.paymentMethod ?? "Unknown"} | ${DateFormat('dd MMM yyyy').format(inv.dateCreated)}',
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                CurrencyFormatter.formatWithSymbol(inv.amountPaid, symbol: currency),
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.info_outline, color: Colors.blueGrey),
                tooltip: 'Transaction details',
                onPressed: () => _showTransactionDetailsSheet(
                  context,
                  student: student,
                  invoice: inv,
                  currency: currency,
                ),
              ),
            ],
          ),
          onTap: () => _showTransactionDetailsSheet(
            context,
            student: student,
            invoice: inv,
            currency: currency,
          ),
        );
      },
    );
  }

  Map<String, dynamic>? _paymentBalanceMeta(Invoice invoice) {
    for (final item in invoice.items) {
      final raw = item.serviceMeta;
      if (raw == null || raw.trim().isEmpty) continue;
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          final map = Map<String, dynamic>.from(decoded);
          if (map.containsKey('balanceBefore') || map.containsKey('balanceAfter')) {
            return map;
          }
        }
      } catch (_) {
        // ignore malformed meta
      }
    }
    return null;
  }

  String _fmtLedgerAmount(double? value, String currency, {required bool isCredit}) {
    if (value == null) return '—';
    final label = isCredit ? 'Credit' : 'Balance';
    return '$label ${CurrencyFormatter.formatWithSymbol(value, symbol: currency)}';
  }

  void _showTransactionDetailsSheet(
    BuildContext context, {
    required Student student,
    required Invoice invoice,
    required String currency,
  }) {
    final meta = _paymentBalanceMeta(invoice);
    final amount = invoice.amountPaid > 0 ? invoice.amountPaid : invoice.totalAmount;
    final method = invoice.paymentMethod ?? 'Unknown';
    final when = DateFormat('dd MMM yyyy HH:mm').format(invoice.dateCreated);

    double? asDouble(dynamic v) => v == null ? null : (v as num?)?.toDouble();

    final balanceBefore = asDouble(meta?['balanceBefore']);
    final creditBefore = asDouble(meta?['creditBefore']);
    final balanceAfter = asDouble(meta?['balanceAfter']);
    final creditAfter = asDouble(meta?['creditAfter']);
    final appliedToBills = asDouble(meta?['appliedToBills']);
    final toCredit = asDouble(meta?['toCredit']);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const Text(
                  'Transaction Details',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  student.fullName,
                  style: TextStyle(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 16),
                _txDetailRow('Receipt / Bill', '#${invoice.invoiceNumber}'),
                _txDetailRow('Amount paid', CurrencyFormatter.formatWithSymbol(amount, symbol: currency)),
                _txDetailRow('Method', method),
                _txDetailRow('Status', invoice.paymentStatus),
                _txDetailRow('Date', when),
                if (invoice.className != null && invoice.className!.isNotEmpty)
                  _txDetailRow('Class', invoice.className!),
                if (invoice.termName != null && invoice.termName!.isNotEmpty)
                  _txDetailRow('Term', invoice.termName!),
                const Divider(height: 28),
                Text(
                  'BALANCE IMPACT',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 10),
                if (meta == null)
                  Text(
                    'Before/after balance was not stored for this older payment.',
                    style: TextStyle(fontSize: 13, color: Colors.orange.shade800),
                  )
                else ...[
                  _txDetailRow(
                    'Balance before',
                    _fmtLedgerAmount(balanceBefore, currency, isCredit: false),
                  ),
                  _txDetailRow(
                    'Credit before',
                    _fmtLedgerAmount(creditBefore, currency, isCredit: true),
                  ),
                  if ((appliedToBills ?? 0) > 0.001)
                    _txDetailRow(
                      'Applied to bills',
                      CurrencyFormatter.formatWithSymbol(appliedToBills!, symbol: currency),
                    ),
                  if ((toCredit ?? 0) > 0.001)
                    _txDetailRow(
                      'Added to credit',
                      CurrencyFormatter.formatWithSymbol(toCredit!, symbol: currency),
                    ),
                  _txDetailRow(
                    'Balance after',
                    _fmtLedgerAmount(balanceAfter, currency, isCredit: false),
                  ),
                  _txDetailRow(
                    'Credit after',
                    _fmtLedgerAmount(creditAfter, currency, isCredit: true),
                  ),
                ],
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showTransactionFullDetailsDialog(
                            context,
                            student: student,
                            invoice: invoice,
                            currency: currency,
                            meta: meta,
                          );
                        },
                        icon: const Icon(Icons.visibility_outlined, size: 18),
                        label: const Text('View Details'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _openReceipt(context, invoice, 'PAYMENT RECEIPT');
                        },
                        icon: const Icon(Icons.print_outlined, size: 18),
                        label: const Text('Print / Preview'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red.shade700,
                      side: BorderSide(color: Colors.red.shade200),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      _showRaiseDisputeDialog(
                        context,
                        student: student,
                        invoice: invoice,
                        currency: currency,
                      );
                    },
                    icon: const Icon(Icons.report_gmailerrorred_outlined, size: 18),
                    label: const Text('Raise Dispute'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _txDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  void _showTransactionFullDetailsDialog(
    BuildContext context, {
    required Student student,
    required Invoice invoice,
    required String currency,
    required Map<String, dynamic>? meta,
  }) {
    final amount = invoice.amountPaid > 0 ? invoice.amountPaid : invoice.totalAmount;
    final itemNames = invoice.items.map((i) => i.item.name).where((n) => n.trim().isNotEmpty).join(', ');

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Payment Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _txDetailRow('Student', student.fullName),
              _txDetailRow('Admission', student.admissionNumber),
              _txDetailRow('Receipt', '#${invoice.invoiceNumber}'),
              _txDetailRow(
                'Amount',
                CurrencyFormatter.formatWithSymbol(amount, symbol: currency),
              ),
              _txDetailRow('Method', invoice.paymentMethod ?? '—'),
              _txDetailRow('Status', invoice.paymentStatus),
              _txDetailRow(
                'Date',
                DateFormat('dd MMM yyyy HH:mm:ss').format(invoice.dateCreated),
              ),
              if (itemNames.isNotEmpty) _txDetailRow('Description', itemNames),
              if (meta != null) ...[
                const Divider(height: 20),
                _txDetailRow(
                  'Balance before',
                  _fmtLedgerAmount(
                    (meta['balanceBefore'] as num?)?.toDouble(),
                    currency,
                    isCredit: false,
                  ),
                ),
                _txDetailRow(
                  'Credit before',
                  _fmtLedgerAmount(
                    (meta['creditBefore'] as num?)?.toDouble(),
                    currency,
                    isCredit: true,
                  ),
                ),
                _txDetailRow(
                  'Balance after',
                  _fmtLedgerAmount(
                    (meta['balanceAfter'] as num?)?.toDouble(),
                    currency,
                    isCredit: false,
                  ),
                ),
                _txDetailRow(
                  'Credit after',
                  _fmtLedgerAmount(
                    (meta['creditAfter'] as num?)?.toDouble(),
                    currency,
                    isCredit: true,
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _openReceipt(context, invoice, 'PAYMENT RECEIPT');
            },
            child: const Text('PRINT / PREVIEW'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CLOSE'),
          ),
        ],
      ),
    );
  }

  void _showRaiseDisputeDialog(
    BuildContext context, {
    required Student student,
    required Invoice invoice,
    required String currency,
  }) {
    final reasonController = TextEditingController();
    String reason = 'Incorrect amount';
    final reasons = <String>[
      'Incorrect amount',
      'Duplicate payment',
      'Wrong student credited',
      'Card charged but not reflected',
      'Other',
    ];

    showDialog<void>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setLocal) {
            return AlertDialog(
              title: const Text('Raise Dispute'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Dispute payment #${invoice.invoiceNumber} for ${student.fullName}.',
                      style: const TextStyle(fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: reason,
                      decoration: const InputDecoration(labelText: 'Reason'),
                      items: reasons
                          .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                          .toList(),
                      onChanged: (v) => setLocal(() => reason = v ?? reason),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: reasonController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Details (optional)',
                        alignLabelWithHint: true,
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final amount = invoice.amountPaid > 0
                        ? invoice.amountPaid
                        : invoice.totalAmount;
                    final notes = reasonController.text.trim();
                    final pageContext = this.context;

                    Navigator.pop(ctx);

                    String? apiError;
                    try {
                      final financeRepo = pageContext.read<FinanceRepository>();
                      await financeRepo.raiseSchoolPaymentDispute({
                        'localInvoiceNumber': invoice.invoiceNumber,
                        'admissionNumber': student.admissionNumber,
                        'studentKey': 'stu-${student.admissionNumber}',
                        'studentName': student.fullName,
                        'amount': amount,
                        'paymentMethod': invoice.paymentMethod,
                        'reason': reason,
                        'details': notes.isEmpty ? null : notes,
                        'raisedBy': 'school_app',
                      });
                    } catch (e) {
                      apiError = e.toString();
                      // Fallback: still allow sharing if offline / API down.
                      final body = StringBuffer()
                        ..writeln('PAYMENT DISPUTE')
                        ..writeln(
                          'Student: ${student.fullName} (ID ${student.admissionNumber})',
                        )
                        ..writeln('Receipt: ${invoice.invoiceNumber}')
                        ..writeln(
                          'Amount: ${CurrencyFormatter.formatWithSymbol(amount, symbol: currency)}',
                        )
                        ..writeln('Method: ${invoice.paymentMethod ?? 'Unknown'}')
                        ..writeln(
                          'Date: ${DateFormat('dd MMM yyyy HH:mm').format(invoice.dateCreated)}',
                        )
                        ..writeln('Reason: $reason');
                      if (notes.isNotEmpty) body.writeln('Details: $notes');
                      await Share.share(
                        body.toString(),
                        subject: 'Payment dispute — ${invoice.invoiceNumber}',
                      );
                    }

                    if (!pageContext.mounted) return;
                    showDialog<void>(
                      context: pageContext,
                      builder: (c) => AlertDialog(
                        title: Text(
                          apiError == null
                              ? 'Dispute Submitted'
                              : 'Dispute Shared Offline',
                        ),
                        content: Text(
                          apiError == null
                              ? 'Dispute was sent to your school admin web under School Payments → Disputes.'
                              : 'Could not reach the server ($apiError). A share note was opened instead.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(c),
                            child: const Text('OK'),
                          ),
                        ],
                      ),
                    );
                  },
                  child: const Text('SUBMIT'),
                ),
              ],
            );
          },
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

  Future<void> _onGenerateVirtualAccountPressed(BuildContext context, Student student) async {
    final orgName = context.read<SettingsBloc>().state.settings?.organizationName;
    if (await showFreeTrialVaLockedIfNeeded(context, businessName: orgName)) {
      return;
    }

    setState(() => _awaitingVaProvision = true);
    context.read<SchoolBloc>().add(ProvisionStudentVirtualAccountEvent(student.id!));
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
                    : () => _onGenerateVirtualAccountPressed(context, student),
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

    // Prefill with open bill debt (same as Balance chip), not a stale ledger-only figure.
    final schoolState = context.read<SchoolBloc>().state;
    final openDebt = schoolState.studentInvoices
        .where((inv) =>
            inv.studentId == student.id && !inv.invoiceNumber.startsWith('PMT-'))
        .fold<double>(0, (sum, inv) {
      final owing = inv.totalAmount - inv.amountPaid;
      return sum + (owing > 0 ? owing : 0);
    });
    final ledgerDebt = student.balance > 0 ? student.balance : 0.0;
    final suggestPay = openDebt > 0.001 ? openDebt : ledgerDebt;

    final amountController = TextEditingController(
      text: suggestPay > 0 ? suggestPay.toStringAsFixed(2) : '',
    );
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
                                if (config == null) {
                                  if (context.mounted) {
                                    showDialog(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text('POS Not Configured'),
                                        content: const Text(
                                          'Terminal config is missing. Sync POS settings and try again.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(c),
                                            child: const Text('OK'),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                  return;
                                }

                                final connectivityResult =
                                    await Connectivity().checkConnectivity();
                                if (connectivityResult
                                        .contains(ConnectivityResult.none) ||
                                    connectivityResult.isEmpty) {
                                  if (context.mounted) {
                                    showDialog(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text('No Internet'),
                                        content: const Text(
                                          'POS requires an active network connection.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(c),
                                            child: const Text('OK'),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                  return;
                                }

                                final currency = context
                                        .read<SettingsBloc>()
                                        .state
                                        .settings
                                        ?.currency ??
                                    '₦';
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (c) => AlertDialog(
                                    title: const Text('Confirm POS Payment'),
                                    content: Text(
                                      'Charge ${CurrencyFormatter.formatWithSymbol(amount, symbol: currency)} to POS terminal for ${student.fullName}?',
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(c, false),
                                        child: const Text('CANCEL'),
                                      ),
                                      ElevatedButton(
                                        onPressed: () =>
                                            Navigator.pop(c, true),
                                        child: const Text('CHARGE'),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirm != true) return;

                                setDialogState(() {
                                  isProcessing = true;
                                  statusMessage =
                                      'Connecting to POS terminal... Please insert card';
                                });

                                try {
                                  final result =
                                      await _runStudentPosPayment(
                                    pageContext: context,
                                    config: config,
                                    amount: amount,
                                    student: student,
                                    remarks: remarksController.text,
                                  );

                                  final approved =
                                      result.status == 'payment_success' &&
                                          (result.transaction == null ||
                                              result.transaction!
                                                      .paymentSuccess ==
                                                  true);

                                  if (!approved) {
                                    final msg = result.error?.message ??
                                        result.transaction?.message ??
                                        'Card payment was not completed successfully';
                                    final formatted =
                                        result.transaction?.statusCode !=
                                                    null &&
                                                result.transaction!.statusCode!
                                                    .isNotEmpty
                                            ? NibssResponseCodes.getMessage(
                                                result.transaction!.statusCode)
                                            : getIsoResponseMessage(msg);
                                    throw Exception(
                                      formatted.isNotEmpty ? formatted : msg,
                                    );
                                  }

                                  if (context.mounted) {
                                    setState(() {
                                      _awaitingPaymentSuccess = true;
                                      _pendingPosTx = enrichPosTransactionFromEmv(
                                        result.transaction,
                                        result.emvData,
                                        amountFallback: amount,
                                      );
                                    });
                                    context.read<SchoolBloc>().add(
                                          MakeStudentPaymentEvent(
                                            studentId: student.id!,
                                            amount: amount,
                                            method: 'POS',
                                            remarks: remarksController
                                                    .text.isNotEmpty
                                                ? remarksController.text
                                                : 'POS Approved: ${result.transaction?.rrn ?? ""}',
                                          ),
                                        );
                                  }
                                  cleanup();
                                  Navigator.pop(ctx);
                                } catch (e) {
                                  setDialogState(() {
                                    isProcessing = false;
                                    statusMessage = null;
                                  });
                                  if (context.mounted) {
                                    showDialog(
                                      context: context,
                                      builder: (c) => AlertDialog(
                                        title: const Text(
                                          'POS Payment Incomplete',
                                        ),
                                        content: Text(
                                          friendlyApiError(
                                            e,
                                            fallback:
                                                'Card payment could not be completed. Please try again.',
                                          ),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(c),
                                            child: const Text('OK'),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                }
                              } else {
                                // Cash
                                setState(() {
                                  _awaitingPaymentSuccess = true;
                                  _pendingPosTx = null;
                                });
                                context.read<SchoolBloc>().add(MakeStudentPaymentEvent(
                                  studentId: student.id!,
                                  amount: amount,
                                  method: paymentMethod,
                                  remarks: remarksController.text,
                                ));
                                cleanup();
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

  /// Same Quasar/switchboard path as invoice checkout:
  /// device may return [emv_data_ready] → POST /api/pos/transaction for host approval.
  Future<MposTransactionResponse> _runStudentPosPayment({
    required BuildContext pageContext,
    required TerminalConfig config,
    required double amount,
    required Student student,
    required String remarks,
  }) async {
    final terminalId =
        config.terminalId ?? config.mposTerminalId ?? '2214OTGF';
    final activeHost = config.activeHost ?? 'MEDUSA';
    final deviceType = MposDeviceType.channelValue(
      MposDeviceType.resolve(config.terminalType),
    );
    final routingRules = config.routingRules ?? {};
    final processOnDevice = routingRules['processOnDevice'] == true;
    final effectiveProcessOnDevice =
        MposDeviceType.isMoreFun(config.terminalType)
            ? true
            : processOnDevice;

    return ProgressDialogUtils.showUpdatableProgress(
      pageContext,
      (setMessage) async {
        setMessage('Waiting for card on terminal…');
        var payment = await MposService().initiatePayment(
          amount: amount,
          terminalId: terminalId,
          activeHost: activeHost,
          processOnDevice: effectiveProcessOnDevice,
          deviceType: deviceType,
        );

        if (payment.status != 'payment_success' &&
            config.secondaryHost != null) {
          final secondaryHostName =
              config.secondaryHost!['hostCode'] as String? ??
                  config.secondaryHost!['hostName'] as String?;
          if (secondaryHostName != null &&
              secondaryHostName.toUpperCase() != activeHost.toUpperCase()) {
            setMessage('Trying backup host ($secondaryHostName)…');
            payment = await MposService().initiatePayment(
              amount: amount,
              terminalId: terminalId,
              activeHost: secondaryHostName,
              processOnDevice: effectiveProcessOnDevice,
              deviceType: deviceType,
            );
          }
        }

        // Quasar / switchboard: EMV captured on device, host confirms via Invify.
        if (payment.status == 'emv_data_ready' && payment.emvData != null) {
          setMessage(
            'Confirming payment with host…\nThis can take up to a minute.',
          );
          final financeRepo = pageContext.read<FinanceRepository>();
          final posRes = await financeRepo.apiClient.post(
            '/api/pos/transaction',
            data: {
              'terminalId': terminalId,
              'amount': amount,
              'emvData': payment.emvData!.toJson(),
              'staffName': 'School Fees',
              'items': [
                {
                  'name': remarks.trim().isEmpty
                      ? 'Student fees — ${student.fullName} (${student.admissionNumber})'
                      : remarks.trim(),
                  'quantity': 1,
                },
              ],
              'metadata': {
                'source': 'student_profile_pos',
                'studentId': student.id,
                'admissionNumber': student.admissionNumber,
              },
            },
          );
          final body = posRes.data is Map
              ? Map<String, dynamic>.from(posRes.data as Map)
              : <String, dynamic>{};
          final approved = body['paymentSuccess'] == true ||
              body['statusCode']?.toString() == '00';
          if (!approved) {
            final code = body['statusCode']?.toString() ?? '';
            final rawMsg = body['message']?.toString() ??
                body['error']?.toString() ??
                (code.isNotEmpty
                    ? NibssResponseCodes.getMessage(code)
                    : 'Host did not approve this card payment');
            throw Exception(rawMsg);
          }
          return MposTransactionResponse(
            status: 'payment_success',
            transaction: enrichPosTransactionFromEmv(
              MposTransactionData(
                paymentSuccess: true,
                statusCode: body['statusCode']?.toString() ?? '00',
                message: body['message']?.toString() ?? 'Approved',
                rrn: body['rrn']?.toString(),
                stan: body['stan']?.toString(),
                authCode: body['authCode']?.toString(),
                maskedPan: body['maskedPan']?.toString(),
                amount: amount.toStringAsFixed(2),
              ),
              payment.emvData,
              amountFallback: amount,
            ),
            emvData: payment.emvData,
          );
        }

        return payment;
      },
      initialMessage: 'Starting POS payment…',
    );
  }

  Future<void> _showPaymentSuccessAndPrint({
    required Invoice receipt,
    MposTransactionData? posTx,
  }) async {
    final currency =
        context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    final amountText = CurrencyFormatter.formatWithSymbol(
      receipt.amountPaid > 0 ? receipt.amountPaid : receipt.totalAmount,
      symbol: currency,
    );
    final method = receipt.paymentMethod ?? 'Payment';

    // Auto-print when a thermal printer is connected.
    final printResult = _printStudentPaymentReceipt(receipt, posTx: posTx);

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Payment Successful'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$method payment of $amountText recorded.'),
            const SizedBox(height: 8),
            Text(
              'Receipt: ${receipt.invoiceNumber}',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
            ),
            if (posTx?.rrn != null && posTx!.rrn!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'RRN: ${posTx.rrn}',
                style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              printResult == null
                  ? 'Receipt sent to printer.'
                  : printResult,
              style: TextStyle(
                color: printResult == null
                    ? Colors.green.shade700
                    : Colors.orange.shade800,
                fontSize: 13,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _openReceipt(context, receipt, 'PAYMENT RECEIPT');
            },
            child: const Text('VIEW RECEIPT'),
          ),
          TextButton(
            onPressed: () {
              final retry = _printStudentPaymentReceipt(receipt, posTx: posTx);
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(
                  content: Text(
                    retry == null ? 'Sent to printer again.' : retry,
                  ),
                ),
              );
            },
            child: const Text('PRINT'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('DONE'),
          ),
        ],
      ),
    );
  }

  /// Returns null on success, or a short reason if printing was skipped/failed.
  String? _printStudentPaymentReceipt(
    Invoice invoice, {
    MposTransactionData? posTx,
  }) {
    final printerBloc = context.read<PrinterBloc>();
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return 'Settings not loaded — print skipped.';
    if (printerBloc.state.connectedDevice == null) {
      return 'No printer connected. Tap PRINT after connecting one, or VIEW RECEIPT.';
    }

    try {
      final templateName =
          (settings.defaultInvoiceTemplate == 'compact' &&
                  settings.businessMode == 'school')
              ? 'school_academic'
              : (settings.defaultInvoiceTemplate ?? 'compact');

      TemplateType type;
      switch (templateName) {
        case 'detailed':
          type = TemplateType.detailed;
          break;
        case 'professional':
          type = TemplateType.professional;
          break;
        case 'modern':
          type = TemplateType.modern;
          break;
        case 'classic':
          type = TemplateType.classic;
          break;
        case 'minimalist':
          type = TemplateType.minimalist;
          break;
        case 'school_teal':
          type = TemplateType.schoolTeal;
          break;
        case 'school_color':
          type = TemplateType.schoolColor;
          break;
        case 'school_academic':
          type = TemplateType.schoolAcademic;
          break;
        case 'school_traditional':
          type = TemplateType.schoolTraditional;
          break;
        default:
          type = TemplateType.compact;
      }

      final template = TemplateRegistry.getTemplate(type);
      final commands = List<PrintCommand>.from(
        template.generateCommands(invoice, settings),
      );
      commands.insert(
        0,
        TextCommand(
          '*** PAYMENT RECEIPT (PAID) ***',
          align: 'center',
          isBold: true,
        ),
      );

      if (posTx != null) {
        commands.addAll(
          buildPosReceiptCommands(
            tx: posTx,
            merchantName: settings.organizationName,
            terminalId: null,
            currency: settings.currency,
            copyType: 'MERCHANT COPY',
            isMerged: true,
          ),
        );
      }

      printerBloc.add(PrintCommandsEvent(commands, settings.paperWidth));
      return null;
    } catch (e) {
      return 'Print error: $e';
    }
  }
}
