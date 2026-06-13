import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/invoice_bloc.dart';
import '../bloc/invoice_state.dart';
import '../../../settings/presentation/bloc/settings_bloc.dart';
import '../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../printer/presentation/bloc/printer_state.dart';
import '../../domain/templates/invoice_template.dart';
import '../../../settings/presentation/bloc/settings_state.dart';
import '../pages/receipt_preview_page.dart';
import '../../domain/templates/concrete_templates.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../../../settings/domain/entities/settings.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import '../../domain/entities/invoice.dart';
import '../../../settings/domain/entities/staff.dart';
import '../../../settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/core/utils/nibss_response_codes.dart';
import 'package:involve_app/core/license/storage_service_native.dart';
import 'package:involve_app/services/mpos_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import 'package:involve_app/services/terminal_sync_service.dart';
import 'package:involve_app/core/offline/offline_webhook_service.dart';
import 'package:dio/dio.dart';


class InvoicePreviewDialog extends StatefulWidget {
  final InvoiceBloc invoiceBloc;

  const InvoicePreviewDialog({super.key, required this.invoiceBloc});

  @override
  State<InvoicePreviewDialog> createState() => _InvoicePreviewDialogState();
}

class _InvoicePreviewDialogState extends State<InvoicePreviewDialog> {
  late TextEditingController _amountReceivedController;
  bool _isInitialized = false;
  TerminalConfig? _terminalConfig;

  @override
  void initState() {
    super.initState();
    _amountReceivedController = TextEditingController();
    _amountReceivedController.addListener(_onAmountChanged);
    _loadTerminalConfig();
  }

  Future<void> _loadTerminalConfig() async {
    final config = await TerminalSyncService.loadCachedConfig();
    if (mounted) setState(() { _terminalConfig = config; });
  }

