import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/phone_number_input.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../../../../core/mpos/mpos_device_type.dart';
import '../../../../core/pos/nibss_geo.dart';
import '../../../../core/utils/nibss_response_codes.dart';
import '../../../../core/utils/progress_dialog_utils.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';
import '../../../../core/widgets/va_credentials_required_dialog.dart';
import '../../../../services/mpos_service.dart';
import '../../../../services/terminal_sync_service.dart';
import '../../../activation/presentation/pages/go_pro_page.dart';
import '../../../invoicing/domain/templates/pos_receipt_commands.dart';
import '../../../school_finance/domain/repositories/finance_repository_new.dart';
import '../../../settings/domain/services/security_service.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../../domain/entities/service_customer.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../../domain/repositories/services_repository.dart';
import '../templates/service_pdf_generator.dart';
import 'service_payment_success_page.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';
import '../utils/job_staff_store.dart';

class JobDetailsPage extends StatefulWidget {
  final ServiceJob job;
  const JobDetailsPage({super.key, required this.job});

  @override
  State<JobDetailsPage> createState() => _JobDetailsPageState();
}

class _JobDetailsPageState extends State<JobDetailsPage> {
  late ServiceJob _job;
  List<ServicePayment> _payments = [];
  JobStaffAssignment? _assignedStaff;
  bool _isLoading = false;

  bool get _isCancelled => _job.status.toLowerCase() == 'cancelled';
  bool get _canCancelJob =>
      !_isCancelled && _job.amountPaid <= 1e-9 && _payments.isEmpty;

  @override
  void initState() {
    super.initState();
    _job = widget.job;
    _loadJobDetails();
  }

