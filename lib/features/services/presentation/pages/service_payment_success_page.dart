import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import '../../domain/entities/service_job.dart';
import '../../domain/entities/service_payment.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../templates/service_pdf_generator.dart';

class ServicePaymentSuccessPage extends StatefulWidget {
  final ServiceJob job;
  final ServicePayment payment;
  final List<ServicePayment> payments;
  final bool autoPrint;

  const ServicePaymentSuccessPage({
    super.key,
    required this.job,
    required this.payment,
    required this.payments,
    this.autoPrint = false,
  });

  @override
  State<ServicePaymentSuccessPage> createState() => _ServicePaymentSuccessPageState();
}

class _ServicePaymentSuccessPageState extends State<ServicePaymentSuccessPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.elasticOut,
    );
    _animController.forward();

    if (widget.autoPrint) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final settings = context.read<SettingsBloc>().state.settings;
        _printReceipt(settings);
      });
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _printReceipt(AppSettings? settings) {
    context.read<ServicesBloc>().add(PrintServiceReceiptEvent(
      job: widget.job,
      payments: widget.payments,
      settings: settings,
    ));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Sending service receipt to printer...'),
        backgroundColor: Colors.blue,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  IconData _methodIcon(String method) {
    switch (method.toLowerCase()) {
      case 'pos card':
      case 'pos':
      case 'card':
        return Icons.credit_card;
      case 'account transfer':
      case 'bank transfer':
      case 'transfer':
        return Icons.account_balance;
      case 'customer wallet':
      case 'wallet':
        return Icons.account_balance_wallet;
      case 'cash':
      default:
        return Icons.payments_outlined;
    }
  }

  Color _methodColor(String method) {
    switch (method.toLowerCase()) {
      case 'pos card':
      case 'pos':
      case 'card':
        return Colors.blue;
      case 'account transfer':
      case 'bank transfer':
      case 'transfer':
        return Colors.purple;
      case 'customer wallet':
      case 'wallet':
        return Colors.teal;
      case 'cash':
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsBloc>().state.settings;
    final symbol = settings?.currency ?? '₦';
    final isFullyPaid = widget.job.balance <= 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Confirmation'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, true),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Success animation badge
            ScaleTransition(
              scale: _scaleAnimation,
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: Colors.green,
                  size: 56,
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Payment Received!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Recorded on ${DateFormat('dd MMM yyyy, hh:mm a').format(widget.payment.createdAt)}',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 20),

            // Main Receipt Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Theme.of(context).dividerColor),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Amount Highlight
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'AMOUNT PAID',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          CurrencyFormatter.formatWithSymbol(widget.payment.amount, symbol: symbol),
                          style: const TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            color: Colors.green,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _methodColor(widget.payment.method).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _methodIcon(widget.payment.method),
                                size: 16,
                                color: _methodColor(widget.payment.method),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                widget.payment.method.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _methodColor(widget.payment.method),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 12),

                  // Job & Customer Info Rows
                  _buildDetailRow('Job Number', widget.job.jobId, isBold: true),
                  _buildDetailRow('Job Title', widget.job.title),
                  if (widget.job.customerName != null && widget.job.customerName!.isNotEmpty)
                    _buildDetailRow('Customer', widget.job.customerName!),
                  if (widget.payment.reference != null && widget.payment.reference!.isNotEmpty)
                    _buildDetailRow('Reference / Note', widget.payment.reference!),

                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 12),

                  // Financial Breakdown
                  _buildDetailRow('Total Job Cost', CurrencyFormatter.formatWithSymbol(widget.job.totalAmount, symbol: symbol)),
                  _buildDetailRow('Total Paid So Far', CurrencyFormatter.formatWithSymbol(widget.job.amountPaid, symbol: symbol), color: Colors.green),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Remaining Balance',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      Row(
                        children: [
                          Text(
                            CurrencyFormatter.formatWithSymbol(widget.job.balance, symbol: symbol),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isFullyPaid ? Colors.green : Colors.red,
                            ),
                          ),
                          if (isFullyPaid) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'PAID',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Print & Share Actions
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: () => _printReceipt(settings),
                icon: const Icon(Icons.print, size: 22),
                label: const Text('Print Receipt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await ServiceJobPdfGenerator.generateAndShow(
                    job: widget.job,
                    payments: widget.payments,
                    settings: settings,
                  );
                },
                icon: const Icon(Icons.picture_as_pdf, size: 20),
                label: const Text('Preview / Share PDF Receipt'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Done / Back to Job', style: TextStyle(fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
