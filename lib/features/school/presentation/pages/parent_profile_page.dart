import 'dart:typed_data';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:involve_app/core/mpos/mpos_device_type.dart';
import 'package:involve_app/core/pos/nibss_geo.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/iso_response_codes.dart';
import 'package:involve_app/core/utils/nibss_response_codes.dart';
import 'package:involve_app/core/utils/progress_dialog_utils.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/school/domain/entities/school_entities.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_allocator.dart';
import 'package:involve_app/features/school/domain/services/parent_payment_receipt_service.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/features/school_finance/domain/services/payment_catch_up_service.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/widgets/va_credentials_required_dialog.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/settings/domain/entities/user_plan.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:involve_app/services/terminal_sync_service.dart';

import '../bloc/school_bloc.dart';
import '../bloc/school_state.dart';
import 'student_profile_page.dart';

class ParentProfilePage extends StatefulWidget {
  final int parentId;
  const ParentProfilePage({super.key, required this.parentId});

  @override
  State<ParentProfilePage> createState() => _ParentProfilePageState();
}

class _ParentProfilePageState extends State<ParentProfilePage> {
  bool _awaitingPayment = false;
  bool _awaitingCreditMap = false;
  bool _awaitingVa = false;
  bool _awaitingParentSave = false;
  bool _refreshingAccounts = false;
  int _historyTick = 0;

