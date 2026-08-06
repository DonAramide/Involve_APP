import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/invoicing/presentation/widgets/staff_auth_dialog.dart';
import 'package:involve_app/features/school_finance/domain/repositories/finance_repository_new.dart';
import '../bloc/history_bloc.dart';
import '../bloc/history_state.dart';
import '../../../domain/entities/invoice.dart';
import '../../../../printer/presentation/bloc/printer_bloc.dart';
import '../../../../printer/domain/usecases/printer_usecases.dart';
import '../../../domain/templates/template_registry.dart';
import '../../../domain/templates/invoice_template.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/staff_state.dart';
import 'package:involve_app/features/settings/domain/entities/staff.dart';
import '../../pages/receipt_preview_page.dart';
import '../../pages/invoice_success_page.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/domain/services/report_generator.dart' as reports hide DateTimeRange;
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';
import 'report_preview_page.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:fl_chart/fl_chart.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

// Stock Return Features
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/stock_return.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/bloc/school_state.dart';

import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:involve_app/core/utils/terminology.dart';

class InvoiceHistoryPage extends StatefulWidget {
  const InvoiceHistoryPage({super.key});

  @override
  State<InvoiceHistoryPage> createState() => _InvoiceHistoryPageState();
}

class _InvoiceHistoryPageState extends State<InvoiceHistoryPage> {
  DateTimeRange? _selectedRange;
  bool _isTableView = false;
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
    _amountController.addListener(() => setState(() {}));
    context.read<HistoryBloc>().add(LoadHistory());
  }

  @override
  void dispose() {
    _searchController.dispose();
    _amountController.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice History'),
        actions: [
          IconButton(
            icon: Icon(_isTableView ? Icons.list : Icons.table_chart),
            tooltip: _isTableView ? 'Switch to List View' : 'Switch to Table View',
            onPressed: () => setState(() => _isTableView = !_isTableView),
          ),
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Export Report',
            onPressed: () => _exportReport(context),
          ),
          IconButton(
            icon: const Icon(Icons.cloud_download),
            tooltip: 'Export All Data',
            onPressed: () => _handleBackup(context),
          ),
          IconButton(
            icon: const Icon(Icons.cloud_upload),
            tooltip: 'Import All Data',
            onPressed: () => _handleRestore(context),
          ),
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDateRange(context),
          ),
          if (_selectedRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                setState(() => _selectedRange = null);
                context.read<HistoryBloc>().add(LoadHistory());
              },
            ),
        ],
      ),
      body: _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    return BlocListener<SettingsBloc, SettingsState>(
      listener: (context, state) {
        if (state.isExporting) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => const PopScope(
              canPop: false,
              child: InvifyLoadingIndicator(message: 'PREPARING DATA EXPORT...'),
            ),
          );
        } else if (state.successMessage != null && state.successMessage!.contains('Backup')) {
          if (Navigator.canPop(context)) Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green),
          );
        } else if (state.error != null && state.error!.contains('Backup')) {
          if (Navigator.canPop(context)) Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
          );
        }
      },
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isSmallScreen = constraints.maxWidth < 600;
          return BlocBuilder<HistoryBloc, HistoryState>(
            builder: (context, state) {
              if (state is HistoryLoading) {
                return const InvifyLoadingIndicator(message: 'LOADING INVOICE HISTORY...');
              } else if (state is HistoryError) {
                return Center(child: Text(state.message));
              }

              final settings = context.read<SettingsBloc>().state.settings;
              final List<Invoice> invoices = state is HistoryLoaded ? state.invoices : [];
              final bool showSummary = settings?.showTotalSalesCard == true && 
                                      state is HistoryLoaded && invoices.isNotEmpty;

              return CustomScrollView(
                slivers: [
                  // Filter Header (Sticky-ish or just scrolls)
                  SliverToBoxAdapter(
                    child: _buildFilterHeader(context, constraints),
                  ),
                  
                  if (showSummary) ...[
                    // Total Summary Card
                    SliverToBoxAdapter(
                      child: _buildTotalSummary(context, state as HistoryLoaded),
                    ),
                    // Revenue Trend Chart
                    if (settings?.showSalesTrendChart == true)
                      SliverToBoxAdapter(
                        child: _buildSalesChart(context, state),
                      ),
                  ],

                  // Invoice Content
                  if (invoices.isEmpty)
                    const SliverFillRemaining(
                      child: Center(child: Text('No invoices found.')),
                    )
                  else if (_isTableView)
                    SliverToBoxAdapter(
                      child: _buildReportsTable(context, state as HistoryLoaded),
                    )
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          return _buildInvoiceCard(context, invoices[index]);
                        },
                        childCount: invoices.length,
                      ),
                    ),
                  
                  // Bottom Padding
                  const SliverToBoxAdapter(child: SizedBox(height: 32)),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildFilterHeader(BuildContext context, BoxConstraints constraints) {
    final state = context.watch<HistoryBloc>().state;
    String currentQuery = '';
    double? currentAmount;
    
    if (state is HistoryLoaded) {
      currentQuery = state.query ?? '';
      currentAmount = state.amount;
    }

    final bool isSmallScreen = constraints.maxWidth < 800;
    final bool isSchoolMode = context.read<SettingsBloc>().state.settings?.businessMode == 'school';

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: isSmallScreen
          ? Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2, // 2 columns with spacing
                  child: _buildSearchField(context, state, currentAmount),
                ),
                if (isSchoolMode)
                  SizedBox(
                    width: (constraints.maxWidth - 44) / 2,
                    child: _buildClassFilter(context, state),
                  ),
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2,
                  child: _buildStaffFilter(context, state),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2,
                  child: _buildAmountField(context, state, currentQuery),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2,
                  child: _buildPaymentMethodFilter(context, state),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2,
                  child: _buildPaymentStatusFilter(context, state),
                ),
                SizedBox(
                  width: (constraints.maxWidth - 44) / 2,
                  child: ElevatedButton.icon(
                    onPressed: () => _showPendingTransfersPopup(context),
                    icon: const Icon(Icons.hourglass_empty_rounded, size: 14),
                    label: const Text('Pending Transfers', style: TextStyle(fontSize: 11)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.lightBlue.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                ),
              ],
            )
          : Row(
              children: [
                Expanded(
                  flex: 2,
                  child: _buildSearchField(context, state, currentAmount),
                ),
                if (isSchoolMode) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: _buildClassFilter(context, state),
                  ),
                ],
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: _buildStaffFilter(context, state),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: _buildAmountField(context, state, currentQuery),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: _buildPaymentMethodFilter(context, state),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 1,
                  child: _buildPaymentStatusFilter(context, state),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 150,
                  child: ElevatedButton.icon(
                    onPressed: () => _showPendingTransfersPopup(context),
                    icon: const Icon(Icons.hourglass_empty_rounded, size: 14),
                    label: const Text('Pending', style: TextStyle(fontSize: 11)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.lightBlue.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSearchField(BuildContext context, HistoryState state, double? currentAmount) {
    final settings = context.read<SettingsBloc>().state.settings;
    final mode = settings?.businessMode ?? 'retail';
    
    String hint = 'Search Invoice ID';
    if (mode == 'school') {
      hint = 'Search Invoice ID, Student or Class';
    } else if (mode == 'services') {
      hint = 'Search Invoice ID or Client';
    } else {
      hint = 'Search Invoice ID or Customer';
    }

    return TextField(
      controller: _searchController,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: const Icon(Icons.search),
        border: const OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
        suffixIcon: _searchController.text.isNotEmpty 
          ? IconButton(
              icon: const Icon(Icons.clear, size: 18),
              onPressed: () {
                _searchController.clear();
                _triggerSearch(context, state, currentAmount, '');
              },
            )
          : null,
      ),
      onChanged: (value) {
        if (_searchDebounce?.isActive ?? false) _searchDebounce?.cancel();
        _searchDebounce = Timer(const Duration(milliseconds: 500), () {
          _triggerSearch(context, state, currentAmount, value);
        });
      },
    );
  }

  void _triggerSearch(BuildContext context, HistoryState state, double? currentAmount, String value) {
    context.read<HistoryBloc>().add(LoadHistory(
      start: _selectedRange?.start,
      end: _selectedRange?.end,
      query: value,
      amount: currentAmount,
      paymentMethod: state is HistoryLoaded ? state.paymentMethod : null,
      paymentStatus: state is HistoryLoaded ? state.paymentStatus : null,
      staffId: state is HistoryLoaded ? state.staffId : null,
      classId: state is HistoryLoaded ? state.classId : null,
    ));
  }

  Widget _buildAmountField(BuildContext context, HistoryState state, String currentQuery) {
    return TextField(
      controller: _amountController,
      keyboardType: TextInputType.number,
      decoration: InputDecoration(
        hintText: 'Amount',
        prefixIcon: const Padding(
          padding: EdgeInsets.all(12),
          child: Text('₦', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        border: const OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
        suffixIcon: _amountController.text.isNotEmpty 
          ? IconButton(
              icon: const Icon(Icons.clear, size: 18),
              onPressed: () {
                _amountController.clear();
                _triggerAmountFilter(context, state, currentQuery, null);
              },
            )
          : null,
      ),
      onChanged: (value) {
        if (_searchDebounce?.isActive ?? false) _searchDebounce?.cancel();
        _searchDebounce = Timer(const Duration(milliseconds: 500), () {
          final amount = double.tryParse(value);
          _triggerAmountFilter(context, state, currentQuery, amount);
        });
      },
    );
  }

  void _triggerAmountFilter(BuildContext context, HistoryState state, String currentQuery, double? amount) {
    context.read<HistoryBloc>().add(LoadHistory(
      start: _selectedRange?.start,
      end: _selectedRange?.end,
      query: currentQuery,
      amount: amount,
      paymentMethod: state is HistoryLoaded ? state.paymentMethod : null,
      paymentStatus: state is HistoryLoaded ? state.paymentStatus : null,
      staffId: state is HistoryLoaded ? state.staffId : null,
      classId: state is HistoryLoaded ? state.classId : null,
    ));
  }

  Widget _buildInvoiceCard(BuildContext context, Invoice invoice) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ExpansionTile(
        title: Row(
          children: [
            Text('${invoice.invoiceNumber}'),
            if (invoice.customerName != null) ...[
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  invoice.customerName!,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Date: ${invoice.dateCreated.toString().split('.')[0]} • ${invoice.paymentMethod ?? "N/A"}'),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Text('Paid: ${CurrencyFormatter.formatWithSymbol(invoice.amountPaid, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')} • Total: ${CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}'),
                  if (context.read<SettingsBloc>().state.settings?.customReceiptPricingEnabled == true && invoice.totalPrintAmount != null)
                    Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: Text(
                        'Printed Total: ${CurrencyFormatter.formatWithSymbol(invoice.totalPrintAmount!, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}',
                        style: TextStyle(color: Colors.blue[700], fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  const SizedBox(width: 8),
                  _buildStatusBadge(invoice.paymentStatus),
                ],
              ),
            ),
          ],
        ),
        children: [
          ...invoice.items.map((item) {
            final bool isFullyReturned = item.returnedQuantity >= item.quantity;
            final bool isPartiallyReturned = item.returnedQuantity > 0 && item.returnedQuantity < item.quantity;
            
            return ListTile(
                dense: true,
                title: Text(
                  item.item.name,
                  style: TextStyle(
                    decoration: isFullyReturned ? TextDecoration.lineThrough : null,
                    color: isFullyReturned ? Colors.grey : null,
                  ),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (item.printPrice != null) 
                      Text('Receipt Price: ${CurrencyFormatter.formatWithSymbol(item.printPrice!, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}', 
                        style: TextStyle(fontSize: 11, color: Colors.blue[700])),
                    if (isFullyReturned)
                      const Text('FULLY RETURNED', style: TextStyle(fontSize: 10, color: Colors.red, fontWeight: FontWeight.bold))
                    else if (isPartiallyReturned)
                      Text('${item.returnedQuantity} Returned', style: const TextStyle(fontSize: 10, color: Colors.orange, fontWeight: FontWeight.bold)),
                    if (item.isReplacement)
                      const Text('(REPLACEMENT)', style: TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
                  ],
                ),
                trailing: Text(
                  '${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}',
                  style: TextStyle(
                    decoration: isFullyReturned ? TextDecoration.lineThrough : null,
                    color: isFullyReturned ? Colors.grey : null,
                  ),
                ),
              );
          }),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: Column(
              children: [
                _buildHistorySummaryRow('Subtotal', invoice.subtotal, context),
                if (invoice.taxAmount > 0)
                  _buildHistorySummaryRow('Tax', invoice.taxAmount, context),
                if (invoice.discountAmount > 0)
                  _buildHistorySummaryRow('Discount', -invoice.discountAmount, context),
                _buildHistorySummaryRow('Total', invoice.totalAmount, context, isTotal: true),
                const SizedBox(height: 4),
                _buildHistorySummaryRow('Paid', invoice.amountPaid, context),
                if (invoice.changeGiven > 0)
                  _buildHistorySummaryRow('Change Given', invoice.changeGiven, context, color: Colors.green),
                if (invoice.balanceAmount > 0)
                  _buildHistorySummaryRow('Balance', invoice.balanceAmount, context, color: Colors.red, isBold: true),
                if (invoice.staffName != null && invoice.staffName!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  _buildHistoryTextRow('Billed By', invoice.staffName!, context),
                ],
              ],
            ),
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Wrap(
              alignment: WrapAlignment.end,
              spacing: 8.0,
              runSpacing: 4.0,
              children: [
                if (invoice.balanceAmount > 0)
                  ElevatedButton.icon(
                    onPressed: () => _showBalancePaymentDialog(context, invoice),
                    icon: const Icon(Icons.account_balance_wallet_outlined),
                    label: const Text('BALANCE PAYMENT'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
                  ),
                ElevatedButton.icon(
                  onPressed: () => _reprint(context, invoice),
                  icon: const Icon(Icons.print),
                  label: const Text('REPRINT'),
                ),
                if (context.read<SettingsBloc>().state.settings?.stockReturnEnabled == true && invoice.businessMode != 'school')
                  ElevatedButton.icon(
                    onPressed: () => _showReturnDialog(context, invoice),
                    icon: const Icon(Icons.assignment_return_outlined),
                    label: const Text('RETURN STOCK'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.red[700], foregroundColor: Colors.white),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistorySummaryRow(String label, double amount, BuildContext context, {bool isTotal = false, bool isBold = false, Color? color}) {
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label, 
            style: TextStyle(
              fontWeight: (isTotal || isBold) ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 14 : 12,
            )
          ),
          Text(
            CurrencyFormatter.formatWithSymbol(amount, symbol: currency),
            style: TextStyle(
              fontWeight: (isTotal || isBold) ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 14 : 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTextRow(String label, String value, BuildContext context, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label, 
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
            )
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportsTable(BuildContext context, HistoryLoaded state) {
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 24,
            horizontalMargin: 8,
            columns: [
              DataColumn(label: Text('Invoice ID', style: TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text('Customer', style: TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text('Method', style: TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text('Amount', style: TextStyle(fontWeight: FontWeight.bold))),
              DataColumn(label: Text('Change', style: TextStyle(fontWeight: FontWeight.bold))),
              if (context.read<SettingsBloc>().state.settings?.customReceiptPricingEnabled == true)
                DataColumn(label: Text('Printed', style: TextStyle(fontWeight: FontWeight.bold))),
            ],
            rows: state.invoices.map((invoice) {
              return DataRow(
                cells: [
                  DataCell(Text(invoice.invoiceNumber, style: const TextStyle(fontSize: 12))),
                  DataCell(Text(invoice.dateCreated.toString().split(' ')[0], style: const TextStyle(fontSize: 12))),
                  DataCell(Text(invoice.customerName ?? '-', style: const TextStyle(fontSize: 12))),
                  DataCell(
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(invoice.paymentMethod ?? '-', style: const TextStyle(fontSize: 12)),
                          const SizedBox(width: 4),
                          _buildStatusBadge(invoice.paymentStatus, isMini: true),
                        ],
                      ),
                    ),
                  ),
                  DataCell(Text(CurrencyFormatter.formatWithSymbol(invoice.amountPaid, symbol: currency), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold))),
                  DataCell(Text(CurrencyFormatter.formatWithSymbol(invoice.changeGiven, symbol: currency), style: TextStyle(fontSize: 12, color: invoice.changeGiven > 0 ? Colors.green : null))),
                  if (context.read<SettingsBloc>().state.settings?.customReceiptPricingEnabled == true)
                    DataCell(Text(
                      invoice.totalPrintAmount != null 
                        ? CurrencyFormatter.formatWithSymbol(invoice.totalPrintAmount!, symbol: currency)
                        : '-',
                      style: TextStyle(fontSize: 12, color: Colors.blue[700]),
                    )),
                ],
                onSelectChanged: (selected) {
                  if (selected == true) {
                    _reprint(context, invoice);
                  }
                },
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _selectedRange,
    );
    
    if (range != null && context.mounted) {
      // Pick start time
      final startTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(range.start),
        helpText: 'SELECT START TIME',
      );
      
      if (startTime == null || !context.mounted) return;
      
      // Pick end time
      final endTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(range.end.add(const Duration(hours: 23, minutes: 59))),
        helpText: 'SELECT END TIME',
      );
      
      if (endTime == null || !context.mounted) return;
      
      final startDateTime = DateTime(
        range.start.year,
        range.start.month,
        range.start.day,
        startTime.hour,
        startTime.minute,
      );
      
      final endDateTime = DateTime(
        range.end.year,
        range.end.month,
        range.end.day,
        endTime.hour,
        endTime.minute,
      );

      setState(() => _selectedRange = DateTimeRange(start: startDateTime, end: endDateTime));
      context.read<HistoryBloc>().add(LoadHistory(start: startDateTime, end: endDateTime));
    }
  }

  void _reprint(BuildContext context, Invoice invoice) {
    // Get settings from SettingsBloc
    final settingsState = context.read<SettingsBloc>().state;
    final settings = settingsState.settings;
    
    if (settings != null) {
      if (settings.customReceiptPricingEnabled == true && invoice.totalPrintAmount != null) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Reprint Pricing'),
            content: const Text('Which pricing would you like to use for this receipt?'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _navigateToPreview(context, invoice, useCustom: false);
                },
                child: const Text('ACTUAL PRICE'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _navigateToPreview(context, invoice, useCustom: true);
                },
                child: const Text('CUSTOM RECEIPT PRICE'),
              ),
            ],
          ),
        );
        return;
      }
      _navigateToPreview(context, invoice);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings not loaded. Cannot print.')),
      );
    }
  }

  void _navigateToPreview(BuildContext context, Invoice invoice, {bool? useCustom}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReceiptPreviewPage(invoice: invoice, useCustomPrices: useCustom),
      ),
    );
  }

  void _exportReport(BuildContext context) async {
    final historyState = context.read<HistoryBloc>().state;
    final settingsState = context.read<SettingsBloc>().state;
    
    if (historyState is HistoryLoaded && settingsState.settings != null) {
      if (historyState.invoices.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No sales records to export.')),
        );
        return;
      }

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Export Report'),
          content: const Text('Choose the type of report you want to generate:'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _exportSalesCSV(context);
              },
              child: const Text('CSV (SALES)'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                _generateReport(context, reports.ReportType.standard);
              },
              child: const Text('PDF (SALES)'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _generateReport(context, reports.ReportType.activity);
              },
              child: const Text('PDF (ACTIVITY)'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please wait for data to load before exporting.')),
      );
    }
  }

  void _exportSalesCSV(BuildContext context) async {
    final historyState = context.read<HistoryBloc>().state;
    final settingsState = context.read<SettingsBloc>().state;
    
    if (historyState is HistoryLoaded && settingsState.settings != null) {
      try {
        final repo = context.read<HistoryBloc>().getHistory.repository;
        final start = _selectedRange?.start ?? DateTime(2020);
        final end = _selectedRange?.end ?? DateTime.now();
        final stockReturns = await repo.getStockReturnsByDateRange(start, end);

        if (!context.mounted) return;

        await reports.ReportGenerator.exportSalesCSV(
          invoices: historyState.invoices,
          settings: settingsState.settings!,
          dateRange: _selectedRange != null 
            ? InvReportDateRange(start: _selectedRange!.start, end: _selectedRange!.end)
            : null,
          stockReturns: stockReturns,
        );
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Export failed: ${e.toString()}')),
          );
        }
      }
    }
  }

  void _generateReport(BuildContext context, reports.ReportType type) async {
    final historyState = context.read<HistoryBloc>().state;
    final settingsState = context.read<SettingsBloc>().state;
    final staffState = context.read<StaffBloc>().state;
    
    if (historyState is HistoryLoaded && settingsState.settings != null) {
      try {
        final repo = context.read<HistoryBloc>().getHistory.repository;
        final start = _selectedRange?.start ?? DateTime(2020);
        final end = _selectedRange?.end ?? DateTime.now();
        final stockReturns = await repo.getStockReturnsByDateRange(start, end);

        if (!context.mounted) return;

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ReportPreviewPage(
              invoices: historyState.invoices,
              settings: settingsState.settings!,
              dateRange: _selectedRange != null 
                ? InvReportDateRange(start: _selectedRange!.start, end: _selectedRange!.end)
                : null,
              stockReturns: stockReturns,
              staffList: staffState.staffList,
              reportType: type,
            ),
          ),
        );
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Export failed: ${e.toString()}')),
          );
        }
      }
    }
  }

  Widget _buildPaymentMethodFilter(BuildContext context, HistoryState state) {
    String? currentMethod;
    if (state is HistoryLoaded) {
      currentMethod = state.paymentMethod;
    }

    return DropdownButtonFormField<String>(
      value: currentMethod ?? 'All',
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 10),
      ),
      items: ['All', 'Cash', 'POS', 'Transfer'].map((method) {
        return DropdownMenuItem(value: method, child: Text(method, style: const TextStyle(fontSize: 12)));
      }).toList(),
      onChanged: (value) {
        if (state is HistoryLoaded) {
          context.read<HistoryBloc>().add(LoadHistory(
                start: _selectedRange?.start,
                end: _selectedRange?.end,
                query: state.query,
                amount: state.amount,
                paymentMethod: value,
                paymentStatus: state.paymentStatus,
                staffId: state.staffId,
                classId: state.classId,
              ));
        }
      },
    );
  }

  Widget _buildPaymentStatusFilter(BuildContext context, HistoryState state) {
    String? currentStatus;
    if (state is HistoryLoaded) {
      currentStatus = state.paymentStatus;
    }

    return DropdownButtonFormField<String>(
      value: currentStatus ?? 'All',
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 10),
      ),
      items: ['All', 'Full Payment', 'Partial Payment', 'Unpaid', 'Outstanding'].map((status) {
        return DropdownMenuItem(value: status, child: Text(status, style: const TextStyle(fontSize: 12)));
      }).toList(),
      onChanged: (value) {
        if (state is HistoryLoaded) {
          context.read<HistoryBloc>().add(LoadHistory(
                start: _selectedRange?.start,
                end: _selectedRange?.end,
                query: state.query,
                amount: state.amount,
                paymentMethod: state.paymentMethod,
                paymentStatus: value,
                staffId: state.staffId,
                classId: state.classId,
              ));
        }
      },
    );
  }

  Widget _buildStaffFilter(BuildContext context, HistoryState state) {
    return BlocBuilder<StaffBloc, StaffState>(
      builder: (context, staffState) {
        int? currentStaffId;
        if (state is HistoryLoaded) {
          currentStaffId = state.staffId;
        }

        return DropdownButtonFormField<int?>(
          value: currentStaffId,
          isExpanded: true,
          decoration: const InputDecoration(
            hintText: 'All Staff',
            border: OutlineInputBorder(),
            filled: true,
            fillColor: Colors.white,
            contentPadding: EdgeInsets.symmetric(horizontal: 10),
          ),
          items: [
            const DropdownMenuItem<int?>(value: null, child: Text('All Staff', style: TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
            ...staffState.staffList.map((s) => DropdownMenuItem<int?>(
              value: s.id,
              child: Text(s.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
            )),
          ],
          onChanged: (value) {
            if (state is HistoryLoaded) {
              context.read<HistoryBloc>().add(LoadHistory(
                    start: _selectedRange?.start,
                    end: _selectedRange?.end,
                    query: state.query,
                    amount: state.amount,
                    paymentMethod: state.paymentMethod,
                    paymentStatus: state.paymentStatus,
                    staffId: value,
                    classId: state.classId,
                  ));
            }
          },
        );
      },
    );
  }

  Widget _buildClassFilter(BuildContext context, HistoryState state) {
    return BlocBuilder<SchoolBloc, SchoolState>(
      builder: (context, schoolState) {
        int? currentClassId;
        if (state is HistoryLoaded) {
          currentClassId = state.classId;
        }

        return DropdownButtonFormField<int?>(
          value: currentClassId,
          isExpanded: true,
          decoration: const InputDecoration(
            hintText: 'All Classes',
            border: OutlineInputBorder(),
            filled: true,
            fillColor: Colors.white,
            contentPadding: EdgeInsets.symmetric(horizontal: 10),
          ),
          items: [
            const DropdownMenuItem<int?>(value: null, child: Text('All Classes', style: TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
            ...schoolState.classes.map((c) => DropdownMenuItem<int?>(
              value: c.id,
              child: Text(c.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
            )),
          ],
          onChanged: (value) {
            if (state is HistoryLoaded) {
              context.read<HistoryBloc>().add(LoadHistory(
                    start: _selectedRange?.start,
                    end: _selectedRange?.end,
                    query: state.query,
                    amount: state.amount,
                    paymentMethod: state.paymentMethod,
                    paymentStatus: state.paymentStatus,
                    staffId: state.staffId,
                    classId: value,
                  ));
            }
          },
        );
      },
    );
  }

  Widget _buildTotalSummary(BuildContext context, HistoryLoaded state) {
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              const Text(
                'SALES SUMMARY FOR PERIOD',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.blueGrey,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Column(
                    children: [
                      const Text('TOTAL INVOICED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      Text(
                        CurrencyFormatter.formatWithSymbol(state.totalInvoiced, symbol: currency),
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary),
                      ),
                    ],
                  ),
                  Container(height: 30, width: 1, color: Colors.grey[300]),
                  Column(
                    children: [
                      const Text('TOTAL COLLECTED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      Text(
                        CurrencyFormatter.formatWithSymbol(state.totalSales, symbol: currency),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Builder(
                builder: (context) {
                  double totalCard = 0;
                  double totalTransfer = 0;
                  double totalCash = 0;
                  
                  for (final inv in state.invoices) {
                    final method = (inv.paymentMethod ?? '').toLowerCase();
                    if (method == 'pos' || method == 'card') {
                      totalCard += inv.amountPaid;
                    } else if (method == 'transfer') {
                      totalTransfer += inv.amountPaid;
                    } else if (method == 'cash') {
                      totalCash += inv.amountPaid;
                    }
                  }

                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Column(
                        children: [
                          const Text('CARD (POS)', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                          Text(
                            CurrencyFormatter.formatWithSymbol(totalCard, symbol: currency),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.orange),
                          ),
                        ],
                      ),
                      Container(height: 20, width: 1, color: Colors.grey[300]),
                      Column(
                        children: [
                          const Text('TRANSFER', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                          Text(
                            CurrencyFormatter.formatWithSymbol(totalTransfer, symbol: currency),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.purple),
                          ),
                        ],
                      ),
                      Container(height: 20, width: 1, color: Colors.grey[300]),
                      Column(
                        children: [
                          const Text('CASH', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                          Text(
                            CurrencyFormatter.formatWithSymbol(totalCash, symbol: currency),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.teal),
                          ),
                        ],
                      ),
                    ],
                  );
                }
              ),
              const SizedBox(height: 16),
              Text(
                '${state.invoices.length} Invoices',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSalesChart(BuildContext context, HistoryLoaded state) {
    if (state.invoices.isEmpty) return const SizedBox.shrink();

    // Group sales by day
    final dailySales = groupBy(state.invoices, (Invoice inv) {
      return DateTime(inv.dateCreated.year, inv.dateCreated.month, inv.dateCreated.day);
    }).map((date, invs) => MapEntry(date, invs.fold(0.0, (sum, inv) => sum + inv.totalAmount)));

    final sortedDates = dailySales.keys.toList()..sort();
    final spots = sortedDates.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), dailySales[e.value]!);
    }).toList();

    // If only one day, add a dummy point at index -1 or 1 to make it a line
    if (spots.length == 1) {
      spots.insert(0, FlSpot(-0.5, spots[0].y));
      spots.add(FlSpot(0.5, spots[0].y));
    }

    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Column(
        children: [
          const Text('REVENUE TREND', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blueGrey)),
          const SizedBox(height: 16),
          Expanded(
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        final idx = value.round();
                        if (idx < 0 || idx >= sortedDates.length) return const SizedBox.shrink();
                        final date = sortedDates[idx];
                        return Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Text('${date.day}/${date.month}', style: const TextStyle(fontSize: 10)),
                        );
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: Theme.of(context).colorScheme.primary,
                    barWidth: 4,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(
                      show: true,
                      color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildStatusBadge(String status, {bool isMini = false}) {
    final Color color;
    switch (status) {
      case 'Paid': color = Colors.green; break;
      case 'Partial': color = Colors.orange; break;
      case 'Unpaid': color = Colors.red; break;
      default: color = Colors.grey;
    }
    
    return Container(
      padding: EdgeInsets.symmetric(horizontal: isMini ? 4 : 6, vertical: isMini ? 1 : 2),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
      child: Text(
        isMini ? (status == 'Paid' ? '✓' : '!') : status.toUpperCase(), 
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)
      ),
    );
  }

  void _showBalancePaymentDialog(BuildContext context, Invoice invoice) {
    final controller = TextEditingController(text: invoice.balanceAmount.toString());
    String selectedMethod = 'Cash';
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Balance Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total: ${CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: currency)}'),
            Text('Paid: ${CurrencyFormatter.formatWithSymbol(invoice.amountPaid, symbol: currency)}'),
            Text('Balance: ${CurrencyFormatter.formatWithSymbol(invoice.balanceAmount, symbol: currency)}', 
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
            const Divider(height: 24),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount to Pay', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: selectedMethod,
              items: ['Cash', 'POS', 'Transfer'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (val) => selectedMethod = val!,
              decoration: const InputDecoration(labelText: 'Method', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              final amount = double.tryParse(controller.text) ?? 0.0;
              if (amount <= 0) return;
              
              context.read<HistoryBloc>().add(RecordPayment(
                invoiceId: invoice.id!,
                additionalAmount: amount,
                method: selectedMethod,
              ));
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Payment of $currency$amount recorded via $selectedMethod'), backgroundColor: Colors.green),
              );
            },
            child: const Text('CONFIRM PAYMENT'),
          ),
        ],
      ),
    );
  }

  void _showReturnDialog(BuildContext context, Invoice invoice) {
    if (invoice.staffId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This invoice has no associated staff. Return not possible.')),
      );
      return;
    }

    final codeController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Staff Authentication'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Processing return for Invoice #${invoice.invoiceNumber}'),
            const SizedBox(height: 16),
            Text('Authorized Staff: ${invoice.staffName ?? "Unknown"}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: codeController,
              decoration: const InputDecoration(labelText: 'Enter Staff PIN', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              // Verify staff
              final staffList = context.read<StaffBloc>().state.staffList;
              final staff = staffList.where((s) => s.id == invoice.staffId).firstOrNull;
              
              if (staff == null) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Staff record not found.')));
                return;
              }
              
              if (staff.staffCode != codeController.text) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid Staff PIN.')));
                return;
              }
              
              Navigator.pop(ctx);
              _showItemSelectionDialog(context, invoice);
            },
            child: const Text('AUTHORIZE'),
          ),
        ],
      ),
    );
  }

  void _showItemSelectionDialog(BuildContext context, Invoice invoice) async {
    final historyBloc = context.read<HistoryBloc>();
    final repo = context.read<HistoryBloc>().getHistory.repository;
    
    // Fetch already returned items
    final existingReturns = await repo.getStockReturnsByInvoiceId(invoice.id!);
    
    // Calculate remainders
    final Map<int, int> returnedCounts = {};
    for (final ret in existingReturns) {
      returnedCounts[ret.itemId] = (returnedCounts[ret.itemId] ?? 0) + ret.quantity;
    }

    // State for the dialog
    int step = 1; // 1: Return/Replace Select, 2: Pick Replacements (if needed), 3: Summary
    final Map<int, int> returnQuantities = {};
    final Map<int, int> replaceQuantities = {};
    final List<InvoiceItem> replacements = [];
    
    for (final item in invoice.items) {
      if (item.type == 'product') {
        returnQuantities[item.item.id!] = 0;
        replaceQuantities[item.item.id!] = 0;
      }
    }

    if (!context.mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        String searchQuery = "";
        return StatefulBuilder(
          builder: (context, setDialogState) {
          final productItems = invoice.items.where((i) => i.type == 'product').toList();
          final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';
          
          if (productItems.isEmpty) {
            return AlertDialog(
              title: const Text('Return & Replace'),
              content: const Text('No returnable products found in this invoice.'),
              actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CLOSE'))],
            );
          }

          if (step == 1) {
            return AlertDialog(
              title: const Text('Step 1: Select Actions'),
              content: SizedBox(
                width: double.maxFinite,
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: productItems.length,
                  itemBuilder: (context, index) {
                    final item = productItems[index];
                    final itemId = item.item.id!;
                    final alreadyReturned = returnedCounts[itemId] ?? 0;
                    final available = item.quantity - alreadyReturned;
                    
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: item.item.image != null 
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: Image.memory(item.item.image!, fit: BoxFit.cover),
                                )
                              : const Icon(Icons.image, color: Colors.grey),
                          ),
                          title: Text(item.item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Original: ${item.quantity} | Available: $available'),
                        ),
                        if (available > 0)
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  child: Column(
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Return for Refund:'),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const Icon(Icons.remove),
                                                onPressed: returnQuantities[itemId]! > 0 
                                                  ? () => setDialogState(() => returnQuantities[itemId] = returnQuantities[itemId]! - 1)
                                                  : null,
                                              ),
                                              SizedBox(width: 30, child: Center(child: Text('${returnQuantities[itemId]}'))),
                                              IconButton(
                                                icon: const Icon(Icons.add),
                                                onPressed: (returnQuantities[itemId]! + replaceQuantities[itemId]!) < available 
                                                  ? () => setDialogState(() => returnQuantities[itemId] = returnQuantities[itemId]! + 1)
                                                  : null,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Exchange with Another Product:'),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const Icon(Icons.remove),
                                                onPressed: replaceQuantities[itemId]! > 0 
                                                  ? () => setDialogState(() => replaceQuantities[itemId] = replaceQuantities[itemId]! - 1)
                                                  : null,
                                              ),
                                              SizedBox(width: 30, child: Center(child: Text('${replaceQuantities[itemId]}'))),
                                              IconButton(
                                                icon: const Icon(Icons.add),
                                                onPressed: (returnQuantities[itemId]! + replaceQuantities[itemId]!) < available 
                                                  ? () => setDialogState(() => replaceQuantities[itemId] = replaceQuantities[itemId]! + 1)
                                                  : null,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                        const Divider(),
                      ],
                    );
                  },
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
                ElevatedButton(
                  onPressed: (returnQuantities.values.any((q) => q > 0) || replaceQuantities.values.any((q) => q > 0)) 
                    ? () {
                    final hasReplaces = replaceQuantities.values.any((q) => q > 0);
                    if (hasReplaces) {
                      setDialogState(() => step = 2);
                    } else {
                      setDialogState(() => step = 3);
                    }
                  } : null,
                  child: const Text('NEXT'),
                ),
              ],
            );
          }

          if (step == 2) {
            // STEP 2: PICK REPLACEMENTS
            return AlertDialog(
              title: const Text('Step 2: Pick Replacements'),
              content: SizedBox(
                width: double.maxFinite,
                child: BlocBuilder<StockBloc, StockState>(
                  builder: (context, stockState) {
                    final filteredItems = stockState.items.where((item) => 
                      item.name.toLowerCase().contains(searchQuery.toLowerCase())
                    ).toList();
                    
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          onChanged: (value) => setDialogState(() => searchQuery = value),
                          decoration: const InputDecoration(
                            labelText: 'Search items...',
                            prefixIcon: Icon(Icons.search),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text('Choose items to add as replacements.'),
                        const SizedBox(height: 10),
                        Expanded(
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: filteredItems.length,
                            itemBuilder: (context, idx) {
                              final item = filteredItems[idx];
                              final selectedQty = replacements.where((r) => r.item.id == item.id).fold(0, (sum, r) => sum + r.quantity);
                              
                              return ListTile(
                                leading: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Colors.grey[200],
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: item.image != null 
                                    ? ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: Image.memory(item.image!, fit: BoxFit.cover),
                                      )
                                    : const Icon(Icons.image, color: Colors.grey),
                                ),
                                title: Text(item.name),
                                subtitle: Text(CurrencyFormatter.formatWithSymbol(item.price, symbol: currency)),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline),
                                      onPressed: selectedQty > 0 ? () {
                                        setDialogState(() {
                                          final existingIdx = replacements.indexWhere((r) => r.item.id == item.id);
                                          if (existingIdx != -1) {
                                            if (replacements[existingIdx].quantity > 1) {
                                              replacements[existingIdx] = replacements[existingIdx].copyWith(quantity: replacements[existingIdx].quantity - 1);
                                            } else {
                                              replacements.removeAt(existingIdx);
                                            }
                                          }
                                        });
                                      } : null,
                                    ),
                                    Text('$selectedQty'),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline),
                                      onPressed: () {
                                        setDialogState(() {
                                          final existingIdx = replacements.indexWhere((r) => r.item.id == item.id);
                                          if (existingIdx != -1) {
                                            replacements[existingIdx] = replacements[existingIdx].copyWith(quantity: replacements[existingIdx].quantity + 1);
                                          } else {
                                            replacements.add(InvoiceItem(item: item, quantity: 1, unitPrice: item.price));
                                          }
                                        });
                                      },
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              actions: [
                TextButton(onPressed: () => setDialogState(() => step = 1), child: const Text('BACK')),
                ElevatedButton(
                  onPressed: () => setDialogState(() => step = 3),
                  child: const Text('REVIEW SUMMARY'),
                ),
              ],
            );
          }

          // STEP 3: SUMMARY & CONFIRM
          double returnTotalValue = 0;
          final List<ReturnItem> itemsToProcess = [];
          
          for (final item in productItems) {
            final retQty = returnQuantities[item.item.id!] ?? 0;
            final repQty = replaceQuantities[item.item.id!] ?? 0;
            final totalProcessQty = retQty + repQty;
            
            if (totalProcessQty > 0) {
              returnTotalValue += totalProcessQty * item.unitPrice;
              itemsToProcess.add(ReturnItem(
                itemId: item.item.id!,
                quantity: totalProcessQty,
                amount: totalProcessQty * item.unitPrice,
              ));
            }
          }
          
          final replacementTotalValue = replacements.fold<double>(0, (sum, r) => sum + r.total);
          final netChange = replacementTotalValue - returnTotalValue;
          final newInvoiceTotal = (invoice.totalAmount + netChange).clamp(0.0, double.infinity);
          final newBalance = (invoice.balanceAmount + netChange).clamp(0.0, double.infinity);

          return AlertDialog(
            title: const Text('Step 3: Confirm Exchange'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Items Returned/Replaced: ${CurrencyFormatter.formatWithSymbol(returnTotalValue, symbol: currency)}', style: const TextStyle(color: Colors.red)),
                Text('Replacement Items: ${CurrencyFormatter.formatWithSymbol(replacementTotalValue, symbol: currency)}', style: const TextStyle(color: Colors.green)),
                const Divider(),
                Text('Net Change: ${netChange >= 0 ? "+" : ""}${CurrencyFormatter.formatWithSymbol(netChange, symbol: currency)}', 
                  style: TextStyle(fontWeight: FontWeight.bold, color: netChange >= 0 ? Colors.green : Colors.red)),
                const SizedBox(height: 10),
                Text('New Invoice Total: ${CurrencyFormatter.formatWithSymbol(newInvoiceTotal, symbol: currency)}'),
                Text('New Outstanding Balance: ${CurrencyFormatter.formatWithSymbol(newBalance, symbol: currency)}', 
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            actions: [
              TextButton(onPressed: () => setDialogState(() => step = (replaceQuantities.values.any((q) => q > 0) ? 2 : 1)), child: const Text('BACK')),
              ElevatedButton(
                onPressed: () {
                  historyBloc.add(ReturnStock(
                    invoiceId: invoice.id!,
                    items: itemsToProcess,
                    staffId: invoice.staffId!,
                    replacements: replacements,
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Stock exchange processed successfully.'), backgroundColor: Colors.green),
                  );
                },
                child: const Text('CONFIRM & APPLY'),
              ),
            ],
          );
        },
      );
    },
  );
}

  void _handleBackup(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ListTile(
            title: Text('Backup Options', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          ListTile(
            leading: const Icon(Icons.save, color: Colors.blue),
            title: const Text('Save to Device'),
            subtitle: const Text('Choose a folder to save your backup file'),
            onTap: () async {
              Navigator.pop(ctx);
              _handleSaveToDevice(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.share, color: Colors.green),
            title: const Text('Share Backup'),
            subtitle: const Text('Send backup via WhatsApp, Email, etc.'),
            onTap: () {
              Navigator.pop(ctx);
              context.read<SettingsBloc>().add(CreateBackup());
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Future<void> _handleSaveToDevice(BuildContext context) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    final settingsBloc = context.read<SettingsBloc>();

    try {
      final bytes = await settingsBloc.backupService.createBackup();
      if (bytes == null) throw Exception('No data generated');

      final timestamp = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());
      final fileName = 'invify_backup_$timestamp.sqlite';

      final result = await FilePicker.platform.saveFile(
        dialogTitle: 'Select where to save your backup',
        fileName: fileName,
        bytes: bytes,
      );

      if (result != null) {
        scaffoldMessenger.showSnackBar(const SnackBar(content: Text('Backup saved successfully'), backgroundColor: Colors.green));
      }
    } catch (e) {
      scaffoldMessenger.showSnackBar(SnackBar(content: Text('Failed to save backup: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _handleRestore(BuildContext context) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      allowMultiple: false,
      withData: true,
    );

    if (result != null && result.files.isNotEmpty) {
      final file = result.files.first;
      if (file.bytes == null) return;

      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Confirm Restore'),
          content: Text('Importing "${file.name}" will overwrite your current data. Proceed?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('RESTORE', style: TextStyle(color: Colors.red))),
          ],
        ),
      );

      if (proceed == true) {
        context.read<SettingsBloc>().add(RestoreFromBytes(file.bytes!));
      }
    }
  }

  Future<List<Invoice>> _getPendingTransferInvoices() async {
    try {
      final repo = context.read<HistoryBloc>().getHistory.repository;
      final all = await repo.getAllInvoices();
      return all.where((inv) =>
        (inv.paymentMethod == 'Transfer' || inv.paymentMethod == 'VirtualAccount') &&
        (inv.paymentStatus.toLowerCase() == 'pending' || inv.paymentStatus.toLowerCase() == 'unpaid')
      ).toList();
    } catch (e) {
      debugPrint('[InvoiceHistoryPage] Failed to fetch pending transfers: $e');
      return [];
    }
  }

  void _navigateToPaymentSuccess(Invoice invoice, {bool autoPrint = true}) {
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => InvoiceSuccessPage(
          invoice: invoice,
          successTitle: 'Payment Confirmed Successfully!',
          autoPrint: autoPrint,
        ),
        settings: const RouteSettings(name: '/invoice_success'),
      ),
    );
  }

  void _showPendingTransfersPopup(BuildContext context) async {
    final staff = await showDialog<Staff>(
      context: context,
      builder: (ctx) => const StaffAuthDialog(),
    );
    if (staff == null) return; 

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (dialogContext) {
        List<Invoice> pendingInvoices = [];
        List<Map<String, dynamic>> receivedTransfers = [];
        bool isLoadingInvoices = true;
        bool isLoadingTransfers = false;
        bool hasLoadedTransfers = false;
        int transferFetchCount = 0;

        Invoice? selectedInvoice;
        final Set<String> selectedTransferIds = {};
        bool isSubmitting = false;

        return StatefulBuilder(
          builder: (context, setState) {
            // Load Pending Invoices
            if (isLoadingInvoices) {
              _getPendingTransferInvoices().then((list) {
                if (dialogContext.mounted) {
                  setState(() {
                    pendingInvoices = list.where((inv) => inv.staffId == staff.id).toList();
                    isLoadingInvoices = false;
                  });
                }
              });
            }

            // Load Received Transfers (Poll up to 6 times, spaced by 5 seconds)
            if (!isLoadingInvoices && !hasLoadedTransfers && !isLoadingTransfers) {
              if (staff.virtualAccountNumber != null && staff.virtualAccountNumber!.trim().isNotEmpty) {
                isLoadingTransfers = true;
                sl<FinanceRepository>()
                    .getVirtualAccountTransactions(staff.virtualAccountNumber!.trim())
                    .then((txns) {
                  if (dialogContext.mounted) {
                    setState(() {
                      receivedTransfers = txns.where((tx) {
                        final status = (tx['status'] as String?)?.toUpperCase() ?? '';
                        final type = (tx['type'] as String?)?.toUpperCase() ?? '';
                        final isSuccess = status == 'SUCCESS' || status == 'COMPLETED' || status == 'PAID';
                        // Webhook deposits use type "deposit"; older paths may use CREDIT/INWARD
                        final isInbound = type == 'CREDIT' ||
                            type == 'DEPOSIT' ||
                            type == 'INWARD' ||
                            type == 'INWARD_PAYMENT' ||
                            type == 'VIRTUAL_ACCOUNT_CREDIT' ||
                            type.isEmpty;
                        return isSuccess && isInbound;
                      }).toList();
                      isLoadingTransfers = false;
                      hasLoadedTransfers = true;
                      transferFetchCount++;
                      if (transferFetchCount < 6) {
                        Future.delayed(const Duration(seconds: 5), () {
                          if (dialogContext.mounted) {
                            setState(() {
                              hasLoadedTransfers = false;
                            });
                          }
                        });
                      }
                    });
                  }
                }).catchError((err) {
                  if (dialogContext.mounted) {
                    setState(() {
                      isLoadingTransfers = false;
                      hasLoadedTransfers = true;
                      transferFetchCount++;
                      if (transferFetchCount < 6) {
                        Future.delayed(const Duration(seconds: 5), () {
                          if (dialogContext.mounted) {
                            setState(() {
                              hasLoadedTransfers = false;
                            });
                          }
                        });
                      }
                    });
                  }
                });
              } else {
                hasLoadedTransfers = true;
              }
            }

            // Calculations
            double selectedTransfersSum = 0.0;
            for (var txId in selectedTransferIds) {
              final tx = receivedTransfers.firstWhereOrNull((t) => t['id'] == txId);
              if (tx != null) {
                selectedTransfersSum += (tx['amount'] as num).toDouble();
              }
            }

            final pendingAmount = selectedInvoice != null
                ? selectedInvoice!.totalAmount - selectedInvoice!.amountPaid
                : 0.0;

            final double remainingBalance = pendingAmount - selectedTransfersSum;

            return AlertDialog(
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Reconciliation Workspace',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Virtual Account: ${staff.virtualAccountNumber ?? "Not Set"} (${staff.name})',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(dialogContext),
                  ),
                ],
              ),
              content: SizedBox(
                width: 800,
                height: 500,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // LEFT COLUMN: RECEIVED TRANSFERS
                    Expanded(
                      flex: 1,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selectedInvoice?.paymentMethod == 'Transfer'
                                  ? 'Manual Verification'
                                  : '1. Received Transfers (${receivedTransfers.length})',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey),
                            ),
                            const SizedBox(height: 8),
                            if (selectedInvoice?.paymentMethod == 'Transfer')
                              Expanded(
                                child: Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.account_balance, size: 48, color: Colors.amber.shade700),
                                        const SizedBox(height: 16),
                                        const Text(
                                          'Manual Bank Transfer',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'This invoice was checked out via manual bank transfer. Please check your bank statement/alerts to verify that you have received the payment of:',
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 12),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.amber.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.amber.shade200),
                                          ),
                                          child: Text(
                                            CurrencyFormatter.format(selectedInvoice!.totalAmount),
                                            style: TextStyle(
                                              fontSize: 20,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.amber.shade900,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          'Click the "Confirm Paid (Manual)" button below to mark this invoice as paid.',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                                          textAlign: TextAlign.center,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              )
                            else if (isLoadingTransfers)
                              const Expanded(
                                child: Center(child: CircularProgressIndicator()),
                              )
                            else if (receivedTransfers.isEmpty)
                              const Expanded(
                                child: Center(
                                  child: Text(
                                    'No success transfers found on this account.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              )
                            else
                              Expanded(
                                child: ListView.separated(
                                  itemCount: receivedTransfers.length,
                                  separatorBuilder: (_, __) => const Divider(height: 8),
                                  itemBuilder: (context, index) {
                                    final tx = receivedTransfers[index];
                                    final txId = tx['id'] as String;
                                    final txAmount = (tx['amount'] as num).toDouble();
                                    final isSelected = selectedTransferIds.contains(txId);

                                    final meta = tx['metadata'];
                                    String? senderName;
                                    String? senderBank;
                                    if (meta is Map) {
                                      senderName = meta['senderName'] as String?;
                                      senderBank = meta['senderBank'] as String?;
                                    }

                                    return CheckboxListTile(
                                      enabled: selectedInvoice != null,
                                      value: isSelected,
                                      title: Text(
                                        CurrencyFormatter.format(txAmount),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      subtitle: Padding(
                                        padding: const EdgeInsets.only(top: 2.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Ref: ${tx['reference'] ?? "N/A"}',
                                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                                            ),
                                            if (senderName != null || senderBank != null)
                                              Text(
                                                'Sender: ${senderName ?? "Unknown"} (${senderBank ?? "N/A"})',
                                                style: const TextStyle(fontSize: 10, color: Colors.blueGrey, fontWeight: FontWeight.w500),
                                              ),
                                            Text(
                                              'Date: ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.parse(tx['createdAt']))}',
                                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                                            ),
                                          ],
                                        ),
                                      ),
                                      onChanged: (val) {
                                        setState(() {
                                          if (val == true) {
                                            selectedTransferIds.add(txId);
                                          } else {
                                            selectedTransferIds.remove(txId);
                                          }
                                        });
                                      },
                                      contentPadding: EdgeInsets.zero,
                                      controlAffinity: ListTileControlAffinity.leading,
                                    );
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    // RIGHT COLUMN: PENDING INVOICES
                    Expanded(
                      flex: 1,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '2. Select Pending Invoice (${pendingInvoices.length})',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey),
                            ),
                            const SizedBox(height: 8),
                            if (isLoadingInvoices)
                              const Expanded(
                                child: Center(child: CircularProgressIndicator()),
                              )
                            else if (pendingInvoices.isEmpty)
                              const Expanded(
                                child: Center(
                                  child: Text(
                                    'No pending transfer checkout invoices.',
                                    style: TextStyle(fontSize: 12, color: Colors.grey),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              )
                            else
                              Expanded(
                                child: ListView.builder(
                                  itemCount: pendingInvoices.length,
                                  itemBuilder: (context, index) {
                                    final inv = pendingInvoices[index];
                                    final isSelected = selectedInvoice?.id == inv.id;

                                    return Card(
                                      color: isSelected ? Colors.blue.shade50 : Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(6),
                                        side: BorderSide(
                                          color: isSelected ? Colors.blue : Colors.grey.shade300,
                                          width: isSelected ? 1.5 : 1,
                                        ),
                                      ),
                                      margin: const EdgeInsets.symmetric(vertical: 4),
                                      child: ListTile(
                                        title: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              inv.invoiceNumber,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                            Text(
                                              CurrencyFormatter.format(inv.totalAmount),
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green),
                                            ),
                                          ],
                                        ),
                                        subtitle: Padding(
                                          padding: const EdgeInsets.only(top: 4.0),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text('Customer: ${inv.customerName ?? "Guest"}', style: const TextStyle(fontSize: 11)),
                                              Text(
                                                'Date: ${DateFormat('yyyy-MM-dd HH:mm').format(inv.dateCreated)}',
                                                style: const TextStyle(fontSize: 10, color: Colors.grey),
                                              ),
                                              Wrap(
                                                spacing: 4,
                                                runSpacing: 4,
                                                children: [
                                                  Container(
                                                    margin: const EdgeInsets.only(top: 4),
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: inv.paymentMethod == 'Transfer' 
                                                          ? Colors.amber.shade50 
                                                          : Colors.purple.shade50,
                                                      borderRadius: BorderRadius.circular(4),
                                                      border: Border.all(
                                                        color: inv.paymentMethod == 'Transfer'
                                                            ? Colors.amber.shade200
                                                            : Colors.purple.shade200,
                                                      ),
                                                    ),
                                                    child: Text(
                                                      inv.paymentMethod == 'Transfer'
                                                          ? 'Manual Bank Transfer'
                                                          : 'Virtual Account',
                                                      style: TextStyle(
                                                        color: inv.paymentMethod == 'Transfer'
                                                            ? Colors.amber.shade800
                                                            : Colors.purple.shade800,
                                                        fontSize: 9,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                  Container(
                                                    margin: const EdgeInsets.only(top: 4),
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: inv.paymentMethod == 'Transfer' 
                                                          ? Colors.orange.shade50 
                                                          : Colors.blue.shade50,
                                                      borderRadius: BorderRadius.circular(4),
                                                    ),
                                                    child: Text(
                                                      inv.paymentMethod == 'Transfer'
                                                          ? 'Awaiting Admin Confirmation'
                                                          : 'Awaiting Payment',
                                                      style: TextStyle(
                                                        color: inv.paymentMethod == 'Transfer'
                                                            ? Colors.orange.shade700
                                                            : Colors.blue.shade700,
                                                        fontSize: 9,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              if (inv.items.isNotEmpty) ...[
                                                const SizedBox(height: 4),
                                                Text(
                                                  'Items: ${inv.items.map((i) => i.item.name).take(3).join(', ')}${inv.items.length > 3 ? "..." : ""}',
                                                  style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Colors.blueGrey),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                        onTap: () {
                                          setState(() {
                                            if (isSelected) {
                                              selectedInvoice = null;
                                              selectedTransferIds.clear();
                                            } else {
                                              selectedInvoice = inv;
                                              selectedTransferIds.clear();
                                            }
                                          });
                                        },
                                      ),
                                    );
                                  },
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                if (selectedInvoice != null) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Selected Invoice Pending: ${CurrencyFormatter.format(pendingAmount)}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Mapped Transfers: ${CurrencyFormatter.format(selectedTransfersSum)}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: selectedTransfersSum > 0 ? Colors.green : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ],
                isSubmitting
                    ? const Padding(
                        padding: EdgeInsets.only(right: 16),
                        child: CircularProgressIndicator(),
                      )
                    : ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade800,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        onPressed: (selectedInvoice == null || 
                                (selectedInvoice!.paymentMethod != 'Transfer' && selectedTransferIds.isEmpty))
                            ? null
                            : () async {
                                if (selectedInvoice!.paymentMethod == 'Transfer') {
                                  // Manual bank transfer confirmation
                                  setState(() => isSubmitting = true);
                                  try {
                                    final repository = context.read<HistoryBloc>().getHistory.repository;
                                    final updated = selectedInvoice!.copyWith(
                                      paymentStatus: 'Paid',
                                      amountPaid: selectedInvoice!.totalAmount,
                                      balanceAmount: 0.0,
                                      paymentMethod: 'Transfer',
                                    );
                                    await repository.updateInvoice(updated);

                                    if (context.mounted) {
                                      context.read<HistoryBloc>().add(LoadHistory());
                                    }

                                    Navigator.pop(dialogContext);
                                    _navigateToPaymentSuccess(updated);
                                  } catch (e) {
                                    if (dialogContext.mounted) {
                                      setState(() => isSubmitting = false);
                                    }
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Verification failed: $e'),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                } else if (remainingBalance > 0.01) {
                                  // Underpaid: prompt user how to top up
                                  final choice = await showDialog<String>(
                                    context: context,
                                    builder: (choiceCtx) => AlertDialog(
                                      title: const Text('Reconcile Remaining Balance'),
                                      content: Text(
                                        'The selected transfers total ${CurrencyFormatter.format(selectedTransfersSum)}, '
                                        'which is less than the invoice pending balance of ${CurrencyFormatter.format(pendingAmount)}.\n\n'
                                        'How would you like to handle the remaining ${CurrencyFormatter.format(remainingBalance)}?'
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.pop(choiceCtx, 'CASH'),
                                          child: const Text('Top up with Cash'),
                                        ),
                                        TextButton(
                                          onPressed: () => Navigator.pop(choiceCtx, 'PARTIAL'),
                                          child: const Text('Pay remaining later'),
                                        ),
                                        TextButton(
                                          onPressed: () => Navigator.pop(choiceCtx, 'CANCEL'),
                                          child: const Text('Cancel Reconciliation', style: TextStyle(color: Colors.red)),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (choice == null || choice == 'CANCEL') return;

                                  setState(() => isSubmitting = true);
                                  try {
                                    final repository = context.read<HistoryBloc>().getHistory.repository;
                                    late final Invoice updated;

                                    if (choice == 'CASH') {
                                      // Marks the invoice as Paid, with cash + transfer mapping
                                      updated = selectedInvoice!.copyWith(
                                        paymentStatus: 'Paid',
                                        amountPaid: selectedInvoice!.totalAmount,
                                        balanceAmount: 0.0,
                                        paymentMethod: 'Transfer + Cash',
                                      );
                                      await repository.updateInvoice(updated);
                                    } else {
                                      // Marks as Partial, with remaining balance unpaid
                                      updated = selectedInvoice!.copyWith(
                                        paymentStatus: 'Partial',
                                        amountPaid: selectedInvoice!.amountPaid + selectedTransfersSum,
                                        balanceAmount: remainingBalance,
                                        paymentMethod: 'Transfer',
                                      );
                                      await repository.updateInvoice(updated);
                                    }

                                    // Refresh lists
                                    if (context.mounted) {
                                      context.read<HistoryBloc>().add(LoadHistory());
                                    }

                                    Navigator.pop(dialogContext);

                                    if (choice == 'CASH') {
                                      _navigateToPaymentSuccess(updated);
                                    } else if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Invoice ${updated.invoiceNumber} reconciled as partial payment.'),
                                          backgroundColor: Colors.orange,
                                        ),
                                      );
                                    }
                                  } catch (e) {
                                    if (dialogContext.mounted) {
                                      setState(() => isSubmitting = false);
                                    }
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Reconciliation failed: $e'),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                } else {
                                  // Exact match or overpaid: Reconcile as paid
                                  setState(() => isSubmitting = true);
                                  try {
                                    final repository = context.read<HistoryBloc>().getHistory.repository;
                                    final updated = selectedInvoice!.copyWith(
                                      paymentStatus: 'Paid',
                                      amountPaid: selectedInvoice!.totalAmount,
                                      balanceAmount: 0.0,
                                      paymentMethod: 'Transfer',
                                    );
                                    await repository.updateInvoice(updated);

                                    if (context.mounted) {
                                      context.read<HistoryBloc>().add(LoadHistory());
                                    }

                                    Navigator.pop(dialogContext);
                                    _navigateToPaymentSuccess(updated);
                                  } catch (e) {
                                    if (dialogContext.mounted) {
                                      setState(() => isSubmitting = false);
                                    }
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Match mapping failed: $e'),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                }
                              },
                        child: Text(selectedInvoice?.paymentMethod == 'Transfer' 
                            ? 'Confirm Paid (Manual)' 
                            : 'Complete Match'),
                      ),
              ],
            );
          },
        );
      },
    );
  }
}
