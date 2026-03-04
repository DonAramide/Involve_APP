import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
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
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/invoicing/domain/services/report_generator.dart' as reports hide DateTimeRange;
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';
import 'report_preview_page.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:fl_chart/fl_chart.dart';
import 'package:collection/collection.dart';

// Stock Return Features
import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/stock_return.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';

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
              child: Center(child: CircularProgressIndicator()),
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
                return const Center(child: CircularProgressIndicator());
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
              ],
            )
          : Row(
              children: [
                Expanded(
                  flex: 2,
                  child: _buildSearchField(context, state, currentAmount),
                ),
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
              ],
            ),
    );
  }

  Widget _buildSearchField(BuildContext context, HistoryState state, double? currentAmount) {
    return TextField(
      controller: _searchController,
      decoration: InputDecoration(
        hintText: 'Search Invoice ID',
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
            padding: const EdgeInsets.all(8.0),
            child: Wrap(
              alignment: WrapAlignment.end,
              spacing: 8.0,
              runSpacing: 4.0,
              children: [
                if (invoice.paymentStatus != 'Paid')
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
                if (context.read<SettingsBloc>().state.settings?.stockReturnEnabled == true)
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
                _generateReport(context, reports.ReportType.standard);
              },
              child: const Text('STANDARD SALES'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                _generateReport(context, reports.ReportType.activity);
              },
              child: const Text('DETAILED ACTIVITY LOG'),
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
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary),
                      ),
                    ],
                  ),
                  Container(height: 30, width: 1, color: Colors.grey[300]),
                  Column(
                    children: [
                      const Text('TOTAL COLLECTED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                      Text(
                        CurrencyFormatter.formatWithSymbol(state.totalSales, symbol: currency),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
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
}