  void _onAmountChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _amountReceivedController.removeListener(_onAmountChanged);
    _amountReceivedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: widget.invoiceBloc,
      child: BlocBuilder<InvoiceBloc, InvoiceState>(
        builder: (context, invoiceState) {
          return BlocBuilder<SettingsBloc, SettingsState>(
            builder: (context, settingsState) {
              final settings = settingsState.settings;

              // Initialize amount received once total and method are available
              if (!_isInitialized && settings != null) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (invoiceState.paymentMethod == 'Deferred') {
                    _amountReceivedController.text = '0.00';
                  } else if (invoiceState.paymentMethod != null) {
                    _amountReceivedController.text = CurrencyFormatter.format(invoiceState.total);
                  }
                });
                _isInitialized = true;
              }

              return AlertDialog(
                title: const Text('Invoice Preview'),
                content: SizedBox(
                  width: 400,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Text(
                            settings?.organizationName ?? 'BAR & HOTEL NAME',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                        ),
                        if (settings?.businessDescription != null && settings!.businessDescription!.isNotEmpty)
                          Center(
                            child: Text(
                              settings.businessDescription!,
                              style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        Center(child: Text(settings?.address ?? 'Address Line 1, City')),
                        Center(child: Text('Phone: ${settings?.phone ?? 'N/A'}')),
                        const Divider(),
                        Center(
                          child: Text(
                            'Invoice #INV-${DateTime.now().millisecondsSinceEpoch}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Center(
                          child: Text(
                            'Date: ${DateTime.now().toIso8601String().split('T')[0]}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                        const Divider(),
                        ...invoiceState.items.map((item) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('${item.quantity}x ${item.item.name}'),
                                  Text(
                                    CurrencyFormatter.formatWithSymbol(
                                      item.total,
                                      symbol: settings?.currency ?? '₦',
                                    ),
                                  ),
                                ],
                              ),
                            )),
                        const Divider(),
                        _row('Subtotal', invoiceState.subtotal, settings?.currency ?? '₦'),
                        _row('Tax (${(invoiceState.taxRate * 100).toStringAsFixed(0)}%)', invoiceState.tax, settings?.currency ?? '₦'),
                        if (invoiceState.discount > 0) ...[
                          _row(
                            invoiceState.discountType == DiscountType.percentage 
                              ? 'Discount (${invoiceState.discount % 1 == 0 ? invoiceState.discount.toInt() : invoiceState.discount}%)' 
                              : 'Discount', 
                            -widget.invoiceBloc.calculationService.calculateDiscountAmount(
                              invoiceState.subtotal, 
                              invoiceState.tax, 
                              invoiceState.discount, 
                              invoiceState.discountType,
                            ), 
                            settings?.currency ?? '₦'
                          ),
                        ],
                        const Divider(),
                        _row('Total', invoiceState.total, settings?.currency ?? '₦', isBold: true),
                        if (invoiceState.warrantyDuration != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Warranty:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              Text(invoiceState.warrantyDuration!, style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                        ],
                        
                        Builder(
                          builder: (context) {
                            final amountReceived = double.tryParse(_amountReceivedController.text) ?? 0.0;
                            final balanceAmount = (invoiceState.total - amountReceived).clamp(0.0, double.infinity);
                            final isFullPayment = balanceAmount <= 0;
                            final showAccount = (settings?.showAccountDetails == true || invoiceState.paymentMethod == 'Transfer' || invoiceState.paymentMethod == 'VirtualAccount') && !isFullPayment;
                            
                            if (showAccount) {
                              if (invoiceState.paymentMethod == 'VirtualAccount') {
                                final staffList = context.watch<StaffBloc>().state.staffList;
                                Staff? currentStaff;
                                if (invoiceState.staffId != null) {
                                  currentStaff = staffList.where((s) => s.id == invoiceState.staffId).firstOrNull;
                                }
                                
                                if (currentStaff?.virtualBankName != null && currentStaff!.virtualBankName!.isNotEmpty) {
                                  return Column(
                                    children: [
                                      const SizedBox(height: 12),
                                      const Divider(thickness: 1),
                                      const Center(
                                        child: Text(
                                          'PAYMENT DETAILS',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Center(child: Text('Bank: ${currentStaff.virtualBankName}', style: const TextStyle(fontSize: 12))),
                                      Center(child: Text('Account: ${currentStaff.virtualAccountNumber ?? ""}', style: const TextStyle(fontSize: 12))),
                                      Center(child: Text('Name: ${currentStaff.virtualAccountName ?? ""}', style: const TextStyle(fontSize: 12))),
                                    ],
                                  );
                                } else {
                                  return Column(
                                    children: [
                                      const SizedBox(height: 12),
                                      const Divider(thickness: 1),
                                      const Center(
                                        child: Text(
                                          'PAYMENT DETAILS',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      const Center(child: Text('Contact admin for account profiling', style: TextStyle(fontSize: 12, color: Colors.red))),
                                    ],
                                  );
                                }
                              } else if (settings?.bankName != null) {
                                return Column(
                                  children: [
                                    const SizedBox(height: 12),
                                    const Divider(thickness: 1),
                                    const Center(
                                      child: Text(
                                        'PAYMENT DETAILS',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Center(child: Text('Bank: ${settings!.bankName}', style: const TextStyle(fontSize: 12))),
                                    Center(child: Text('Account: ${settings.accountNumber ?? ""}', style: const TextStyle(fontSize: 12))),
                                    Center(child: Text('Name: ${settings.accountName ?? ""}', style: const TextStyle(fontSize: 12))),
                                  ],
                                );
                              }
                            }
                            return const SizedBox.shrink();
                          },
                        ),

                        if (settings?.paymentMethodsEnabled == true) ...[
                          const Divider(),
                          const Text('Select Payment Method:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 4),
                          _buildPaymentMethodSelector(context, invoiceState),
                          if (invoiceState.paymentMethod != null) ...[
                            const SizedBox(height: 12),
                            const Text('Amount Received:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _amountReceivedController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: InputDecoration(
                                prefixText: '${settings?.currency ?? '₦'} ',
                                border: const OutlineInputBorder(),
                                hintText: '0.00',
                              ),
                            ),
                            Builder(
                              builder: (context) {
                                final amountReceivedText = double.tryParse(_amountReceivedController.text) ?? 0.0;
                                final changeDue = (amountReceivedText - invoiceState.total).clamp(0.0, double.infinity);
                                
                                if (changeDue > 0) {
                                  // Only show change due if it's cash OR if give change is allowed for electronic payments
                                  final isElectronic = invoiceState.paymentMethod == 'POS' || invoiceState.paymentMethod == 'Transfer';
                                  if (!isElectronic || settings?.allowGiveChange == true) {
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 8.0),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Change Due:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                                          Text(
                                            CurrencyFormatter.formatWithSymbol(changeDue, symbol: settings?.currency ?? '₦'),
                                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                                          ),
                                        ],
                                      ),
                                    );
                                  }
                                }
                                return const SizedBox.shrink();
                              },
                            ),
                          ],
                        ],
                        
                        if (settings?.showSignatureSpace == true) ...[
                          const SizedBox(height: 8),
                          const Center(child: Text('Signature: ____________________', style: TextStyle(fontSize: 12))),
                        ],
                        const SizedBox(height: 12),
                        Center(
                          child: Text(
                            settings?.receiptFooter ?? 'Thank you!',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        const Center(child: Text('Powered by IIPS', style: TextStyle(fontSize: 10, color: Colors.grey))),
                      ],
                    ),
                  ),
                ),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('EDIT')),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                    onPressed: (invoiceState.isSaving || invoiceState.isGeneratingAccount || (settings?.paymentMethodsEnabled == true && invoiceState.paymentMethod == null)) ? null : () async {
                      try {
                        MposTransactionData? posTransactionData;
                        if (invoiceState.paymentMethod == 'POS') {
                          if (!mounted) return;
                          if (_terminalConfig == null || _terminalConfig!.posSerialNumber == null || _terminalConfig!.posSerialNumber!.isEmpty) {
                            await showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('POS Not Configured'),
                                content: const Text('This POS device is not authorized or provisioned in Invify Operations.'),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                              ),
                            );
                            return;
                          }
                          final terminalId = _terminalConfig!.terminalId ?? _terminalConfig!.mposTerminalId ?? '2214OTGF';

                          // Network Check
                          final connectivityResult = await Connectivity().checkConnectivity();
                          if (!mounted) return;
                          if (connectivityResult.contains(ConnectivityResult.none) || connectivityResult.isEmpty) {
                            await showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('No Internet'),
                                content: const Text('POS requires an active network connection.'),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                              ),
                            );
                            return;
                          }

                          final amountReceivedText = double.tryParse(_amountReceivedController.text) ?? 0.0;
                          final amountToCharge = (settings?.allowGiveChange == true && amountReceivedText > invoiceState.total) 
                              ? amountReceivedText 
                              : invoiceState.total;
                          
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Confirm POS Payment'),
                              content: Text('Charge ${CurrencyFormatter.formatWithSymbol(amountToCharge, symbol: settings?.currency ?? '₦')} to POS terminal?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
                                ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('CHARGE')),
                              ],
                            ),
                          );
                          
                          if (confirm != true) return;

                          if (!mounted) return;
                          showDialog(
                            context: context,
                            barrierDismissible: false,
                            builder: (_) => const Center(child: CircularProgressIndicator()),
                          );
                          
                          final routingRules = _terminalConfig?.routingRules ?? {};
                          final processOnDevice = routingRules['processOnDevice'] == true;
                          final webhookUrl = routingRules['webhookUrl'] as String?;

                          final activeHost = _terminalConfig?.activeHost ?? 'MEDUSA';
                          var result = await MposService().initiatePayment(
                            amount: amountToCharge,
                            terminalId: terminalId,
                            activeHost: activeHost,
                            processOnDevice: processOnDevice,
                          );

                          // Fallback to secondary host if transaction fails
                          if (result.status != 'payment_success' && _terminalConfig?.secondaryHost != null) {
                            final secondaryHostName = _terminalConfig!.secondaryHost!['hostName'] as String?;
                            if (secondaryHostName != null && secondaryHostName != activeHost) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Primary host failed. Falling back to secondary host: $secondaryHostName...')));
                              result = await MposService().initiatePayment(
                                amount: amountToCharge,
                                terminalId: terminalId,
                                activeHost: secondaryHostName,
                                processOnDevice: processOnDevice,
                              );
                            }
                          }
                          if (!mounted) return;
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context); // Close loading
                          }

                          posTransactionData = result.transaction;
                          if (result.status == 'payment_success' || result.status == 'payment_failed') {
                            final shouldPrint = !(settings?.mergePosReceipt ?? false);
                            await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {
                                'terminalId': terminalId,
                                'amount': amountToCharge,
                                'isDeviceProcessed': true,
                                'deviceStatus': result.status,
                                'tenantProfile': _terminalConfig?.tenantPolicy,
                                'deviceInfo': {
                                  'terminalId': _terminalConfig?.terminalId,
                                  'mposTerminalId': _terminalConfig?.mposTerminalId,
                                  'posSerialNumber': _terminalConfig?.posSerialNumber,
                                },
                                'emvData': result.emvData?.toJson(),
                                'transactionResponse': result.transaction?.toJson(),
                                'staffName': invoiceState.staffName,
                                'items': invoiceState.items.map((i) => {
                                  'name': i.item.name,
                                  'quantity': i.quantity,
                                  'price': i.item.price,
                                }).toList(),
                            });
                          } else if (result.status == 'emv_data_ready' && result.emvData != null) {
                            final financeRepo = context.read<FinanceRepository>();
                            final backendResponse = await financeRepo.apiClient.post(
                              '/api/pos/transaction',
                              data: {
                                'terminalId': terminalId,
                                'amount': amountToCharge,
                                'emvData': result.emvData!.toJson(),
                                'staffName': invoiceState.staffName,
                                'items': invoiceState.items.map((i) => {
                                  'name': i.item.name,
                                  'quantity': i.quantity,
                                  'price': i.item.price,
                                }).toList(),
                              },
                            );
                            if (!mounted) return;
                            if (backendResponse.statusCode != 200 || backendResponse.data['paymentSuccess'] != true) {
                              final code = backendResponse.data['statusCode'] ?? 'Unknown';
                              await showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('POS Declined'),
                                  content: Text('Transaction declined by host (Code: $code).'),
                                  actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                                ),
                              );
                              return;
                            }
                          } else if (result.status == 'error' || result.transaction?.paymentSuccess != true) {
                            String errorMessage = result.error?.message ?? result.transaction?.message ?? 'Unknown Error';
                            if (result.transaction?.statusCode != null && result.transaction!.statusCode!.isNotEmpty) {
                              final codeMsg = NibssResponseCodes.getMessage(result.transaction!.statusCode);
                              errorMessage = 'Code ${result.transaction!.statusCode}: $codeMsg';
                            }
                            if (!mounted) return;
                            await showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('POS Payment Failed'),
                                content: Text(errorMessage),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                              ),
                            );
                            return;
                          }
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('POS Payment Approved!'), backgroundColor: Colors.green),
                          );
                        }

                        final amountReceived = CurrencyFormatter.parse(_amountReceivedController.text);

                        // Safety check for significant overpayment
                        if (amountReceived > invoiceState.total * 2 && invoiceState.total > 0) {
                          final proceed = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Confirm Overpayment'),
                              content: const Text('The amount received is significantly higher than the total. Proceed?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('NO, CORRECT IT')),
                                ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('YES, PROCEED')),
                              ],
                            ),
                          );
                          if (proceed != true) return;
                        }
                        
                        double changeGiven = 0.0;
                        double finalAmountPaid = amountReceived;
                        if (amountReceived > invoiceState.total) {
                          if (settings?.allowGiveChange == true && (invoiceState.paymentMethod == 'POS' || invoiceState.paymentMethod == 'Transfer')) {
                            changeGiven = amountReceived - invoiceState.total;
                          } else {
                            // For Cash, or if give change is disabled, we cap the recorded paid amount to total.
                            finalAmountPaid = invoiceState.total;
                          }
                        }

                        final invoiceNumber = widget.invoiceBloc.calculationService.generateInvoiceNumber();
                        widget.invoiceBloc.add(SaveInvoice(
                          invoiceNumber: invoiceNumber,
                          amountPaid: finalAmountPaid,
                          changeGiven: changeGiven,
                        ));

                        await Future.delayed(const Duration(milliseconds: 300));

                        // Create invoice object for printing
                        final status = amountReceived >= invoiceState.total
                            ? 'Paid'
                            : (amountReceived <= 0 ? 'Unpaid' : 'Partial');
                        final invoice = Invoice(
                          id: 0,
                          invoiceNumber: invoiceNumber,
                          dateCreated: DateTime.now(),
                          items: List.from(invoiceState.items),
                          subtotal: invoiceState.subtotal,
                          taxAmount: invoiceState.tax,
                          discountAmount: widget.invoiceBloc.calculationService.calculateDiscountAmount(
                            invoiceState.subtotal,
                            invoiceState.tax,
                            invoiceState.discount,
                            invoiceState.discountType,
                          ),
                          discountType: invoiceState.discountType,
                          totalAmount: invoiceState.total,
                          paymentStatus: status,
                          amountPaid: finalAmountPaid,
                          balanceAmount: (invoiceState.total - finalAmountPaid).clamp(0, double.infinity),
                          customerName: invoiceState.customerName,
                          customerPhone: invoiceState.customerPhone,
                          customerAddress: invoiceState.customerAddress,
                          paymentMethod: invoiceState.paymentMethod,
                          staffId: invoiceState.staffId,
                          staffName: invoiceState.staffName,
                          totalPrintAmount: widget.invoiceBloc.calculationService.calculateTotalPrintAmount(
                            invoiceState.items,
                            invoiceState.taxRate,
                            invoiceState.taxEnabled,
                            invoiceState.discount,
                            invoiceState.discountType,
                          ),
                          businessMode: invoiceState.businessMode,
                          studentId: invoiceState.studentId,
                          classId: invoiceState.classId,
                          termId: invoiceState.termId,
                          academicYearId: invoiceState.academicYearId,
                          admissionNumber: invoiceState.admissionNumber,
                          className: invoiceState.className,
                          termName: invoiceState.termName,
                          academicYearName: invoiceState.academicYearName,
                          studentImage: invoiceState.studentImage,
                          warrantyDuration: invoiceState.warrantyDuration,
                          changeGiven: changeGiven,
                        );

                        _printInvoice(context, invoice, settings!, posTx: posTransactionData);
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invoice saved!')));
                      } catch (e) {
                        if (!mounted) return;
                        if (Navigator.canPop(context)) {
                          Navigator.pop(context); // Close loading
                        }
                        await showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Error'),
                            content: Text(e.toString()),
                            actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                          ),
                        );
                      }
                    },
                    child: (invoiceState.isSaving || invoiceState.isGeneratingAccount)
                      ? const Text('PROCESSING...', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white))
                      : Text(invoiceState.paymentMethod == 'POS' ? 'CHARGE POS & SAVE' : 'SAVE & PRINT'),
                  ),
                  ElevatedButton(
                    onPressed: (invoiceState.isSaving || (settings?.paymentMethodsEnabled == true && invoiceState.paymentMethod == null)) ? null : () async {
                      try {
                      MposTransactionData? posTransactionData;
                      final amountReceived = CurrencyFormatter.parse(_amountReceivedController.text);

                      if (invoiceState.paymentMethod == 'POS') {
                        if (!mounted) return;
                        if (_terminalConfig == null || _terminalConfig!.posSerialNumber == null || _terminalConfig!.posSerialNumber!.isEmpty) {
                          await showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('POS Not Configured'),
                              content: const Text('This POS device is not authorized or provisioned in Invify Operations.'),
                              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                            ),
                          );
                          return;
                        }
                        final terminalId = _terminalConfig!.terminalId ?? _terminalConfig!.mposTerminalId ?? '2214OTGF';

                        final connectivityResult = await Connectivity().checkConnectivity();
                        if (!mounted) return;
                        if (connectivityResult.contains(ConnectivityResult.none) || connectivityResult.isEmpty) {
                          await showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('No Internet'),
                              content: const Text('POS requires an active network connection.'),
                              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                            ),
                          );
                          return;
                        }

                        final amountToCharge = invoiceState.total;
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Confirm POS Payment'),
                            content: Text('Charge ${CurrencyFormatter.formatWithSymbol(amountToCharge, symbol: settings?.currency ?? '₦')} to POS terminal?'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
                              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('CHARGE')),
                            ],
                          ),
                        );
                        if (confirm != true) return;

                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sending to POS terminal…')));

                        final routingRules = _terminalConfig?.routingRules ?? {};
                        final processOnDevice = routingRules['processOnDevice'] == true;
                        final webhookUrl = routingRules['webhookUrl'] as String?;

                        final activeHost = _terminalConfig?.activeHost ?? 'MEDUSA';
                        var result = await MposService().initiatePayment(
                          amount: amountToCharge,
                          terminalId: terminalId,
                          activeHost: activeHost,
                          processOnDevice: processOnDevice,
                        );

                        // Fallback to secondary host if transaction fails
                        if (result.status != 'payment_success' && _terminalConfig?.secondaryHost != null) {
                          final secondaryHostName = _terminalConfig!.secondaryHost!['hostName'] as String?;
                          if (secondaryHostName != null && secondaryHostName != activeHost) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Primary host failed. Falling back to secondary host: $secondaryHostName...')));
                            result = await MposService().initiatePayment(
                              amount: amountToCharge,
                              terminalId: terminalId,
                              activeHost: secondaryHostName,
                              processOnDevice: processOnDevice,
                            );
                          }
                        }
                        if (!mounted) return;

                        posTransactionData = result.transaction;
                        if (result.status == 'payment_success' || result.status == 'payment_failed') {
                          final shouldPrint = !(settings?.mergePosReceipt ?? false);
                          await _processWebhookAndSuccess(context, webhookUrl ?? '', result, {
                              'terminalId': terminalId,
                              'amount': amountToCharge,
                              'isDeviceProcessed': true,
                              'deviceStatus': result.status,
                              'tenantProfile': _terminalConfig?.tenantPolicy,
                              'deviceInfo': {
                                'terminalId': _terminalConfig?.terminalId,
                                'mposTerminalId': _terminalConfig?.mposTerminalId,
                                'posSerialNumber': _terminalConfig?.posSerialNumber,
                              },
                              'emvData': result.emvData?.toJson(),
                              'transactionResponse': result.transaction?.toJson(),
                          }, shouldPrint: shouldPrint);
                        } else if (result.status == 'emv_data_ready' && result.emvData != null) {
                          final financeRepo = context.read<FinanceRepository>();
                          final backendResponse = await financeRepo.apiClient.post(
                            '/api/pos/transaction',
                            data: {'terminalId': terminalId, 'amount': amountToCharge, 'emvData': result.emvData!.toJson()},
                          );
                          if (!mounted) return;
                          if (backendResponse.statusCode != 200 || backendResponse.data['paymentSuccess'] != true) {
                            final code = backendResponse.data['statusCode'] ?? 'Unknown';
                            await showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('POS Declined'),
                                content: Text('Transaction declined (Code: $code).'),
                                actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                              ),
                            );
                            return;
                          }
                        } else if (result.status == 'error' || result.transaction?.paymentSuccess != true) {
                          String errorMessage = result.error?.message ?? result.transaction?.message ?? 'Unknown Error';
                          if (result.transaction?.statusCode != null && result.transaction!.statusCode!.isNotEmpty) {
                            final codeMsg = NibssResponseCodes.getMessage(result.transaction!.statusCode);
                            errorMessage = 'Code ${result.transaction!.statusCode}: $codeMsg';
                          }
                          if (!mounted) return;
                          await showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('POS Payment Failed'),
                              content: Text(errorMessage),
                              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                            ),
                          );
                          return;
                        }
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('POS Payment Approved!'), backgroundColor: Colors.green),
                        );
                      }

                      // Safety check for significant overpayment
                      if (amountReceived > invoiceState.total * 2 && invoiceState.total > 0) {
                        final proceed = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Confirm Overpayment'),
                            content: Text('The amount received ($amountReceived) is significantly higher than the total (${invoiceState.total}). Are you sure you want to proceed?'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('NO, CORRECT IT')),
                              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('YES, PROCEED')),
                            ],
                          ),
                        );
                        if (proceed != true) return;
                      }

                      final invoiceNumber = widget.invoiceBloc.calculationService.generateInvoiceNumber();
                      
                      widget.invoiceBloc.add(SaveInvoice(
                        invoiceNumber: invoiceNumber,
                        amountPaid: amountReceived,
                      ));
                      
                      await Future.delayed(const Duration(milliseconds: 500));
                      
                      final status = amountReceived >= invoiceState.total ? 'Paid' : (amountReceived <= 0 ? 'Unpaid' : 'Partial');
                      final savedInvoice = Invoice(
                        id: 0,
                        invoiceNumber: invoiceNumber,
                        dateCreated: DateTime.now(),
                        items: List.from(invoiceState.items),
                        subtotal: invoiceState.subtotal,
                        taxAmount: invoiceState.tax,
                        discountAmount: widget.invoiceBloc.calculationService.calculateDiscountAmount(
                          invoiceState.subtotal, 
                          invoiceState.tax, 
                          invoiceState.discount, 
                          invoiceState.discountType,
                        ),
                        discountType: invoiceState.discountType,
                        totalAmount: invoiceState.total,
                        paymentStatus: status,
                        amountPaid: amountReceived,
                        balanceAmount: (invoiceState.total - amountReceived).clamp(0, double.infinity),
                        customerName: invoiceState.customerName,
                        customerPhone: invoiceState.customerPhone,
                        customerAddress: invoiceState.customerAddress,
                        paymentMethod: invoiceState.paymentMethod,
                        staffId: invoiceState.staffId,
                        staffName: invoiceState.staffName,
                        totalPrintAmount: widget.invoiceBloc.calculationService.calculateTotalPrintAmount(
                          invoiceState.items, 
                          invoiceState.taxRate, 
                          invoiceState.taxEnabled, 
                          invoiceState.discount,
                          invoiceState.discountType,
                        ),
                        businessMode: invoiceState.businessMode,
                        studentId: invoiceState.studentId,
                        classId: invoiceState.classId,
                        termId: invoiceState.termId,
                        academicYearId: invoiceState.academicYearId,
                        admissionNumber: invoiceState.admissionNumber,
                        className: invoiceState.className,
                        termName: invoiceState.termName,
                        academicYearName: invoiceState.academicYearName,
                        studentImage: invoiceState.studentImage,
                        warrantyDuration: invoiceState.warrantyDuration,
                      );

                      if (mounted) {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ReceiptPreviewPage(invoice: savedInvoice)));
                      }
                      } catch (e) {
                        if (!mounted) return;
                        await showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Error'),
                            content: Text(e.toString()),
                            actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
                          ),
                        );
                      }
                    },
                    child: invoiceState.isSaving ? const Text('SAVING...') : Text(invoiceState.paymentMethod == 'POS' ? 'CHARGE POS & PREVIEW' : 'SAVE & PREVIEW'),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  void _printInvoice(BuildContext context, Invoice invoice, AppSettings settings, {MposTransactionData? posTx}) {
    final templateName = settings.defaultInvoiceTemplate ?? 'compact';
    final InvoiceTemplate template;
    if (templateName == 'detailed') template = DetailedInvoiceTemplate();
    else if (templateName == 'minimalist') template = MinimalistInvoiceTemplate();
    else if (templateName == 'professional') template = ProfessionalInvoiceTemplate();
    else if (templateName == 'modern') template = ModernProfessionalTemplate();
    else if (templateName == 'classic') template = ClassicBusinessTemplate();
    else template = CompactInvoiceTemplate();

    final commands = template.generateCommands(invoice, settings);
    if (posTx != null && settings.mergePosReceipt == true) {
      commands.addAll(_getPosReceiptCommands(posTx, settings));
      commands.add(SizedBoxCommand(height: 1));
    }
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
  }

  Widget _buildPaymentMethodSelector(BuildContext context, InvoiceState state) {
    final isPosEnabled = _terminalConfig != null && _terminalConfig!.posSerialNumber != null && _terminalConfig!.posSerialNumber!.isNotEmpty;

    return Column(
      children: [
        RadioListTile<String>(
          title: const Text('Cash'),
          value: 'Cash',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = CurrencyFormatter.format(state.total);
          },
        ),
        RadioListTile<String>(
          title: Row(
            children: [
              Text('POS', style: TextStyle(color: isPosEnabled ? null : Colors.grey)),
              if (!isPosEnabled) ...[
                const SizedBox(width: 8),
                const Text('(Not Configured)', style: TextStyle(fontSize: 10, color: Colors.red)),
              ]
            ]
          ),
          value: 'POS',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: isPosEnabled ? (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = CurrencyFormatter.format(state.total);
          } : null,
        ),
        RadioListTile<String>(
          title: const Text('Transfer'),
          value: 'Transfer',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = CurrencyFormatter.format(state.total);
          },
        ),
        RadioListTile<String>(
          title: const Text('Pay with Transfer (Virtual Account)', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
          value: 'VirtualAccount',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = CurrencyFormatter.format(state.total);
          },
        ),
        RadioListTile<String>(
          title: const Text('Customer Wallet/Credit', style: TextStyle(color: Colors.purple, fontWeight: FontWeight.bold)),
          value: 'Wallet',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: state.customerId != null ? (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = CurrencyFormatter.format(state.total);
          } : null,
          subtitle: state.customerId == null ? const Text('Please select a customer first.', style: TextStyle(fontSize: 10, color: Colors.grey)) : null,
        ),
        RadioListTile<String>(
          title: const Text('Pay Later (deferred)/ part payment', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
          value: 'Deferred',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = '0.00';
          },
        ),
        if (state.paymentMethod == null)
          const Padding(
            padding: EdgeInsets.only(left: 8.0),
            child: Text('Please select a payment method', style: TextStyle(color: Colors.red, fontSize: 12)),
          ),
      ],
    );
  }

  Widget _row(String label, double value, String currency, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(
            CurrencyFormatter.formatWithSymbol(value, symbol: currency),
            style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal),
          ),
        ],
      ),
    );
  }

  Widget _buildVirtualAccountDetails(Map<String, dynamic> intent) {
    final account = intent['account'] ?? intent;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.withOpacity(0.2)),
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
            account['account_number'] ?? account['accountNumber'] ?? 'N/A',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            account['bank_name'] ?? account['bankName'] ?? 'N/A',
            style: const TextStyle(fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          Text(
            account['account_name'] ?? account['accountName'] ?? '',
            style: const TextStyle(fontSize: 12),
            textAlign: TextAlign.center,
          ),
          const Divider(),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.sync, size: 12, color: Colors.blue),
              SizedBox(width: 8),
              Text('Waiting for payment confirmation...', style: TextStyle(fontSize: 10, fontStyle: FontStyle.italic)),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _processWebhookAndSuccess(
      BuildContext context,
      String webhookUrl,
      MposTransactionResponse result,
      Map<String, dynamic> data,
      {bool shouldPrint = true}) async {
    final financeRepo = context.read<FinanceRepository>();
    final endpoint = webhookUrl.isNotEmpty ? webhookUrl : '/api/pos/transaction';
    
    Response? backendResponse;
    final offlineService = OfflineWebhookService(financeRepo.apiClient.dio);
    try {
      await offlineService.syncQueue();
      backendResponse = await financeRepo.apiClient.post(endpoint, data: data);
    } catch (e) {
      debugPrint('[Webhook] Failed to sync to server: $e');
      // Enqueue for offline sync
      await offlineService.enqueuePayload(endpoint, data);
    }

    if (!mounted) return;

    if (result.status == 'payment_failed') {
      final msg = result.transaction?.message ?? 'Unknown Error';
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('POS Declined'),
          content: Text('Transaction declined by MPOS ($msg).'),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
        ),
      );
      return;
    }

    if (backendResponse != null && backendResponse.statusCode != 200 && backendResponse.statusCode != 201) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment approved but failed to sync to server (Queued).')));
    }

    // Success Screen & Print Receipt
    if (result.status == 'payment_success' && result.transaction != null) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Row(children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('Purchase Successful')
          ]),
          content: Builder(
            builder: (ctx) {
              final amtStr = result.transaction!.amount ?? '0';
              final amtValue = (double.tryParse(amtStr) ?? 0) / 100;
              final formattedAmount = CurrencyFormatter.formatWithSymbol(amtValue, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦');

              String maskPan(String pan) {
                if (pan.length < 10) return pan;
                return '${pan.substring(0, 4)}********${pan.substring(pan.length - 4)}';
              }
              final maskedPan = maskPan(result.transaction!.maskedPan ?? '');

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Amount: $formattedAmount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('RRN: ${result.transaction!.rrn}'),
                  Text('STAN: ${result.transaction!.stan}'),
                  Text('Card: $maskedPan'),
                  const Text('Status: Approved', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                ],
              );
            }
          ),
          actions: [
            TextButton(
              onPressed: () {
                _printPosReceipt(result.transaction!);
                Navigator.pop(ctx);
              },
              child: const Text('PRINT RECEIPT & CLOSE'),
            )
          ],
        ),
      );
    }
  }


  String _maskPan(String? pan) {
    if (pan == null || pan.length < 10) return pan ?? "";
    return "${pan.substring(0, 4)}********${pan.substring(pan.length - 4)}";
  }

  String _formatPosAmount(String? rawAmount, String symbol) {
    if (rawAmount == null || rawAmount.isEmpty) return "";
    final doubleAmount = (double.tryParse(rawAmount) ?? 0) / 100;
    return CurrencyFormatter.formatWithSymbol(doubleAmount, symbol: symbol);
  }

  String _formatPosDate(String? rawDate) {
    if (rawDate == null || rawDate.length != 10) return rawDate ?? "";
    try {
      final now = DateTime.now();
      final month = int.parse(rawDate.substring(0, 2));
      final day = int.parse(rawDate.substring(2, 4));
      final hour = int.parse(rawDate.substring(4, 6));
      final minute = int.parse(rawDate.substring(6, 8));
      final second = int.parse(rawDate.substring(8, 10));
      final date = DateTime(now.year, month, day, hour, minute, second);
      return DateFormat('dd MMM, HH:mm:ss').format(date);
    } catch (e) {
      return rawDate;
    }
  }

  List<PrintCommand> _getPosReceiptCommands(MposTransactionData tx, AppSettings? settings) {
    final String merchantName = _terminalConfig?.businessName ?? settings?.organizationName ?? 'MERCHANT';
    final String merchantId = _terminalConfig?.terminalId ?? 'N/A';
    final currency = settings?.currency ?? 'NGN';

    return [
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('POS PAYMENT RECEIPT', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand(merchantName, align: 'center'),
      TextCommand('Terminal ID: $merchantId', align: 'center'),
      SizedBoxCommand(height: 1),
      TextCommand('Card Holder: ${tx.cardHolderName ?? ""}'),
      TextCommand('Card Type: ${tx.appLabel ?? ""}'),
      TextCommand('PAN: ${_maskPan(tx.maskedPan)}'),
      TextCommand('Amount: ${_formatPosAmount(tx.amount, currency)}', isBold: true),
      TextCommand('Auth Code: ${tx.authCode ?? ""}'),
      TextCommand('RRN: ${tx.rrn ?? ""}'),
      TextCommand('STAN: ${tx.stan ?? ""}'),
      TextCommand('Date: ${_formatPosDate(tx.dateTime)}'),
      TextCommand('--------------------------------', align: 'center'),
      TextCommand('APPROVED', isBold: true, align: 'center'),
      TextCommand('--------------------------------', align: 'center'),
    ];
  }

  void _printPosReceipt(MposTransactionData tx) {
    final settings = context.read<SettingsBloc>().state.settings;
    final commands = _getPosReceiptCommands(tx, settings);
    commands.add(SizedBoxCommand(height: 1)); // Minimal space at end
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58)); // Assuming 58mm
  }
}
