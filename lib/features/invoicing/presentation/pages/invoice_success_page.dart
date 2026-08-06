import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/invoicing/domain/templates/concrete_templates.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:intl/intl.dart';

class InvoiceSuccessPage extends StatefulWidget {
  final Invoice invoice;
  /// Overrides the default "Invoice Created Successfully!" headline.
  final String? successTitle;
  /// When true, automatically sends the receipt to the printer on open.
  final bool autoPrint;

  const InvoiceSuccessPage({
    super.key,
    required this.invoice,
    this.successTitle,
    this.autoPrint = false,
  });

  @override
  State<InvoiceSuccessPage> createState() => _InvoiceSuccessPageState();
}

class _InvoiceSuccessPageState extends State<InvoiceSuccessPage> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: const Interval(0.4, 1.0, curve: Curves.easeIn),
      ),
    );

    _animationController.forward();

    if (widget.autoPrint) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final settings = context.read<SettingsBloc>().state.settings;
        if (settings != null) {
          _printReceipt(context, settings);
        }
      });
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _printReceipt(BuildContext context, AppSettings settings) {
    final templateName = settings.defaultInvoiceTemplate ?? 'compact';
    final InvoiceTemplate template;
    
    if (templateName == 'detailed') {
      template = DetailedInvoiceTemplate();
    } else if (templateName == 'minimalist') {
      template = MinimalistInvoiceTemplate();
    } else if (templateName == 'professional') {
      template = ProfessionalInvoiceTemplate();
    } else if (templateName == 'modern') {
      template = ModernProfessionalTemplate();
    } else if (templateName == 'classic') {
      template = ClassicBusinessTemplate();
    } else {
      template = CompactInvoiceTemplate();
    }

    final commands = template.generateCommands(widget.invoice, settings, copyType: 'Customer Copy');
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Sending invoice to printer...'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.blue,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final staffState = context.watch<StaffBloc>().state;
    final staffList = staffState.staffList;
    Staff? currentStaff;
    if (widget.invoice.staffId != null) {
      currentStaff = staffList.where((s) => s.id == widget.invoice.staffId).firstOrNull;
    }
    
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final settings = settingsState.settings;
        final currency = settings?.currency ?? '₦';

        return Scaffold(
          body: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark 
                    ? [const Color(0xFF1E1E2F), const Color(0xFF11111E)]
                    : [theme.colorScheme.primary.withOpacity(0.08), Colors.white],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    
                    // Animated Circle Checkmark
                    ScaleTransition(
                      scale: _scaleAnimation,
                      child: Center(
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: Colors.green.shade500,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.green.shade500.withOpacity(0.4),
                                blurRadius: 24,
                                spreadRadius: 4,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.check,
                            color: Colors.white,
                            size: 56,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Header text
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Column(
                        children: [
                          Text(
                            widget.successTitle ?? 'Invoice Created Successfully!',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Invoice #${widget.invoice.invoiceNumber}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Invoice Details Card
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2A2A3E) : Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade200,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildInfoRow('Amount Paid', CurrencyFormatter.formatWithSymbol(widget.invoice.amountPaid, symbol: currency), isBold: true, highlightColor: theme.colorScheme.primary),
                            if (widget.invoice.balanceAmount > 0)
                              _buildInfoRow('Balance Due', CurrencyFormatter.formatWithSymbol(widget.invoice.balanceAmount, symbol: currency), highlightColor: Colors.red),
                            if (widget.invoice.changeGiven > 0)
                              _buildInfoRow('Change Given', CurrencyFormatter.formatWithSymbol(widget.invoice.changeGiven, symbol: currency), highlightColor: Colors.green),
                            const Divider(height: 24),
                            _buildInfoRow('Payment Method', widget.invoice.paymentMethod ?? 'Cash'),
                            _buildInfoRow('Status', widget.invoice.paymentStatus, statusColor: widget.invoice.paymentStatus == 'Paid' ? Colors.green : Colors.orange),
                            _buildInfoRow('Date', DateFormat('yyyy-MM-dd HH:mm').format(widget.invoice.dateCreated)),
                            if (widget.invoice.customerName != null && widget.invoice.customerName!.isNotEmpty)
                              _buildInfoRow(settings?.businessMode == 'school' ? 'Student' : 'Customer', widget.invoice.customerName!),
                            if (widget.invoice.staffName != null)
                              _buildInfoRow('Billed By', widget.invoice.staffName!),
                            if (widget.invoice.paymentMethod == 'VirtualAccount' &&
                                currentStaff != null &&
                                currentStaff.virtualBankName != null &&
                                currentStaff.virtualBankName!.isNotEmpty) ...[
                              const Divider(height: 24),
                              Center(
                                child: Text(
                                  'SEND PAYMENT TO:',
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.primary,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              _buildInfoRow('Bank', currentStaff.virtualBankName!),
                              _buildInfoRow('Account Number', currentStaff.virtualAccountNumber ?? ''),
                              _buildInfoRow('Account Name', currentStaff.virtualAccountName ?? ''),
                            ],
                          ],
                        ),
                      ),
                    ),
                    
                    const Spacer(),
                    
                    // Action Buttons
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Done / Back to Dashboard (Primary Button)
                          ElevatedButton(
                            onPressed: () {
                              Navigator.popUntil(
                                context,
                                (route) => route.settings.name == '/dashboard' || route.isFirst,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: theme.colorScheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 0,
                            ),
                            child: const Text(
                              'DONE',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1.1),
                            ),
                          ),
                          const SizedBox(height: 12),
                          
                          Row(
                            children: [
                              // Print Receipt Button
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: settings != null ? () => _printReceipt(context, settings) : null,
                                  icon: const Icon(Icons.print_outlined),
                                  label: const Text('PRINT'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    side: BorderSide(color: theme.colorScheme.primary.withOpacity(0.5)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              
                              // View Preview Button
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ReceiptPreviewPage(invoice: widget.invoice),
                                      ),
                                    );
                                  },
                                  icon: const Icon(Icons.receipt_long_outlined),
                                  label: const Text('PREVIEW'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    side: BorderSide(color: theme.colorScheme.primary.withOpacity(0.5)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(
    String label, 
    String value, {
    bool isBold = false, 
    Color? highlightColor,
    Color? statusColor,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              fontSize: 14,
            ),
          ),
          const SizedBox(width: 16),
          Flexible(
            child: statusColor != null 
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      value.toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  )
                : Text(
                    value,
                    textAlign: TextAlign.end,
                    style: TextStyle(
                      fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
                      fontSize: isBold ? 16 : 14,
                      color: highlightColor ?? (isDark ? Colors.white : Colors.black87),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
