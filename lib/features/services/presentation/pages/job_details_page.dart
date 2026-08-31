import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../../domain/repositories/services_repository.dart';
import '../templates/service_pdf_generator.dart';
import 'service_payment_success_page.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../settings/presentation/bloc/settings_state.dart';

class JobDetailsPage extends StatefulWidget {
  final ServiceJob job;
  const JobDetailsPage({super.key, required this.job});

  @override
  State<JobDetailsPage> createState() => _JobDetailsPageState();
}

class _JobDetailsPageState extends State<JobDetailsPage> {
  late ServiceJob _job;
  List<ServicePayment> _payments = [];
  bool _isLoading = false;

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
      if (mounted) {
        setState(() {
          _job = updated;
          _payments = pms;
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
            onPressed: () => _showPaymentDialog(context, symbol),
            icon: const Icon(Icons.add_card),
            label: const Text('Add Payment', style: TextStyle(fontWeight: FontWeight.bold)),
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
                onPressed: () => _showStatusPicker(context),
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

  void _showPaymentDialog(BuildContext context, String symbol) {
    final remaining = _job.balance > 0 ? _job.balance : 0.0;
    final amountCtrl = TextEditingController(
      text: remaining > 0 ? remaining.toStringAsFixed(0) : '',
    );
    final refCtrl = TextEditingController();

    String selectedMethod = 'Cash';
    String? amountError;

    final methods = [
      {'name': 'Cash', 'icon': Icons.payments_outlined, 'color': Colors.green},
      {'name': 'POS Card', 'icon': Icons.credit_card, 'color': Colors.blue},
      {'name': 'Account Transfer', 'icon': Icons.account_balance, 'color': Colors.purple},
      {'name': 'Customer Wallet', 'icon': Icons.account_balance_wallet, 'color': Colors.teal},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
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
                        onPressed: () => Navigator.pop(dialogCtx),
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
                      if (amountError != null) setDialogState(() => amountError = null);
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
                      final isSelected = selectedMethod == m['name'];
                      final color = m['color'] as Color;

                      return ChoiceChip(
                        avatar: Icon(
                          m['icon'] as IconData,
                          size: 16,
                          color: isSelected ? Colors.white : color,
                        ),
                        label: Text(m['name'] as String),
                        selected: isSelected,
                        selectedColor: color,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                        onSelected: (selected) {
                          if (selected) {
                            setDialogState(() => selectedMethod = m['name'] as String);
                          }
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),

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
                      onPressed: () async {
                        final amt = double.tryParse(amountCtrl.text.trim());
                        if (amt == null || amt <= 0) {
                          setDialogState(() => amountError = 'Please enter a valid amount');
                          return;
                        }

                        final repo = context.read<IServicesRepository>();
                        final ref = refCtrl.text.trim().isNotEmpty ? refCtrl.text.trim() : null;

                        try {
                          await repo.addPayment(
                            jobId: _job.id,
                            amount: amt,
                            method: selectedMethod,
                            reference: ref,
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
                                          reference: ref,
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
                      icon: const Icon(Icons.check_circle_outline, size: 20),
                      label: const Text('Record Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
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

  void _showStatusPicker(BuildContext context) {
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