  Future<void> _loadJobDetails() async {
    setState(() => _isLoading = true);
    try {
      final repo = context.read<IServicesRepository>();
      final updated = await repo.getJobById(_job.id);
      final pms = await repo.getJobPayments(_job.id);
      final assignment = await JobStaffStore.getAssignment(_job.id) ??
          await JobStaffStore.getAssignment(_job.jobId);
      if (mounted) {
        setState(() {
          _job = updated;
          _payments = pms;
          _assignedStaff = assignment;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.watch<SettingsBloc>().state.settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(
        title: Text(_job.jobId),
        actions: [
          if (_canCancelJob)
            IconButton(
              icon: const Icon(Icons.cancel_outlined),
              tooltip: 'Cancel job',
              onPressed: () => _confirmCancelJob(context),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _loadJobDetails,
          ),
        ],
      ),
      body: _isLoading && _payments.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context),
                  if (_job.image != null) ...[
                    const SizedBox(height: 24),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.memory(
                        _job.image!,
                        width: double.infinity,
                        height: 200,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  _buildBalanceCard(context, currencySymbol),
                  if (_isCancelled) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                      ),
                      child: const Text(
                        'This job is cancelled. No payment is due.',
                        style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  const Text('Actions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildQuickActions(context, currencySymbol),
                  const SizedBox(height: 24),
                  const Text('Job Log', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildJobLog(context, currencySymbol),
                ],
              ),
            ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                _job.title,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            _buildStatusChip(_job.status),
          ],
        ),
        if (_job.customerName != null && _job.customerName!.isNotEmpty) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 16, color: Colors.grey),
              const SizedBox(width: 6),
              Text(
                _job.customerName!,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.blueGrey),
              ),
            ],
          ),
        ],
        const SizedBox(height: 8),
        InkWell(
          onTap: () => _assignStaff(context),
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _assignedStaff != null ? Colors.blue.withValues(alpha: 0.08) : Colors.amber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _assignedStaff != null ? Colors.blue.withValues(alpha: 0.3) : Colors.amber.withValues(alpha: 0.5),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.badge_outlined,
                  size: 18,
                  color: _assignedStaff != null ? Colors.blue.shade700 : Colors.amber.shade900,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _assignedStaff != null ? 'ASSIGNED SERVICE STAFF' : 'STAFF ASSIGNMENT',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: _assignedStaff != null ? Colors.blue.shade800 : Colors.amber.shade900,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        _assignedStaff != null
                            ? _assignedStaff!.staffName
                            : 'Tap to Assign Staff to this Service (PIN Login)',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _assignedStaff != null ? Colors.black87 : Colors.amber.shade900,
                        ),
                      ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(
                    _assignedStaff != null ? 'CHANGE' : 'ASSIGN',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  backgroundColor: _assignedStaff != null ? Colors.blue.shade50 : Colors.amber.shade100,
                  padding: EdgeInsets.zero,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(_job.description ?? 'No description provided', style: TextStyle(color: Colors.grey[600])),
        const SizedBox(height: 16),
        Row(
          children: [
            const Icon(Icons.calendar_today, size: 16, color: Colors.blue),
            const SizedBox(width: 8),
            Text('Due: ${_job.dueDate != null ? DateFormat('dd MMM yyyy').format(_job.dueDate!) : 'Not Set'}'),
            if (_job.warrantyDuration != null) ...[
              const SizedBox(width: 16),
              const Icon(Icons.security, size: 16, color: Colors.green),
              const SizedBox(width: 4),
              Text('Warranty: ${_job.warrantyDuration}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
            ],
          ],
        ),
      ],
    );
  }

  Future<void> _assignStaff(BuildContext context) async {
    final staff = await showDialog<Staff>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const StaffAuthDialog(),
    );
    if (staff != null && mounted) {
      await JobStaffStore.assignStaff(_job.id, staff.id!, staff.name);
      await JobStaffStore.assignStaff(_job.jobId, staff.id!, staff.name);
      setState(() {
        _assignedStaff = JobStaffAssignment(
          staffId: staff.id!,
          staffName: staff.name,
          assignedAt: DateTime.now(),
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Service job ${_job.jobId} assigned to ${staff.name}'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Widget _buildBalanceCard(BuildContext context, String symbol) {
    final isPaid = _job.balance <= 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor,
            Theme.of(context).primaryColor.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Remaining Balance', style: TextStyle(color: Colors.white70, fontSize: 16)),
              if (isPaid) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.greenAccent.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text('PAID', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(_job.balance, symbol: symbol),
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSimpleStat('Total Cost', CurrencyFormatter.formatWithSymbol(_job.totalAmount, symbol: symbol)),
              _buildSimpleStat('Paid', CurrencyFormatter.formatWithSymbol(_job.amountPaid, symbol: symbol)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleStat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context, String symbol) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _isCancelled
                ? null
                : () => _showPaymentDialog(context, symbol),
            icon: const Icon(Icons.add_card),
            label: Text(_isCancelled ? 'Cancelled' : 'Add Payment', style: const TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            children: [
              OutlinedButton.icon(
                onPressed: _isCancelled ? null : () => _showStatusPicker(context),
                icon: const Icon(Icons.edit_road, size: 18),
                label: const Text('Status'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<SettingsBloc, SettingsState>(
                builder: (context, settingsState) {
                  return Column(
                    children: [
                      OutlinedButton.icon(
                        onPressed: () {
                          context.read<ServicesBloc>().add(PrintServiceReceiptEvent(
                                job: _job,
                                payments: _payments,
                                settings: settingsState.settings,
                              ));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Sending service receipt to printer...'),
                              backgroundColor: Colors.blue,
                            ),
                          );
                        },
                        icon: const Icon(Icons.print, size: 18),
                        label: const Text('Print Receipt'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: () async {
                          await ServiceJobPdfGenerator.generateAndShow(
                            job: _job,
                            payments: _payments,
                            settings: settingsState.settings,
                          );
                        },
                        icon: const Icon(Icons.share, size: 18),
                        label: const Text('Preview / Share PDF'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue[800],
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildJobLog(BuildContext context, String symbol) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_job.items.isNotEmpty || _job.laborAmount > 0) ...[
          const Text('Bill Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              children: [
                if (_job.laborAmount > 0)
                  _buildItemRow('Workmanship', _job.laborAmount, symbol),
                ..._job.items.map((i) => _buildItemRow('${i.name} (x${i.quantity.toInt()})', i.price * i.quantity, symbol)),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
        const Text('Job Logs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        _buildLogItem(
          context,
          'Job Created',
          'Initial creation of the job entry',
          _job.createdAt,
          Icons.fiber_new,
          Colors.blue,
        ),
        for (final p in _payments)
          _buildLogItem(
            context,
            'Payment Received (${p.method})',
            '${CurrencyFormatter.formatWithSymbol(p.amount, symbol: symbol)}${p.reference != null && p.reference!.isNotEmpty ? ' • Ref: ${p.reference}' : ''}',
            p.createdAt,
            Icons.payment,
            Colors.green,
          ),
      ],
    );
  }

  Widget _buildLogItem(BuildContext context, String title, String sub, DateTime date, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(sub, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                Text(
                  DateFormat('dd MMM yyyy, hh:mm a').format(date.toLocal()),
                  style: TextStyle(color: Colors.grey[400], fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showPaymentDialog(BuildContext context, String symbol) async {
    final remaining = _job.balance > 0 ? _job.balance : 0.0;
    final amountCtrl = TextEditingController(
      text: remaining > 0 ? remaining.toStringAsFixed(0) : '',
    );
    final refCtrl = TextEditingController();

    final repo = context.read<IServicesRepository>();
    ServiceCustomer? currentCustomer;
    if (_job.customerId.isNotEmpty) {
      try {
        currentCustomer = await repo.getCustomerById(_job.customerId);
      } catch (_) {}
    }

    final terminalConfig = await TerminalSyncService.loadCachedConfig();
    if (!mounted) return;

    final plan = context.read<SettingsBloc>().state.userPlan;
    final isPro = plan?.isPro == true ||
        plan?.isLifetime == true ||
        plan?.planType == 'enterprise' ||
        plan?.planType == 'premium' ||
        (plan?.isValid == true && !plan!.isBasic && plan.planType != 'free_trial');

    final hasTerminal = terminalConfig != null &&
        terminalConfig.posSerialNumber != null &&
        terminalConfig.posSerialNumber!.isNotEmpty;

    final isPosAvailable = isPro && hasTerminal;
    final isTransferAvailable = isPro;

    String selectedMethod = 'Cash';
    String? amountError;
    bool isProcessingPos = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final methods = [
            {'name': 'Cash', 'icon': Icons.payments_outlined, 'color': Colors.green, 'enabled': true, 'badge': ''},
            {
              'name': 'POS Card',
              'icon': Icons.credit_card,
              'color': Colors.blue,
              'enabled': isPosAvailable,
              'badge': !isPro ? '(Pro required)' : (!hasTerminal ? '(No Terminal)' : ''),
            },
            {
              'name': 'Account Transfer',
              'icon': Icons.account_balance,
              'color': Colors.purple,
              'enabled': isTransferAvailable,
              'badge': !isPro ? '(Pro required)' : '',
            },
            {
              'name': 'Customer Wallet',
              'icon': Icons.account_balance_wallet,
              'color': Colors.teal,
              'enabled': isPro && currentCustomer != null,
              'badge': !isPro
                  ? '(Pro required)'
                  : (currentCustomer == null ? '(No customer)' : ''),
            },
          ];

          final walletCredit = currentCustomer != null &&
                  currentCustomer!.balance < 0
              ? -currentCustomer!.balance
              : 0.0;
          final enteredAmt = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
          final walletCoversAmount =
              walletCredit + 1e-9 >= enteredAmt && enteredAmt > 0;
          final walletBlocked = selectedMethod == 'Customer Wallet' &&
              enteredAmt > 0 &&
              !walletCoversAmount;

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Record Payment',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: isProcessingPos ? null : () => Navigator.pop(dialogCtx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Remaining balance banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Outstanding Balance:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        Text(
                          CurrencyFormatter.formatWithSymbol(_job.balance, symbol: symbol),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.blue),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: _assignedStaff != null
                          ? Colors.blue.withValues(alpha: 0.06)
                          : Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _assignedStaff != null
                            ? Colors.blue.shade200
                            : Colors.amber.shade300,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.badge_outlined,
                              size: 16,
                              color: _assignedStaff != null
                                  ? Colors.blue.shade700
                                  : Colors.amber.shade900,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _assignedStaff != null
                                  ? 'Staff: ${_assignedStaff!.staffName}'
                                  : 'Staff: Not Assigned',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _assignedStaff != null
                                    ? Colors.black87
                                    : Colors.amber.shade900,
                              ),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: () async {
                            final s = await showDialog<Staff>(
                              context: context,
                              barrierDismissible: true,
                              builder: (c) => const StaffAuthDialog(),
                            );
                            if (s != null && mounted) {
                              await JobStaffStore.assignStaff(_job.id, s.id!, s.name);
                              await JobStaffStore.assignStaff(_job.jobId, s.id!, s.name);
                              setState(() {
                                _assignedStaff = JobStaffAssignment(
                                  staffId: s.id!,
                                  staffName: s.name,
                                  assignedAt: DateTime.now(),
                                );
                              });
                              setDialogState(() {});
                            }
                          },
                          child: Text(
                            _assignedStaff != null ? 'Change' : 'Assign Staff',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).primaryColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Amount input
                  TextField(
                    controller: amountCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Payment Amount ($symbol)',
                      prefixText: '$symbol ',
                      errorText: amountError,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (_) {
                      setDialogState(() {
                        if (amountError != null) amountError = null;
                      });
                    },
                  ),
                  const SizedBox(height: 8),

                  // Quick Amount Chips
                  if (remaining > 0)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          ActionChip(
                            label: const Text('Full Balance', style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              setDialogState(() {
                                amountCtrl.text = remaining.toStringAsFixed(0);
                                amountError = null;
                              });
                            },
                          ),
                          const SizedBox(width: 6),
                          ActionChip(
                            label: const Text('50%', style: TextStyle(fontSize: 12)),
                            onPressed: () {
                              setDialogState(() {
                                amountCtrl.text = (remaining * 0.5).toStringAsFixed(0);
                                amountError = null;
                              });
                            },
                          ),
                          const SizedBox(width: 6),
                          ActionChip(
                            label: Text('$symbol 5,000', style: const TextStyle(fontSize: 12)),
                            onPressed: () {
                              setDialogState(() {
                                amountCtrl.text = '5000';
                                amountError = null;
                              });
                            },
                          ),
                          const SizedBox(width: 6),
                          ActionChip(
                            label: Text('$symbol 10,000', style: const TextStyle(fontSize: 12)),
                            onPressed: () {
                              setDialogState(() {
                                amountCtrl.text = '10000';
                                amountError = null;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),

                  // Payment Method Selector
                  const Text('Payment Method', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: methods.map((m) {
                      final name = m['name'] as String;
                      final isSelected = selectedMethod == name;
                      final color = m['color'] as Color;
                      final enabled = m['enabled'] as bool;
                      final badge = m['badge'] as String;

                      return ChoiceChip(
                        avatar: Icon(
                          m['icon'] as IconData,
                          size: 16,
                          color: !enabled
                              ? Colors.grey
                              : (isSelected ? Colors.white : color),
                        ),
                        label: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              name,
                              style: TextStyle(
                                color: !enabled
                                    ? Colors.grey
                                    : (isSelected ? Colors.white : Colors.black87),
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                fontSize: 13,
                              ),
                            ),
                            if (badge.isNotEmpty) ...[
                              const SizedBox(width: 4),
                              Text(
                                badge,
                                style: const TextStyle(fontSize: 10, color: Colors.red, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ],
                        ),
                        selected: isSelected,
                        selectedColor: color,
                        onSelected: (selected) {
                          if (!enabled) {
                            if (!isPro) {
                              _showUpgradeDialog(context, name);
                            } else if (name == 'POS Card' && !hasTerminal) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('No MPOS Terminal configured. Please setup terminal in Printer Settings.')),
                              );
                            } else if (name == 'Customer Wallet' && currentCustomer == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('This job has no customer. Assign a customer before using wallet credit.')),
                              );
                            }
                            return;
                          }
                          if (selected) {
                            setDialogState(() => selectedMethod = name);
                          }
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),

                  // POS Card active details
                  if (selectedMethod == 'POS Card') ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.point_of_sale, size: 22, color: Colors.blue),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Terminal: ${terminalConfig?.terminalId ?? terminalConfig?.mposTerminalId ?? "Assigned"}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blue),
                                ),
                                Text(
                                  'Host: ${terminalConfig?.activeHost ?? "MEDUSA"} • ${terminalConfig?.terminalType ?? "MPOS"} (GPS Secured)',
                                  style: const TextStyle(fontSize: 11, color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Account Transfer / Virtual Account display
                  if (selectedMethod == 'Account Transfer') ...[
                    if (currentCustomer != null &&
                        currentCustomer!.virtualAccountNumber != null &&
                        currentCustomer!.virtualAccountNumber!.trim().isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.purple.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'TRANSFER TO DEDICATED CUSTOMER VA',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.purple),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.green.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text('ACTIVE', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  currentCustomer!.virtualAccountNumber!,
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 2),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.copy, size: 18, color: Colors.purple),
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: currentCustomer!.virtualAccountNumber!));
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Account number copied to clipboard!')),
                                    );
                                  },
                                ),
                              ],
                            ),
                            Text(
                              currentCustomer!.virtualAccountBank ?? 'Bank Transfer',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              currentCustomer!.virtualAccountName ?? currentCustomer!.name,
                              style: const TextStyle(fontSize: 12, color: Colors.black87),
                            ),
                            const Divider(),
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.sync, size: 12, color: Colors.purple),
                                SizedBox(width: 6),
                                Text('Waiting for transfer payment confirmation…', style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ] else ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.purple.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.purple.withValues(alpha: 0.2)),
                        ),
                        child: Column(
                          children: [
                            const Text('No Dedicated Customer Virtual Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(height: 4),
                            const Text(
                              'Generate an automated instant virtual account for this customer to receive payments directly.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 11, color: Colors.black54),
                            ),
                            const SizedBox(height: 10),
                            ElevatedButton.icon(
                              onPressed: currentCustomer != null
                                  ? () => _generateCustomerVirtualAccount(context, currentCustomer!, (updated) {
                                        setDialogState(() => currentCustomer = updated);
                                      })
                                  : null,
                              icon: const Icon(Icons.account_balance, size: 16),
                              label: const Text('Generate Customer Virtual Account', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple,
                                foregroundColor: Colors.white,
                              ),
                            ),
                            Builder(
                              builder: (ctx) {
                                final settings = context.watch<SettingsBloc>().state.settings;
                                if (settings?.bankName != null && settings!.bankName!.isNotEmpty) {
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 8.0),
                                    child: Text(
                                      'Company Account: ${settings.bankName} • ${settings.accountNumber ?? ""} (${settings.accountName ?? ""})',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                  ],

                  if (selectedMethod == 'Customer Wallet') ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: walletCoversAmount
                            ? Colors.teal.withValues(alpha: 0.08)
                            : Colors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: walletCoversAmount
                              ? Colors.teal.withValues(alpha: 0.25)
                              : Colors.red.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            walletCoversAmount
                                ? Icons.account_balance_wallet
                                : Icons.warning_amber_rounded,
                            size: 22,
                            color: walletCoversAmount ? Colors.teal : Colors.red,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  walletCoversAmount
                                      ? 'Wallet credit: ${CurrencyFormatter.formatWithSymbol(walletCredit, symbol: symbol)}'
                                      : 'Insufficient wallet credit',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: walletCoversAmount
                                        ? Colors.teal
                                        : Colors.red,
                                  ),
                                ),
                                Text(
                                  walletCoversAmount
                                      ? 'This payment will be deducted from ${currentCustomer?.name ?? 'the customer'}\'s wallet.'
                                      : 'Available: ${CurrencyFormatter.formatWithSymbol(walletCredit, symbol: symbol)}'
                                          ' • Needed: ${CurrencyFormatter.formatWithSymbol(enteredAmt > 0 ? enteredAmt : remaining, symbol: symbol)}',
                                  style: const TextStyle(
                                      fontSize: 11, color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Reference or Note
                  TextField(
                    controller: refCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Reference / Note (Optional)',
                      hintText: 'e.g. Bank session ID, POS slip ref',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Confirm Button
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: isProcessingPos || walletBlocked
                          ? null
                          : () async {
                              final amt = double.tryParse(amountCtrl.text.trim());
                              if (amt == null || amt <= 0) {
                                setDialogState(() => amountError = 'Please enter a valid amount');
                                return;
                              }

                              String? finalRef = refCtrl.text.trim().isNotEmpty ? refCtrl.text.trim() : null;

                              if (selectedMethod == 'Customer Wallet') {
                                if (!isPro) {
                                  _showUpgradeDialog(context, 'Customer Wallet');
                                  return;
                                }
                                if (_job.customerId.isEmpty) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Assign a customer to this job before using wallet credit.'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                  return;
                                }

                                ServiceCustomer? latestCustomer;
                                try {
                                  latestCustomer =
                                      await repo.getCustomerById(_job.customerId);
                                } catch (_) {}
                                if (latestCustomer == null) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'Could not load this customer’s wallet. Please reopen the job and try again.'),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                  return;
                                }

                                final availableCredit = latestCustomer.balance < 0
                                    ? -latestCustomer.balance
                                    : 0.0;
                                if (availableCredit + 1e-9 < amt) {
                                  if (dialogCtx.mounted) {
                                    await showDialog(
                                      context: dialogCtx,
                                      builder: (ctx) => AlertDialog(
                                        title: const Text('Insufficient Wallet Credit'),
                                        content: Text(
                                          'This customer does not have enough wallet credit for this payment.\n\n'
                                          'Available credit: ${CurrencyFormatter.formatWithSymbol(availableCredit, symbol: symbol)}\n'
                                          'Payment amount: ${CurrencyFormatter.formatWithSymbol(amt, symbol: symbol)}\n\n'
                                          'Choose another payment method or top up the customer wallet first.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(ctx),
                                            child: const Text('OK'),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                  return;
                                }
                                currentCustomer = latestCustomer;
                              }

                              // Process MPOS if POS Card is selected
                              if (selectedMethod == 'POS Card') {
                                if (terminalConfig == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('No POS Terminal Config found')),
                                  );
                                  return;
                                }

                                setDialogState(() => isProcessingPos = true);
                                final posResult = await _processPosPayment(
                                  context: context,
                                  amount: amt,
                                  config: terminalConfig,
                                );
                                setDialogState(() => isProcessingPos = false);

                                if (posResult == null || posResult.status != 'payment_success') {
                                  return;
                                }

                                finalRef = posResult.transaction?.rrn ??
                                    posResult.transaction?.stan ??
                                    'POS-${DateTime.now().millisecondsSinceEpoch}';
                              }

                              try {
                                await repo.addPayment(
                                  jobId: _job.id,
                                  amount: amt,
                                  method: selectedMethod,
                                  reference: finalRef,
                                );

                                final updatedJob = await repo.getJobById(_job.id);
                                final allPayments = await repo.getJobPayments(_job.id);

                                if (dialogCtx.mounted) Navigator.pop(dialogCtx);

                                // Navigate to Payment Success Page
                                if (mounted) {
                                  context.read<ServicesBloc>().add(const LoadServicesJobs());

                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => ServicePaymentSuccessPage(
                                        job: updatedJob,
                                        payment: allPayments.isNotEmpty
                                            ? allPayments.first
                                            : ServicePayment(
                                                id: '',
                                                jobId: _job.id,
                                                amount: amt,
                                                method: selectedMethod,
                                                reference: finalRef,
                                                createdAt: DateTime.now(),
                                              ),
                                        payments: allPayments,
                                      ),
                                    ),
                                  );

                                  // Refresh page after returning
                                  if (mounted) _loadJobDetails();
                                }
                              } catch (e) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Payment failed: $e'), backgroundColor: Colors.red),
                                  );
                                }
                              }
                            },
                      icon: isProcessingPos
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Icon(selectedMethod == 'POS Card' ? Icons.credit_card : Icons.check_circle_outline, size: 20),
                      label: Text(
                        selectedMethod == 'POS Card' ? 'Process POS Card' : 'Record Payment',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: selectedMethod == 'POS Card' ? Colors.blue : Colors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<MposTransactionResponse?> _processPosPayment({
    required BuildContext context,
    required double amount,
    required TerminalConfig config,
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

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm POS Charge'),
        content: Text(
          'Insert or tap card on terminal $terminalId to charge ${CurrencyFormatter.formatWithSymbol(amount, symbol: "₦")}.\n\nHost: $activeHost ($deviceType)',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('CHARGE')),
        ],
      ),
    );
    if (confirm != true) return null;

    final geo = await NibssGeo.capture();
    if (geo != null) {
      await MposService().saveGeoCoordinates(
        latitude: geo.latitude,
        longitude: geo.longitude,
        deviceType: deviceType,
      );
    }

    try {
      final result = await ProgressDialogUtils.showUpdatableProgress(
        context,
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

          // Switchboard path: EMV captured on device, host confirms via Invify.
          if (payment.status == 'emv_data_ready' && payment.emvData != null) {
            setMessage('Confirming payment with host…\nThis can take up to a minute.');
            final financeRepo = context.read<FinanceRepository>();
            final posRes = await financeRepo.apiClient.post(
              '/api/pos/transaction',
              data: {
                'terminalId': terminalId,
                'amount': amount,
                'emvData': payment.emvData!.toJson(),
                'staffName': _assignedStaff?.staffName ?? 'Services Mode',
                'items': [
                  {
                    'name': _job.title.isNotEmpty ? _job.title : 'Service Job #${_job.id.substring(0, 8)}',
                    'quantity': 1,
                  },
                ],
                'metadata': {
                  'source': 'services_pos',
                  'jobId': _job.id,
                  'customerId': _job.customerId,
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
      );

      if (result.status != 'payment_success') {
        final msg = result.error?.message ?? result.transaction?.message ?? 'POS transaction failed or was cancelled';
        if (context.mounted) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: Row(
                children: const [
                  Icon(Icons.error, color: Colors.red),
                  SizedBox(width: 8),
                  Text('POS Payment Failed'),
                ],
              ),
              content: Text(msg),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
              ],
            ),
          );
        }
        return null;
      }

      return result;
    } catch (e) {
      if (context.mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Row(
              children: const [
                Icon(Icons.error, color: Colors.red),
                SizedBox(width: 8),
                Text('POS Transaction Error'),
              ],
            ),
            content: Text(e.toString().replaceAll('Exception: ', '')),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
            ],
          ),
        );
      }
      return null;
    }
  }

  Future<void> _generateCustomerVirtualAccount(
    BuildContext pageContext,
    ServiceCustomer customer,
    void Function(ServiceCustomer) onCustomerUpdated,
  ) async {
    final orgName = context.read<SettingsBloc>().state.settings?.organizationName;
    if (await showFreeTrialVaLockedIfNeeded(pageContext, businessName: orgName)) {
      return;
    }

    final name = customer.name.trim();
    final nameParts = name.split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    final email = customer.email?.trim() ?? '';
    final phone = customer.phone?.trim() ?? '';

    if (nameParts.length < 2 || email.isEmpty || phone.isEmpty) {
      _showCompleteCustomerInfoDialog(pageContext, customer, onCustomerUpdated);
      return;
    }

    if (!pageContext.mounted) return;
    showDialog(
      context: pageContext,
      barrierDismissible: false,
      builder: (context) => const Center(child: InvifyLoadingIndicator(message: 'Provisioning Virtual Account...')),
    );

    try {
      final financeRepo = pageContext.read<FinanceRepository>();
      final result = await financeRepo.initiateCustomerVirtualAccount(
        customerId: customer.id,
        customerName: name,
        customerPhone: phone,
        email: email,
      );

      if (pageContext.mounted) {
        Navigator.pop(pageContext); // Close loading indicator
        if (result['accountNumber'] != null) {
          final acctNum = result['accountNumber']?.toString() ?? '';
          final bankName = result['bankName']?.toString() ?? '';
          final acctName = result['accountName']?.toString() ?? name;

          final svcRepo = pageContext.read<IServicesRepository>();
          await svcRepo.updateCustomerVirtualAccount(customer.id, acctNum, bankName, accountName: acctName);

          final updated = customer.copyWith(
            virtualAccountNumber: acctNum,
            virtualAccountBank: bankName,
            virtualAccountName: acctName,
          );
          onCustomerUpdated(updated);

          ScaffoldMessenger.of(pageContext).showSnackBar(
            const SnackBar(content: Text('Customer Virtual Account generated successfully!'), backgroundColor: Colors.green),
          );
        } else {
          await showVirtualAccountFailureDialog(
            pageContext,
            result['message']?.toString() ?? 'Failed to provision customer virtual account',
            subject: 'customer virtual account',
          );
        }
      }
    } catch (e) {
      if (pageContext.mounted) {
        Navigator.pop(pageContext);
        ScaffoldMessenger.of(pageContext).showSnackBar(
          SnackBar(content: Text('Error generating virtual account: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showCompleteCustomerInfoDialog(
    BuildContext pageContext,
    ServiceCustomer customer,
    void Function(ServiceCustomer) onCustomerUpdated,
  ) {
    final nameCtrl = TextEditingController(text: customer.name);
    final emailCtrl = TextEditingController(text: customer.email ?? '');
    final phoneCtrl = TextEditingController(text: customer.phone ?? '');
    String? errorMsg;

    showDialog(
      context: pageContext,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Complete Customer Details'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Full customer details (First & Last Name, Email, and Phone) are required by regulatory partners to generate a Dedicated Virtual Account.',
                  style: TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 12),
                if (errorMsg != null) ...[
                  Text(errorMsg!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  const SizedBox(height: 8),
                ],
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Full Name (First & Last Name)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: PhoneNumberInput.formatters,
                  maxLength: PhoneNumberInput.maxDigits,
                  decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: () async {
                final newName = nameCtrl.text.trim();
                final newEmail = emailCtrl.text.trim();
                final newPhone = phoneCtrl.text.trim();

                final parts = newName.split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
                if (parts.length < 2) {
                  setDlgState(() => errorMsg = 'Please enter both first and last name.');
                  return;
                }
                if (newPhone.isEmpty || newEmail.isEmpty) {
                  setDlgState(() => errorMsg = 'Both phone number and email are required.');
                  return;
                }

                Navigator.pop(dialogCtx);
                final svcRepo = pageContext.read<IServicesRepository>();
                await svcRepo.updateCustomerBasicInfo(
                  id: customer.id,
                  name: newName,
                  email: newEmail,
                  phone: newPhone,
                );
                final updated = customer.copyWith(name: newName, email: newEmail, phone: newPhone);
                onCustomerUpdated(updated);

                _generateCustomerVirtualAccount(pageContext, updated, onCustomerUpdated);
              },
              child: const Text('SAVE & GENERATE'),
            ),
          ],
        ),
      ),
    );
  }

  Future<bool> _requestAdminPassword(BuildContext context) async {
    final passwordController = TextEditingController();
    bool passwordVisible = false;
    String? errorMsg;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Row(
            children: const [
              Icon(Icons.admin_panel_settings, color: Colors.deepPurple),
              SizedBox(width: 8),
              Text('System Authorization'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter the system access password to generate a virtual account for this customer.',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              if (errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error, color: Colors.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(errorMsg!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
              TextField(
                controller: passwordController,
                obscureText: !passwordVisible,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'System Access Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(passwordVisible ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setDialogState(() => passwordVisible = !passwordVisible),
                  ),
                ),
                onSubmitted: (_) async {
                  final ok = await SecurityService().verifySuperAdminPassword(passwordController.text);
                  if (ok) {
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } else {
                    setDialogState(() => errorMsg = 'Incorrect password. Please try again.');
                    passwordController.clear();
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
            ElevatedButton(
              onPressed: () async {
                final ok = await SecurityService().verifySuperAdminPassword(passwordController.text);
                if (ok) {
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } else {
                  setDialogState(() => errorMsg = 'Incorrect password. Please try again.');
                  passwordController.clear();
                }
              },
              child: const Text('VERIFY'),
            ),
          ],
        ),
      ),
    );
    return result == true;
  }

  void _showUpgradeDialog(BuildContext context, String featureName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.workspace_premium, color: Colors.amber),
            SizedBox(width: 8),
            Text('Pro Feature'),
          ],
        ),
        content: Text(
          '$featureName requires an active Invify Pro or Enterprise subscription. Upgrade your plan to unlock automated POS card processing and dynamic virtual account transfers.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('LATER')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const GoProPage()));
            },
            child: const Text('UPGRADE TO PRO'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmCancelJob(BuildContext context) async {
    if (!_canCancelJob) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel this job?'),
        content: Text(
          'No payment has been recorded for "${_job.title}". '
          'Cancelling removes it from Payment Pending. This cannot be undone.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep job')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel job', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      final repo = context.read<IServicesRepository>();
      await repo.updateJobStatus(_job.id, 'cancelled');
      if (!mounted) return;
      context.read<ServicesBloc>().add(const LoadServicesJobs());
      await _loadJobDetails();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job cancelled. No payment is due.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showStatusPicker(BuildContext context) {
    if (_isCancelled) return;
    final statuses = ['pending', 'in_progress', 'ready', 'delivered'];
    showModalBottomSheet(
      context: context,
      builder: (bottomSheetCtx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: statuses.map((s) => ListTile(
          title: Text(s.toUpperCase()),
          onTap: () async {
            final repo = context.read<IServicesRepository>();
            await repo.updateJobStatus(_job.id, s);
            if (bottomSheetCtx.mounted) Navigator.pop(bottomSheetCtx);
            if (mounted) {
              context.read<ServicesBloc>().add(const LoadServicesJobs());
              _loadJobDetails();
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $s')));
            }
          },
        )).toList(),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'pending': color = Colors.grey; break;
      case 'in_progress': color = Colors.orange; break;
      case 'ready': color = Colors.green; break;
      case 'delivered': color = Colors.blue; break;
      case 'cancelled': color = Colors.red; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildItemRow(String label, double amount, String symbol) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13)),
          Text(CurrencyFormatter.formatWithSymbol(amount, symbol: symbol), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}