  Future<void> _refreshInvifyAndQuasar(SchoolParent parent) async {
    if (_refreshingAccounts) return;
    setState(() => _refreshingAccounts = true);
    final va = parent.virtualAccountNumber?.trim() ?? '';
    try {
      final applied = va.isNotEmpty
          ? await PaymentCatchUpService.instance.refreshVirtualAccount(accountNumber: va)
          : await PaymentCatchUpService.instance.runCatchUp(
              force: true,
              lookback: const Duration(days: 30),
              showBanner: false,
            );
      if (!mounted) return;
      context.read<SchoolBloc>().add(LoadSchoolData());
      setState(() => _historyTick++);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            applied > 0
                ? 'Updated from Invify & Quasar · $applied payment${applied == 1 ? '' : 's'} applied'
                : 'Accounts refreshed. No new Quasar credits found.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(friendlyApiError(e, fallback: 'Could not refresh Invify / Quasar.')),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _refreshingAccounts = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SchoolBloc, SchoolState>(
      listener: (context, state) async {
        if (_awaitingPayment &&
            state.status == SchoolStatus.success &&
            state.lastParentPayment != null) {
          _awaitingPayment = false;
          setState(() => _historyTick++);
          final parent = _parentOf(state);
          if (parent == null || !mounted) return;
          await _showPaymentSuccess(
            context,
            payment: state.lastParentPayment!,
            parent: parent,
            children: _childrenOf(state),
          );
        }
        if (_awaitingPayment && state.status == SchoolStatus.failure) {
          _awaitingPayment = false;
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error ?? 'Payment failed'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        if (_awaitingCreditMap &&
            state.status == SchoolStatus.success &&
            state.lastParentPayment?.source == 'credit_map') {
          _awaitingCreditMap = false;
          setState(() => _historyTick++);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Mapped ${CurrencyFormatter.formatWithSymbol(state.lastParentPayment!.appliedToDebt)} to children.',
              ),
            ),
          );
        }
        if (_awaitingCreditMap && state.status == SchoolStatus.failure) {
          _awaitingCreditMap = false;
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error ?? 'Could not map parent credit'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        if (_awaitingVa && state.status == SchoolStatus.success) {
          _awaitingVa = false;
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Parent virtual account is ready.')),
          );
        }
        if (_awaitingVa && state.status == SchoolStatus.failure) {
          _awaitingVa = false;
          if (!mounted) return;
          await showVirtualAccountFailureDialog(
            context,
            state.error ?? 'Could not generate virtual account',
            subject: 'parent virtual account',
          );
        }
        if (_awaitingParentSave && state.status == SchoolStatus.success) {
          _awaitingParentSave = false;
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Parent details saved.')),
          );
        }
        if (_awaitingParentSave && state.status == SchoolStatus.failure) {
          _awaitingParentSave = false;
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.error ?? 'Could not save parent details'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
      },
      builder: (context, state) {
        final parent = _parentOf(state);
        if (parent == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Parent')),
            body: const Center(child: Text('Parent not found')),
          );
        }
        final children = _childrenOf(state);
        final outstanding = children.fold<double>(
          0,
          (sum, s) => sum + (s.balance > 0 ? s.balance : 0),
        );
        final shareMode = ParentPaymentShareModeX.fromStorage(
          context.read<SettingsBloc>().state.settings?.parentPaymentShareMode,
        );
        final canMapCredit = parent.creditBalance > 0.001 && outstanding > 0.001;
        return Scaffold(
          appBar: AppBar(
            title: Text(parent.fullName),
            actions: [
              IconButton(
                tooltip: 'Refresh Invify & Quasar',
                onPressed: _refreshingAccounts ? null : () => _refreshInvifyAndQuasar(parent),
                icon: _refreshingAccounts
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.refresh_rounded),
              ),
              IconButton(
                tooltip: 'Edit parent',
                icon: const Icon(Icons.edit_outlined),
                onPressed: state.isLoading ? null : () => _showEditParentDialog(context, parent),
              ),
              IconButton(
                tooltip: 'Print statement',
                icon: const Icon(Icons.print_outlined),
                onPressed: () => _printOrShareStatement(
                  context,
                  parent: parent,
                  children: children,
                  outstanding: outstanding,
                  sharePdf: false,
                ),
              ),
              IconButton(
                tooltip: 'Statement PDF',
                icon: const Icon(Icons.picture_as_pdf_outlined),
                onPressed: () => _printOrShareStatement(
                  context,
                  parent: parent,
                  children: children,
                  outstanding: outstanding,
                  sharePdf: true,
                ),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _parentContactCard(context, parent),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      'Total outstanding',
                      CurrencyFormatter.formatWithSymbol(outstanding),
                      outstanding > 0 ? Colors.red.shade700 : Colors.green.shade700,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      'Parent credit',
                      CurrencyFormatter.formatWithSymbol(parent.creditBalance),
                      Colors.indigo,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: state.isLoading
                      ? null
                      : () => _showFundDialog(
                            context,
                            parent: parent,
                            children: children,
                            outstanding: outstanding,
                          ),
                  icon: const Icon(Icons.account_balance_wallet_outlined),
                  label: const Text('Fund / pay outstanding'),
                ),
              ),
              if (canMapCredit) ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: state.isLoading
                        ? null
                        : () => _showMapCreditDialog(
                              context,
                              parent: parent,
                              children: children,
                            ),
                    icon: const Icon(Icons.assignment_turned_in_outlined),
                    label: const Text('Map parent credit to children'),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Text(
                shareMode.fundHint(outstanding: outstanding),
                style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade700),
              ),
              const SizedBox(height: 4),
              Text(
                'Rule: ${shareMode.title}. Cash or the school account on every plan. Card and virtual account need Standard or Premium.',
                style: TextStyle(fontSize: 12, color: Colors.blueGrey.shade600),
              ),
              const SizedBox(height: 20),
              const Text('Virtual account', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              if (parent.hasCanonicalVa)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.account_balance),
                    title: Text(parent.virtualAccountNumber!),
                    subtitle: Text(
                      '${parent.virtualAccountBank ?? 'Bank'}'
                      '${parent.virtualAccounts.any((v) => !v.isCanonical) ? ' · extra legacy numbers still accepted' : ''}',
                    ),
                  ),
                )
              else ...[
                const Text('No parent virtual account yet. One number covers all children.'),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: state.isLoading || _awaitingVa
                        ? null
                        : () => _onGenerateVaPressed(context, parent),
                    icon: _awaitingVa
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add_card_outlined),
                    label: Text(_awaitingVa ? 'Generating…' : 'Generate parent virtual account'),
                  ),
                ),
              ],
              if (parent.virtualAccounts.where((v) => !v.isCanonical).isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text('Legacy account numbers (still receive payments)'),
                ...parent.virtualAccounts.where((v) => !v.isCanonical).map(
                      (v) => ListTile(
                        dense: true,
                        title: Text(v.accountNumber),
                        subtitle: Text(v.bankName ?? 'Legacy'),
                      ),
                    ),
              ],
              const SizedBox(height: 20),
              const Text('Children', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              ...children.map((s) {
                final debt = s.balance > 0 ? s.balance : 0.0;
                final className = _classNameOf(s, state);
                return Card(
                  child: ListTile(
                    title: Text(s.fullName),
                    subtitle: Text(
                      className.isEmpty
                          ? s.admissionNumber
                          : '$className · ${s.admissionNumber}',
                    ),
                    trailing: Text(
                      CurrencyFormatter.formatWithSymbol(debt),
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: debt > 0 ? Colors.red.shade700 : Colors.green.shade700,
                      ),
                    ),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StudentProfilePage(studentId: s.id!),
                      ),
                    ),
                  ),
                );
              }),
              const Divider(height: 32),
              Text(
                'Child outstanding total ${CurrencyFormatter.formatWithSymbol(outstanding)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 20),
              const Text('Payment history', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              FutureBuilder<List<ParentPaymentRecord>>(
                key: ValueKey(_historyTick),
                future: context.read<SchoolBloc>().repository.getParentPayments(widget.parentId),
                builder: (context, snap) {
                  if (!snap.hasData) {
                    return const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text('Loading payments…'),
                    );
                  }
                  final payments = snap.data!;
                  if (payments.isEmpty) {
                    return const Text('No parent-account payments yet.');
                  }
                  return Column(
                    children: payments.map((p) {
                      return Card(
                        child: ExpansionTile(
                          title: Text(CurrencyFormatter.formatWithSymbol(p.amount)),
                          subtitle: Text(
                            '${DateFormat('dd MMM yyyy HH:mm').format(p.createdAt)}'
                            ' · ${ParentPaymentReceiptService.methodLabel(p.source)}',
                          ),
                          children: [
                            ListTile(
                              dense: true,
                              title: Text(
                                'Applied ${CurrencyFormatter.formatWithSymbol(p.appliedToDebt)} · '
                                'Credit ${CurrencyFormatter.formatWithSymbol(p.toCredit)}',
                              ),
                              subtitle: Text('Ref ${p.reference}'),
                            ),
                            ...p.allocations.map((a) {
                              Student? child;
                              for (final s in children) {
                                if (s.id == a.studentId) {
                                  child = s;
                                  break;
                                }
                              }
                              return ListTile(
                                dense: true,
                                title: Text(child?.fullName ?? 'Student ${a.studentId}'),
                                subtitle: Text(
                                  'Before ${CurrencyFormatter.formatWithSymbol(a.outstandingBefore)} → '
                                  'allocated ${CurrencyFormatter.formatWithSymbol(a.allocated)} → '
                                  'after ${CurrencyFormatter.formatWithSymbol(a.outstandingAfter)}',
                                ),
                              );
                            }),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _printReceipt(
                                        context,
                                        payment: p,
                                        parent: parent,
                                        children: children,
                                      ),
                                      icon: const Icon(Icons.print, size: 18),
                                      label: const Text('Print'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _shareOrPrintPdf(
                                        context,
                                        payment: p,
                                        parent: parent,
                                        children: children,
                                        share: true,
                                      ),
                                      icon: const Icon(Icons.picture_as_pdf, size: 18),
                                      label: const Text('PDF'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _parentContactCard(BuildContext context, SchoolParent parent) {
    final state = context.watch<SchoolBloc>().state;
    final fromChildren = state.students
        .where((s) =>
            (parent.id != null && s.parentId == parent.id) ||
            s.parentKey == parent.parentKey)
        .map((s) => (s.parentPhone ?? '').trim())
        .firstWhere((p) => p.isNotEmpty, orElse: () => '');
    final phone = (parent.phone ?? '').trim().isNotEmpty
        ? (parent.phone ?? '').trim()
        : fromChildren;
    final email = (parent.email ?? '').trim();
    final address = (parent.address ?? '').trim();
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Parent information', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
                TextButton.icon(
                  onPressed: () => _showEditParentDialog(context, parent),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Edit'),
                ),
              ],
            ),
            _infoRow(Icons.person_outline, parent.fullName),
            _infoRow(
              Icons.phone_outlined,
              phone.isEmpty ? 'No phone' : phone,
              onTap: phone.isEmpty ? null : () => _launchContact('tel', phone),
            ),
            _infoRow(
              Icons.email_outlined,
              email.isEmpty ? 'No email' : email,
              onTap: email.isEmpty ? null : () => _launchEmail(email, parent.fullName),
            ),
            _infoRow(Icons.home_outlined, address.isEmpty ? 'No address' : address),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: phone.isEmpty ? null : () => _launchContact('tel', phone),
                  icon: const Icon(Icons.call, size: 18),
                  label: const Text('Call'),
                ),
                FilledButton.tonalIcon(
                  onPressed: phone.isEmpty ? null : () => _launchContact('sms', phone),
                  icon: const Icon(Icons.sms_outlined, size: 18),
                  label: const Text('Message'),
                ),
                FilledButton.tonalIcon(
                  onPressed: phone.isEmpty ? null : () => _launchContact('whatsapp', phone),
                  icon: const Icon(Icons.chat_outlined, size: 18),
                  label: const Text('WhatsApp'),
                ),
                FilledButton.tonalIcon(
                  onPressed: email.isEmpty ? null : () => _launchEmail(email, parent.fullName),
                  icon: const Icon(Icons.mail_outline, size: 18),
                  label: const Text('Email'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String value, {VoidCallback? onTap}) {
    final row = Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.blueGrey),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(height: 1.3))),
        ],
      ),
    );
    if (onTap == null) return row;
    return InkWell(onTap: onTap, child: row);
  }

  String _digitsOnly(String raw) => raw.replaceAll(RegExp(r'[^0-9+]'), '');

  String _whatsappNumber(String raw) {
    var n = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (n.startsWith('0') && n.length >= 10) {
      n = '234${n.substring(1)}';
    }
    return n;
  }

  Future<void> _launchContact(String kind, String phone) async {
    final Uri uri;
    if (kind == 'whatsapp') {
      uri = Uri.parse('https://wa.me/${_whatsappNumber(phone)}');
    } else {
      uri = Uri(scheme: kind, path: _digitsOnly(phone));
    }
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open $kind for this number')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open $kind for this number')),
      );
    }
  }

  Future<void> _launchEmail(String email, String name) async {
    final uri = Uri(
      scheme: 'mailto',
      path: email,
      query: 'subject=${Uri.encodeComponent('Message from school — $name')}',
    );
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open email')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open email')),
      );
    }
  }

  Future<void> _showEditParentDialog(BuildContext context, SchoolParent parent) async {
    final nameCtrl = TextEditingController(text: parent.fullName);
    final phoneCtrl = TextEditingController(text: parent.phone ?? '');
    final emailCtrl = TextEditingController(text: parent.email ?? '');
    final addressCtrl = TextEditingController(text: parent.address ?? '');
    final formKey = GlobalKey<FormState>();
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit parent'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Full name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (v) => (v ?? '').trim().isEmpty ? 'Name is required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (v) {
                    final value = (v ?? '').trim();
                    if (value.isEmpty) return null;
                    if (!value.contains('@') || !value.contains('.')) {
                      return 'Enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: addressCtrl,
                  textCapitalization: TextCapitalization.sentences,
                  minLines: 2,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Address',
                    prefixIcon: Icon(Icons.home_outlined),
                    alignLabelWithHint: true,
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState?.validate() != true) return;
              Navigator.pop(ctx, true);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    final name = nameCtrl.text.trim();
    final phone = phoneCtrl.text.trim();
    final email = emailCtrl.text.trim();
    final address = addressCtrl.text.trim();
    nameCtrl.dispose();
    phoneCtrl.dispose();
    emailCtrl.dispose();
    addressCtrl.dispose();
    if (saved != true || !mounted) return;
    setState(() => _awaitingParentSave = true);
    context.read<SchoolBloc>().add(
          UpdateParentEvent(
            SchoolParent(
              id: parent.id,
              syncId: parent.syncId,
              fullName: name,
              phone: phone.isEmpty ? null : phone,
              email: email.isEmpty ? null : email,
              address: address.isEmpty ? null : address,
              virtualAccountNumber: parent.virtualAccountNumber,
              virtualAccountBank: parent.virtualAccountBank,
              virtualAccountName: parent.virtualAccountName,
              virtualAccountStatus: parent.virtualAccountStatus,
              creditBalance: parent.creditBalance,
              createdAt: parent.createdAt,
              virtualAccounts: parent.virtualAccounts,
            ),
          ),
        );
  }

  SchoolParent? _parentOf(SchoolState state) {
    for (final p in state.parents) {
      if (p.id == widget.parentId) return p;
    }
    return null;
  }

  List<Student> _childrenOf(SchoolState state) {
    return state.students.where((s) => s.parentId == widget.parentId).toList()
      ..sort((a, b) => a.fullName.toLowerCase().compareTo(b.fullName.toLowerCase()));
  }

  String _classNameOf(Student student, SchoolState state) {
    for (final c in state.classes) {
      if (c.id == student.classId) return c.name;
    }
    return '';
  }

  Future<void> _showMapCreditDialog(
    BuildContext context, {
    required SchoolParent parent,
    required List<Student> children,
  }) async {
    final owing = children
        .where((s) => (s.balance > 0.001) && s.id != null)
        .toList();
    if (owing.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No outstanding children to map this credit to.')),
      );
      return;
    }

    final controllers = <int, TextEditingController>{
      for (final child in owing)
        child.id!: TextEditingController(),
    };

    await showDialog<void>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            double parsed(TextEditingController c) =>
                double.tryParse(c.text.trim()) ?? 0;
            final total = controllers.values.fold<double>(0, (sum, c) => sum + parsed(c));
            return AlertDialog(
              title: const Text('Map parent credit'),
              content: SizedBox(
                width: 420,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Parent credit ${CurrencyFormatter.formatWithSymbol(parent.creditBalance)}. '
                        'Enter how much to apply to each child.',
                        style: const TextStyle(fontSize: 13, color: Colors.blueGrey),
                      ),
                      const SizedBox(height: 12),
                      ...owing.map((child) {
                        final debt = child.balance > 0 ? child.balance : 0.0;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: TextField(
                            controller: controllers[child.id!],
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            onChanged: (_) => setDialogState(() {}),
                            decoration: InputDecoration(
                              labelText: child.fullName,
                              helperText: 'Owes ${CurrencyFormatter.formatWithSymbol(debt)}',
                              prefixText: '₦ ',
                            ),
                          ),
                        );
                      }),
                      Text(
                        'Mapping ${CurrencyFormatter.formatWithSymbol(total)} of '
                        '${CurrencyFormatter.formatWithSymbol(parent.creditBalance)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: total > parent.creditBalance + 0.001
                              ? Colors.red.shade700
                              : Colors.indigo,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: total <= 0.001 || total > parent.creditBalance + 0.001
                      ? null
                      : () {
                          final amounts = <int, double>{};
                          for (final child in owing) {
                            final amount = parsed(controllers[child.id!]!);
                            if (amount <= 0.001) continue;
                            if (amount > child.balance + 0.001) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    '${child.fullName} only owes ${CurrencyFormatter.formatWithSymbol(child.balance)}.',
                                  ),
                                ),
                              );
                              return;
                            }
                            amounts[child.id!] = amount;
                          }
                          if (amounts.isEmpty) return;
                          Navigator.pop(ctx);
                          setState(() => _awaitingCreditMap = true);
                          context.read<SchoolBloc>().add(
                                MapParentCreditEvent(
                                  parentId: parent.id!,
                                  amountsByStudentId: amounts,
                                ),
                              );
                        },
                  child: const Text('Map credit'),
                ),
              ],
            );
          },
        );
      },
    );

    for (final c in controllers.values) {
      c.dispose();
    }
  }

  bool get _hasOnlinePlan =>
      context.read<SettingsBloc>().state.userPlan?.hasOnlineAccess == true;

  Future<void> _onGenerateVaPressed(BuildContext context, SchoolParent parent) async {
    if (!_hasOnlinePlan) {
      _showPlanLock(context, 'Virtual accounts');
      return;
    }
    final orgName = context.read<SettingsBloc>().state.settings?.organizationName;
    if (await showFreeTrialVaLockedIfNeeded(context, businessName: orgName)) {
      return;
    }
    setState(() => _awaitingVa = true);
    context.read<SchoolBloc>().add(ProvisionParentVirtualAccountEvent(parent.id!));
  }

  void _showPlanLock(BuildContext context, String featureName) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.lock_outline, color: Colors.orange),
            SizedBox(width: 8),
            Text('Feature locked'),
          ],
        ),
        content: Text(
          '$featureName are available on Standard and Premium plans.\n\n'
          '• ${UserPlan.basicSummary}\n'
          '• ${UserPlan.standardSummary}\n'
          '• ${UserPlan.premiumSummary}',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('NOT NOW')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ActivationPage(isExpired: false)),
              );
            },
            child: const Text('UPGRADE'),
          ),
        ],
      ),
    );
  }

  Future<void> _showFundDialog(
    BuildContext context, {
    required SchoolParent parent,
    required List<Student> children,
    required double outstanding,
  }) async {
    final settings = context.read<SettingsBloc>().state.settings;
    final config = await TerminalSyncService.loadCachedConfig();
    final posReady = config != null &&
        (config.posSerialNumber ?? '').isNotEmpty;
    final hasSchoolAccount = settings != null &&
        (settings.accountNumber ?? '').trim().isNotEmpty &&
        (settings.bankName ?? '').trim().isNotEmpty;

    if (!context.mounted) return;

    final amountController = TextEditingController(
      text: outstanding > 0 ? outstanding.toStringAsFixed(2) : '',
    );
    final remarksController = TextEditingController();
    var method = 'Cash';
    var processing = false;
    String? status;

    final canUseCard = (context.read<SettingsBloc>().state.userPlan?.hasOnlineAccess ?? false);
    final methods = <String>['Cash'];
    if (canUseCard && posReady) methods.add('POS');
    methods.add('Company Account');

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Fund parent account'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (processing) ...[
                      const Center(child: CircularProgressIndicator()),
                      const SizedBox(height: 12),
                      Text(status ?? 'Processing…', textAlign: TextAlign.center),
                    ] else ...[
                      Text(
                        ParentPaymentShareModeX.fromStorage(
                          settings?.parentPaymentShareMode,
                        ).fundHint(outstanding: outstanding),
                        style: const TextStyle(fontSize: 13, color: Colors.blueGrey),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: amountController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Amount',
                          prefixText: '₦ ',
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (!canUseCard)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            'Card payments require a Standard or Premium plan.',
                            style: TextStyle(fontSize: 12, color: Colors.orange.shade800),
                          ),
                        ),
                      DropdownButtonFormField<String>(
                        value: method,
                        decoration: const InputDecoration(labelText: 'Payment method'),
                        items: methods
                            .map(
                              (m) => DropdownMenuItem(
                                value: m,
                                child: Text(m == 'POS'
                                    ? 'Card (POS)'
                                    : m == 'Company Account'
                                        ? 'School account'
                                        : m),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => setDialogState(() => method = v!),
                      ),
                      if (method == 'Company Account') ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.indigo.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.indigo.withValues(alpha: 0.2)),
                          ),
                          child: hasSchoolAccount
                              ? Column(
                                  children: [
                                    const Text(
                                      'PAY INTO SCHOOL ACCOUNT',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 11,
                                        color: Colors.indigo,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      settings.accountNumber!,
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    Text(settings.bankName!, style: const TextStyle(fontWeight: FontWeight.w700)),
                                    if ((settings.accountName ?? '').isNotEmpty)
                                      Text(settings.accountName!),
                                    const SizedBox(height: 6),
                                    const Text(
                                      'Record the payment after the transfer is confirmed.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontSize: 11, color: Colors.blueGrey),
                                    ),
                                  ],
                                )
                              : const Text(
                                  'School account details are missing. Add bank name and account number in Settings.',
                                  textAlign: TextAlign.center,
                                ),
                        ),
                      ],
                      const SizedBox(height: 12),
                      TextField(
                        controller: remarksController,
                        decoration: const InputDecoration(labelText: 'Remarks (optional)'),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: processing ? null : () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: processing
                      ? null
                      : () async {
                          final amount = double.tryParse(amountController.text.trim()) ?? 0;
                          if (amount <= 0) return;
                          if (method == 'Company Account' && !hasSchoolAccount) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Add the school account in Settings first.')),
                            );
                            return;
                          }

                          if (method == 'POS') {
                            if (config == null) return;
                            final net = await Connectivity().checkConnectivity();
                            if (net.contains(ConnectivityResult.none) || net.isEmpty) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Card payment needs an internet connection.')),
                                );
                              }
                              return;
                            }
                            final ok = await showDialog<bool>(
                              context: context,
                              builder: (c) => AlertDialog(
                                title: const Text('Confirm card payment'),
                                content: Text(
                                  'Charge ${CurrencyFormatter.formatWithSymbol(amount)} for ${parent.fullName}?',
                                ),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('CANCEL')),
                                  FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('CHARGE')),
                                ],
                              ),
                            );
                            if (ok != true) return;
                            setDialogState(() {
                              processing = true;
                              status = 'Waiting for card on the POS terminal…';
                            });
                            try {
                              final result = await _runParentPosPayment(
                                pageContext: context,
                                config: config,
                                amount: amount,
                                parent: parent,
                                remarks: remarksController.text,
                              );
                              final approved = result.status == 'payment_success' &&
                                  (result.transaction == null ||
                                      result.transaction!.paymentSuccess == true);
                              if (!approved) {
                                final msg = result.error?.message ??
                                    result.transaction?.message ??
                                    'Card payment was not completed';
                                throw Exception(msg);
                              }
                              if (!mounted) return;
                              setState(() => _awaitingPayment = true);
                              context.read<SchoolBloc>().add(
                                    MakeParentPaymentEvent(
                                      parentId: parent.id!,
                                      amount: amount,
                                      method: 'POS',
                                      remarks: remarksController.text,
                                    ),
                                  );
                              Navigator.pop(ctx);
                            } catch (e) {
                              setDialogState(() {
                                processing = false;
                                status = null;
                              });
                              if (context.mounted) {
                                showDialog(
                                  context: context,
                                  builder: (c) => AlertDialog(
                                    title: const Text('Card payment incomplete'),
                                    content: Text(friendlyApiError(e, fallback: '$e')),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
                                    ],
                                  ),
                                );
                              }
                            }
                            return;
                          }

                          setState(() => _awaitingPayment = true);
                          context.read<SchoolBloc>().add(
                                MakeParentPaymentEvent(
                                  parentId: parent.id!,
                                  amount: amount,
                                  method: method,
                                  remarks: remarksController.text,
                                ),
                              );
                          Navigator.pop(ctx);
                        },
                  child: Text(method == 'POS' ? 'Charge card' : 'Record payment'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<MposTransactionResponse> _runParentPosPayment({
    required BuildContext pageContext,
    required TerminalConfig config,
    required double amount,
    required SchoolParent parent,
    required String remarks,
  }) async {
    final terminalId = config.terminalId ?? config.mposTerminalId ?? '2214OTGF';
    final activeHost = config.activeHost ?? 'MEDUSA';
    final deviceType = MposDeviceType.channelValue(
      MposDeviceType.resolve(config.terminalType),
    );
    final routingRules = config.routingRules ?? {};
    final processOnDevice = routingRules['processOnDevice'] == true;
    final effectiveProcessOnDevice =
        MposDeviceType.isMoreFun(config.terminalType) ? true : processOnDevice;
    final geo = await NibssGeo.capture();
    if (geo != null) {
      await MposService().saveGeoCoordinates(
        latitude: geo.latitude,
        longitude: geo.longitude,
        deviceType: deviceType,
      );
    }

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
          latitude: geo?.latitude,
          longitude: geo?.longitude,
        );
        if (payment.status != 'payment_success' && config.secondaryHost != null) {
          final secondaryHostName = config.secondaryHost!['hostCode'] as String? ??
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
              latitude: geo?.latitude,
              longitude: geo?.longitude,
            );
          }
        }
        if (payment.status == 'emv_data_ready' && payment.emvData != null) {
          setMessage('Confirming payment with host…');
          final financeRepo = pageContext.read<FinanceRepository>();
          final posRes = await financeRepo.apiClient.post(
            '/api/pos/transaction',
            data: {
              'terminalId': terminalId,
              'amount': amount,
              'emvData': payment.emvData!.toJson(),
              'staffName': 'Parent fees',
              'items': [
                {
                  'name': remarks.trim().isEmpty
                      ? 'Parent fees — ${parent.fullName}'
                      : remarks.trim(),
                  'quantity': 1,
                },
              ],
              'metadata': {
                'source': 'parent_profile_pos',
                'parentId': parent.id,
                'parentName': parent.fullName,
              },
              if (geo != null) 'latitude': geo.latitude,
              if (geo != null) 'longitude': geo.longitude,
              if (geo != null) 'field120': geo.field120,
              if (geo != null) 'geofencing': geo.toJson(),
            },
          );
          final body = posRes.data is Map
              ? Map<String, dynamic>.from(posRes.data as Map)
              : <String, dynamic>{};
          final approved =
              body['paymentSuccess'] == true || body['statusCode']?.toString() == '00';
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
            transaction: MposTransactionData(
              paymentSuccess: true,
              statusCode: body['statusCode']?.toString() ?? '00',
              message: body['message']?.toString() ?? 'Approved',
              rrn: body['rrn']?.toString(),
              stan: body['stan']?.toString(),
              authCode: body['authCode']?.toString(),
              maskedPan: body['maskedPan']?.toString(),
              amount: amount.toStringAsFixed(2),
            ),
            emvData: payment.emvData,
          );
        }
        if (payment.transaction?.statusCode != null &&
            payment.transaction!.statusCode!.isNotEmpty &&
            payment.status != 'payment_success') {
          final formatted = NibssResponseCodes.getMessage(payment.transaction!.statusCode);
          if (formatted.isEmpty) {
            throw Exception(getIsoResponseMessage(payment.transaction!.message ?? ''));
          }
          if (formatted.isNotEmpty) {
            throw Exception(formatted);
          }
        }
        return payment;
      },
      initialMessage: 'Starting card payment…',
    );
  }

  Future<void> _showPaymentSuccess(
    BuildContext context, {
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
  }) async {
    final printNote = _sendToThermal(context, payment: payment, parent: parent, children: children);
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Payment recorded'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${ParentPaymentReceiptService.methodLabel(payment.source)} '
              '${CurrencyFormatter.formatWithSymbol(payment.amount)} recorded.',
            ),
            const SizedBox(height: 8),
            Text('Applied ${CurrencyFormatter.formatWithSymbol(payment.appliedToDebt)} · '
                'Credit ${CurrencyFormatter.formatWithSymbol(payment.toCredit)}'),
            if (payment.appliedToDebt <= 0.001 && payment.toCredit > 0.001) ...[
              const SizedBox(height: 8),
              const Text(
                'Nothing was applied to children yet. Use Map parent credit to children when you are ready.',
                style: TextStyle(fontSize: 13),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              printNote ?? 'Receipt sent to printer.',
              style: TextStyle(
                color: printNote == null ? Colors.green.shade700 : Colors.orange.shade800,
                fontSize: 13,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _shareOrPrintPdf(context, payment: payment, parent: parent, children: children, share: false);
            },
            child: const Text('PDF / PRINT'),
          ),
          TextButton(
            onPressed: () {
              final retry = _sendToThermal(context, payment: payment, parent: parent, children: children);
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(content: Text(retry ?? 'Sent to printer again.')),
              );
            },
            child: const Text('PRINTER'),
          ),
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('DONE')),
        ],
      ),
    );
  }

  String? _sendToThermal(
    BuildContext context, {
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
  }) {
    final printerBloc = context.read<PrinterBloc>();
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return 'Settings not loaded — print skipped.';
    if (printerBloc.state.connectedDevice == null) {
      return 'No printer connected. Use PDF or connect a printer.';
    }
    try {
      printerBloc.add(
        PrintCommandsEvent(
          ParentPaymentReceiptService.thermalCommands(
            payment: payment,
            parent: parent,
            children: children,
            settings: settings,
          ),
          settings.paperWidth,
        ),
      );
      return null;
    } catch (e) {
      return 'Print error: $e';
    }
  }

  Future<void> _printReceipt(
    BuildContext context, {
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
  }) async {
    final note = _sendToThermal(context, payment: payment, parent: parent, children: children);
    if (note == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sent to printer.')),
      );
      return;
    }
    await _shareOrPrintPdf(context, payment: payment, parent: parent, children: children, share: false);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(note)));
    }
  }

  Future<void> _shareOrPrintPdf(
    BuildContext context, {
    required ParentPaymentRecord payment,
    required SchoolParent parent,
    required List<Student> children,
    required bool share,
  }) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;
    final bytes = await ParentPaymentReceiptService.buildPdf(
      payment: payment,
      parent: parent,
      children: children,
      settings: settings,
    );
    final name = 'parent-receipt-${payment.reference}.pdf';
    if (share) {
      await Printing.sharePdf(bytes: bytes, filename: name);
    } else {
      await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => bytes);
    }
  }

  Future<void> _printOrShareStatement(
    BuildContext context, {
    required SchoolParent parent,
    required List<Student> children,
    required double outstanding,
    required bool sharePdf,
  }) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;
    final payments = await context.read<SchoolBloc>().repository.getParentPayments(widget.parentId);
    if (payments.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No payment records to print yet.')),
        );
      }
      return;
    }
    if (sharePdf || context.read<PrinterBloc>().state.connectedDevice == null) {
      final combined = await _buildStatementPdf(
        settings: settings,
        parent: parent,
        children: children,
        outstanding: outstanding,
        payments: payments,
      );
      final name = 'parent-statement-${parent.id}.pdf';
      if (sharePdf) {
        await Printing.sharePdf(bytes: combined, filename: name);
      } else {
        await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => combined);
      }
      return;
    }
    final printerBloc = context.read<PrinterBloc>();
    for (final p in payments.take(8)) {
      printerBloc.add(
        PrintCommandsEvent(
          ParentPaymentReceiptService.thermalCommands(
            payment: p,
            parent: parent,
            children: children,
            settings: settings,
          ),
          settings.paperWidth,
        ),
      );
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sending payment records to printer.')),
      );
    }
  }

  Future<Uint8List> _buildStatementPdf({
    required AppSettings settings,
    required SchoolParent parent,
    required List<Student> children,
    required double outstanding,
    required List<ParentPaymentRecord> payments,
  }) {
    return ParentPaymentReceiptService.buildPdf(
      payment: ParentPaymentRecord(
        parentId: parent.id!,
        reference: 'STATEMENT-${parent.id}',
        amount: payments.fold(0, (s, p) => s + p.amount),
        appliedToDebt: payments.fold(0, (s, p) => s + p.appliedToDebt),
        toCredit: payments.fold(0, (s, p) => s + p.toCredit),
        parentOutstandingBefore: payments.isEmpty ? outstanding : payments.last.parentOutstandingBefore,
        parentOutstandingAfter: outstanding,
        parentCreditBefore: 0,
        parentCreditAfter: parent.creditBalance,
        source: 'statement',
        createdAt: DateTime.now(),
        allocations: children
            .map(
              (s) => ParentPaymentAllocationRecord(
                studentId: s.id!,
                outstandingBefore: s.balance > 0 ? s.balance : 0,
                allocated: 0,
                outstandingAfter: s.balance > 0 ? s.balance : 0,
              ),
            )
            .toList(),
      ),
      parent: parent,
      children: children,
      settings: settings,
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.blueGrey)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
