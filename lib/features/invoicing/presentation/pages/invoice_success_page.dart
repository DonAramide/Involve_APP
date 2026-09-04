import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/printer/domain/services/receipt_service.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/core/utils/sharing_utils.dart';
import 'package:involve_app/features/invoicing/presentation/pages/receipt_preview_page.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/invoicing/domain/templates/concrete_templates.dart';
import 'package:involve_app/features/invoicing/domain/templates/pos_receipt_commands.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class InvoiceSuccessPage extends StatefulWidget {
  final Invoice invoice;
  /// Overrides the default "Invoice Created Successfully!" headline.
  final String? successTitle;
  /// When true, automatically sends the receipt to the printer on open.
  final bool autoPrint;
  /// Card / POS approval details for receipt reprint from this page.
  final MposTransactionData? posTransaction;
  final String? terminalId;
  final String? merchantName;

  const InvoiceSuccessPage({
    super.key,
    required this.invoice,
    this.successTitle,
    this.autoPrint = false,
    this.posTransaction,
    this.terminalId,
    this.merchantName,
  });

  @override
  State<InvoiceSuccessPage> createState() => _InvoiceSuccessPageState();
}

class _InvoiceSuccessPageState extends State<InvoiceSuccessPage>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  bool _isSharing = false;

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

  InvoiceTemplate _templateFor(AppSettings settings) {
    final templateName = settings.defaultInvoiceTemplate ?? 'compact';
    if (templateName == 'detailed') return DetailedInvoiceTemplate();
    if (templateName == 'minimalist') return MinimalistInvoiceTemplate();
    if (templateName == 'professional') return ProfessionalInvoiceTemplate();
    if (templateName == 'modern') return ModernProfessionalTemplate();
    if (templateName == 'classic') return ClassicBusinessTemplate();
    return CompactInvoiceTemplate();
  }

  void _printReceipt(BuildContext context, AppSettings settings) {
    final template = _templateFor(settings);
    final commands = template.generateCommands(
      widget.invoice,
      settings,
      copyType: 'Customer Copy',
    );

    final posTx = widget.posTransaction;
    final isPos = posTx != null &&
        (widget.invoice.paymentMethod == 'POS' || posTx.paymentSuccess);

    if (isPos) {
      final merge = settings.mergePosReceipt;
      if (merge) {
        commands.addAll(buildPosReceiptCommands(
          tx: posTx,
          merchantName: widget.merchantName ?? settings.organizationName,
          terminalId: widget.terminalId,
          currency: settings.currency,
          copyType: 'Customer Copy',
          isMerged: true,
        ));
        context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
      } else {
        context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
        context.read<PrinterBloc>().add(PrintCommandsEvent(
              buildPosReceiptCommands(
                tx: posTx,
                merchantName: widget.merchantName ?? settings.organizationName,
                terminalId: widget.terminalId,
                currency: settings.currency,
                copyType: 'Customer Copy',
                isMerged: false,
              ),
              58,
            ));
      }
    } else {
      context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(isPos
            ? 'Sending invoice + card receipt to printer...'
            : 'Sending invoice to printer...'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.blue,
      ),
    );
  }

  String _shareCaption(AppSettings settings) {
    final inv = widget.invoice;
    final org = settings.organizationName;
    final currency = settings.currency;
    final who = inv.customerName?.trim().isNotEmpty == true
        ? inv.customerName!.trim()
        : 'Customer';
    final amount = CurrencyFormatter.formatWithSymbol(
      inv.amountPaid > 0 ? inv.amountPaid : inv.totalAmount,
      symbol: currency,
    );
    final buf = StringBuffer()
      ..writeln('$org — Receipt')
      ..writeln('Invoice: #${inv.invoiceNumber}')
      ..writeln('For: $who')
      ..writeln('Amount: $amount')
      ..writeln('Status: ${inv.paymentStatus}')
      ..writeln('Method: ${inv.paymentMethod ?? 'N/A'}')
      ..writeln(
          'Date: ${DateFormat('dd MMM yyyy HH:mm').format(inv.dateCreated)}');
    final pos = widget.posTransaction;
    if (pos != null) {
      if ((pos.rrn ?? '').isNotEmpty) buf.writeln('RRN: ${pos.rrn}');
      if ((pos.authCode ?? '').isNotEmpty) {
        buf.writeln('Auth: ${pos.authCode}');
      }
    }
    buf.writeln('\nThank you.');
    return buf.toString();
  }

  Future<({Uint8List bytes, String fileName, String caption})> _buildSharePayload(
    AppSettings settings,
  ) async {
    final bytes = await ReceiptService().generateReceiptPdf(
      widget.invoice,
      settings,
      receiptTitle: 'PAYMENT RECEIPT',
      userPlan: context.read<SettingsBloc>().state.userPlan,
    );
    final safeNo = widget.invoice.invoiceNumber
        .replaceAll(RegExp(r'[^\w\-]+'), '_');
    return (
      bytes: bytes,
      fileName: 'Receipt-$safeNo.pdf',
      caption: _shareCaption(settings),
    );
  }

  Future<void> _shareViaSystem(
    AppSettings settings, {
    String? subject,
  }) async {
    if (_isSharing) return;
    setState(() => _isSharing = true);
    try {
      final payload = await _buildSharePayload(settings);
      if (!mounted) return;
      await SharingUtils.shareFile(
        payload.bytes,
        payload.fileName,
        text: subject != null
            ? '$subject\n\n${payload.caption}'
            : payload.caption,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not share receipt: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  Future<void> _shareViaWhatsApp(AppSettings settings) async {
    if (_isSharing) return;
    setState(() => _isSharing = true);
    try {
      final payload = await _buildSharePayload(settings);
      if (!mounted) return;

      final tempDir = await getTemporaryDirectory();
      final file = File(p.join(tempDir.path, payload.fileName));
      await file.writeAsBytes(payload.bytes);

      await Share.shareXFiles(
        [XFile(file.path, mimeType: 'application/pdf')],
        text: payload.caption,
        subject: 'Receipt #${widget.invoice.invoiceNumber}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('WhatsApp share failed: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  Future<void> _shareViaEmail(AppSettings settings) async {
    if (_isSharing) return;
    setState(() => _isSharing = true);
    try {
      final payload = await _buildSharePayload(settings);
      if (!mounted) return;

      final email = (widget.invoice.customerAddress ?? '').trim();
      final looksLikeEmail = email.contains('@');
      final subject = Uri.encodeComponent(
          'Receipt #${widget.invoice.invoiceNumber}');
      final body = Uri.encodeComponent(payload.caption);

      if (looksLikeEmail) {
        final uri = Uri.parse('mailto:$email?subject=$subject&body=$body');
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri);
        }
      }

      await SharingUtils.shareFile(
        payload.bytes,
        payload.fileName,
        text: payload.caption,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Email share failed: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  void _showShareChannels(BuildContext context, AppSettings settings) {
    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const Text(
                  'Share Receipt',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Send PDF via WhatsApp, Email, or another app',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFF25D366).withOpacity(0.15),
                    child: const Icon(Icons.chat, color: Color(0xFF25D366)),
                  ),
                  title: const Text('WhatsApp'),
                  subtitle: const Text('Share PDF + receipt summary'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _shareViaWhatsApp(settings);
                  },
                ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.blue.withOpacity(0.12),
                    child: const Icon(Icons.email_outlined, color: Colors.blue),
                  ),
                  title: const Text('Email'),
                  subtitle: const Text('Open mail app / share PDF'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _shareViaEmail(settings);
                  },
                ),
                ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.deepPurple.withOpacity(0.12),
                    child: const Icon(Icons.ios_share, color: Colors.deepPurple),
                  ),
                  title: const Text('More…'),
                  subtitle: const Text('SMS, Drive, Bluetooth, and other apps'),
                  onTap: () {
                    Navigator.pop(ctx);
                    _shareViaSystem(
                      settings,
                      subject: 'Receipt #${widget.invoice.invoiceNumber}',
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
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
      currentStaff =
          staffList.where((s) => s.id == widget.invoice.staffId).firstOrNull;
    }

    final posTx = widget.posTransaction;

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
                    : [
                        theme.colorScheme.primary.withOpacity(0.08),
                        Colors.white
                      ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 24.0, vertical: 16.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(),
                    ScaleTransition(
                      scale: _scaleAnimation,
                      child: Center(
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: widget.invoice.paymentStatus.toLowerCase() == 'pending'
                                ? Colors.amber.shade700
                                : Colors.green.shade500,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: (widget.invoice.paymentStatus.toLowerCase() == 'pending'
                                        ? Colors.amber.shade700
                                        : Colors.green.shade500)
                                    .withOpacity(0.4),
                                blurRadius: 24,
                                spreadRadius: 4,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Icon(
                            widget.invoice.paymentStatus.toLowerCase() == 'pending'
                                ? Icons.hourglass_top_rounded
                                : Icons.check,
                            color: Colors.white,
                            size: 56,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Column(
                        children: [
                          Text(
                            widget.successTitle ??
                                (widget.invoice.paymentStatus.toLowerCase() == 'pending'
                                    ? 'Invoice Created (Awaiting Payment)'
                                    : 'Invoice Created Successfully!'),
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
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color:
                              isDark ? const Color(0xFF2A2A3E) : Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: isDark
                                ? Colors.white.withOpacity(0.05)
                                : Colors.grey.shade200,
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
                            _buildInfoRow(
                              'Amount Paid',
                              CurrencyFormatter.formatWithSymbol(
                                  widget.invoice.amountPaid,
                                  symbol: currency),
                              isBold: true,
                              highlightColor: theme.colorScheme.primary,
                            ),
                            if (widget.invoice.balanceAmount > 0)
                              _buildInfoRow(
                                'Balance Due',
                                CurrencyFormatter.formatWithSymbol(
                                    widget.invoice.balanceAmount,
                                    symbol: currency),
                                highlightColor: Colors.red,
                              ),
                            if (widget.invoice.changeGiven > 0)
                              _buildInfoRow(
                                'Change Given',
                                CurrencyFormatter.formatWithSymbol(
                                    widget.invoice.changeGiven,
                                    symbol: currency),
                                highlightColor: Colors.green,
                              ),
                            const Divider(height: 24),
                            _buildInfoRow('Payment Method',
                                widget.invoice.paymentMethod ?? 'Cash'),
                            _buildInfoRow(
                              'Status',
                              widget.invoice.paymentStatus,
                              statusColor:
                                  widget.invoice.paymentStatus == 'Paid'
                                      ? Colors.green
                                      : Colors.orange,
                            ),
                            _buildInfoRow(
                              'Date',
                              DateFormat('yyyy-MM-dd HH:mm')
                                  .format(widget.invoice.dateCreated),
                            ),
                            if (widget.invoice.customerName != null &&
                                widget.invoice.customerName!.isNotEmpty)
                              _buildInfoRow(
                                settings?.businessMode == 'school'
                                    ? 'Student'
                                    : 'Customer',
                                widget.invoice.customerName!,
                              ),
                            if (widget.invoice.staffName != null)
                              _buildInfoRow(
                                  'Billed By', widget.invoice.staffName!),
                            if (posTx != null) ...[
                              const Divider(height: 24),
                              Center(
                                child: Text(
                                  'CARD TRANSACTION',
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.primary,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              if ((posTx.maskedPan ?? '').isNotEmpty)
                                _buildInfoRow('PAN', posTx.maskedPan!),
                              if ((posTx.appLabel ?? posTx.aid ?? '')
                                  .isNotEmpty)
                                _buildInfoRow(
                                    'Card', posTx.appLabel ?? posTx.aid!),
                              if ((posTx.rrn ?? '').isNotEmpty)
                                _buildInfoRow('RRN', posTx.rrn!),
                              if ((posTx.stan ?? '').isNotEmpty)
                                _buildInfoRow('STAN', posTx.stan!),
                              if ((posTx.authCode ?? '').isNotEmpty)
                                _buildInfoRow('Auth Code', posTx.authCode!),
                              if ((widget.terminalId ?? '').isNotEmpty)
                                _buildInfoRow('Terminal', widget.terminalId!),
                            ],
                            if (widget.invoice.paymentMethod ==
                                    'VirtualAccount' &&
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
                              _buildInfoRow(
                                  'Bank', currentStaff.virtualBankName!),
                              _buildInfoRow('Account Number',
                                  currentStaff.virtualAccountNumber ?? ''),
                              _buildInfoRow('Account Name',
                                  currentStaff.virtualAccountName ?? ''),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const Spacer(),
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ElevatedButton(
                            onPressed: () {
                              Navigator.popUntil(
                                context,
                                (route) =>
                                    route.settings.name == '/dashboard' ||
                                    route.isFirst,
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
                              style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  letterSpacing: 1.1),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: settings != null
                                      ? () =>
                                          _printReceipt(context, settings)
                                      : null,
                                  icon: const Icon(Icons.print_outlined),
                                  label: const Text('PRINT'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    side: BorderSide(
                                        color: theme.colorScheme.primary
                                            .withOpacity(0.5)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ReceiptPreviewPage(
                                            invoice: widget.invoice),
                                      ),
                                    );
                                  },
                                  icon:
                                      const Icon(Icons.receipt_long_outlined),
                                  label: const Text('PREVIEW'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 14),
                                    side: BorderSide(
                                        color: theme.colorScheme.primary
                                            .withOpacity(0.5)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton.icon(
                            onPressed: settings == null || _isSharing
                                ? null
                                : () => _showShareChannels(context, settings),
                            icon: _isSharing
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.share_outlined),
                            label: Text(
                              _isSharing ? 'PREPARING…' : 'SHARE RECEIPT',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.8),
                            ),
                            style: OutlinedButton.styleFrom(
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                              foregroundColor: theme.colorScheme.primary,
                              side: BorderSide(
                                  color: theme.colorScheme.primary
                                      .withOpacity(0.5)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
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
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
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
                      color: highlightColor ??
                          (isDark ? Colors.white : Colors.black87),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
