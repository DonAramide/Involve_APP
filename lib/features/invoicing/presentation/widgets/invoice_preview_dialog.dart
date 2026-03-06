import 'package:flutter/material.dart';
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
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import '../../domain/entities/invoice.dart';

class InvoicePreviewDialog extends StatefulWidget {
  final InvoiceBloc invoiceBloc;

  const InvoicePreviewDialog({super.key, required this.invoiceBloc});

  @override
  State<InvoicePreviewDialog> createState() => _InvoicePreviewDialogState();
}

class _InvoicePreviewDialogState extends State<InvoicePreviewDialog> {
  late TextEditingController _amountReceivedController;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _amountReceivedController = TextEditingController();
  }

  @override
  void dispose() {
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
                if (invoiceState.paymentMethod == 'Deferred') {
                  _amountReceivedController.text = '0';
                } else if (invoiceState.paymentMethod != null) {
                  _amountReceivedController.text = invoiceState.total.toString();
                }
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
                        
                        if (settings?.showAccountDetails == true && settings?.bankName != null) ...[
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
                          ],
                          const Divider(),
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
                    onPressed: (invoiceState.isSaving || (settings?.paymentMethodsEnabled == true && invoiceState.paymentMethod == null)) ? null : () async {
                      final amountReceived = double.tryParse(_amountReceivedController.text) ?? 0.0;
                      
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

                      // Create invoice object for printing
                      final status = amountReceived >= invoiceState.total ? 'Paid' : (amountReceived <= 0 ? 'Unpaid' : 'Partial');
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
                      );

                      _printInvoice(context, invoice, settings!);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Processing... please wait.')));
                    },
                    child: invoiceState.isSaving 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('SAVE & PRINT'),
                  ),
                  ElevatedButton(
                    onPressed: (invoiceState.isSaving || (settings?.paymentMethodsEnabled == true && invoiceState.paymentMethod == null)) ? null : () async {
                      final amountReceived = double.tryParse(_amountReceivedController.text) ?? 0.0;

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
                      );

                      Navigator.push(context, MaterialPageRoute(builder: (_) => ReceiptPreviewPage(invoice: savedInvoice)));
                    },
                    child: invoiceState.isSaving ? const CircularProgressIndicator() : const Text('SAVE & PREVIEW'),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  void _printInvoice(BuildContext context, Invoice invoice, AppSettings settings) {
    final templateName = settings.defaultInvoiceTemplate ?? 'compact';
    final InvoiceTemplate template;
    if (templateName == 'detailed') template = DetailedInvoiceTemplate();
    else if (templateName == 'minimalist') template = MinimalistInvoiceTemplate();
    else if (templateName == 'professional') template = ProfessionalInvoiceTemplate();
    else if (templateName == 'modern') template = ModernProfessionalTemplate();
    else if (templateName == 'classic') template = ClassicBusinessTemplate();
    else template = CompactInvoiceTemplate();

    final commands = template.generateCommands(invoice, settings);
    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, 58));
  }

  Widget _buildPaymentMethodSelector(BuildContext context, InvoiceState state) {
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
            _amountReceivedController.text = state.total.toString();
          },
        ),
        RadioListTile<String>(
          title: const Text('POS'),
          value: 'POS',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = state.total.toString();
          },
        ),
        RadioListTile<String>(
          title: const Text('Transfer'),
          value: 'Transfer',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = state.total.toString();
          },
        ),
        RadioListTile<String>(
          title: const Text('Pay Later (deferred)/ part payment', style: TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold)),
          value: 'Deferred',
          groupValue: state.paymentMethod,
          dense: true,
          contentPadding: EdgeInsets.zero,
          onChanged: (val) {
            context.read<InvoiceBloc>().add(UpdatePaymentMethod(val));
            _amountReceivedController.text = '0';
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
}
