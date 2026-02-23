import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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

class InvoiceHistoryPage extends StatefulWidget {
  const InvoiceHistoryPage({super.key});

  @override
  State<InvoiceHistoryPage> createState() => _InvoiceHistoryPageState();
}

class _InvoiceHistoryPageState extends State<InvoiceHistoryPage> {
  DateTimeRange? _selectedRange;
  bool _isTableView = false;

  @override
  void initState() {
    super.initState();
    context.read<HistoryBloc>().add(LoadHistory());
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
            onPressed: () {
              if (kIsWeb) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Database backup is not supported on Web. Use PDF Export instead.')),
                );
              } else {
                context.read<SettingsBloc>().add(CreateBackup());
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.cloud_upload),
            tooltip: 'Import All Data',
            onPressed: () => _showRestoreDialog(context),
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
          return Column(
            children: [
              _buildFilterHeader(context, constraints),
              Expanded(
                child: BlocBuilder<HistoryBloc, HistoryState>(
                  builder: (context, state) {
                    if (state is HistoryLoading) {
                      return const Center(child: CircularProgressIndicator());
                    } else if (state is HistoryLoaded) {
                      if (state.invoices.isEmpty) {
                        return const Center(child: Text('No invoices found.'));
                      }
                      return Column(
                        children: [
                          if (context.read<SettingsBloc>().state.settings?.showTotalSalesCard == true)
                            _buildTotalSummary(context, state),
                          Expanded(
                            child: _isTableView
                                ? _buildReportsTable(context, state)
                                : ListView.builder(
                                    itemCount: state.invoices.length,
                                    itemBuilder: (context, index) {
                                      final invoice = state.invoices[index];
                                      return _buildInvoiceCard(context, invoice);
                                    },
                                  ),
                          ),
                        ],
                      );
                    } else if (state is HistoryError) {
                      return Center(child: Text(state.message));
                    }
                    return const Center(child: Text('Start searching!'));
                  },
                ),
              ),
            ],
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
      decoration: const InputDecoration(
        hintText: 'Search Invoice ID',
        prefixIcon: Icon(Icons.search),
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 12),
      ),
      onChanged: (value) {
        context.read<HistoryBloc>().add(LoadHistory(
          start: _selectedRange?.start,
          end: _selectedRange?.end,
          query: value,
          amount: currentAmount,
          paymentMethod: state is HistoryLoaded ? state.paymentMethod : null,
          paymentStatus: state is HistoryLoaded ? state.paymentStatus : null,
          staffId: state is HistoryLoaded ? state.staffId : null,
        ));
      },
    );
  }

  Widget _buildAmountField(BuildContext context, HistoryState state, String currentQuery) {
    return TextField(
      keyboardType: TextInputType.number,
      decoration: const InputDecoration(
        hintText: 'Amount',
        prefixIcon: Padding(
          padding: EdgeInsets.all(12),
          child: Text('₦', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.symmetric(horizontal: 12),
      ),
      onChanged: (value) {
        final amount = double.tryParse(value);
        context.read<HistoryBloc>().add(LoadHistory(
          start: _selectedRange?.start,
          end: _selectedRange?.end,
          query: currentQuery,
          amount: amount,
          paymentMethod: state is HistoryLoaded ? state.paymentMethod : null,
          paymentStatus: state is HistoryLoaded ? state.paymentStatus : null,
          staffId: state is HistoryLoaded ? state.staffId : null,
        ));
      },
    );
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
          ...invoice.items.map((item) => ListTile(
                dense: true,
                title: Text(item.item.name),
                subtitle: item.printPrice != null 
                  ? Text('Receipt Price: ${CurrencyFormatter.formatWithSymbol(item.printPrice!, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}', 
                    style: TextStyle(fontSize: 11, color: Colors.blue[700]))
                  : null,
                trailing: Text('${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}'),
              )),
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
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(invoice.paymentMethod ?? '-', style: const TextStyle(fontSize: 12)),
                        const SizedBox(width: 4),
                        _buildStatusBadge(invoice.paymentStatus, isMini: true),
                      ],
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

      // Show overlay if not on web (Web handles downloads asynchronously well enough usually)
      // or just be very careful with the context.
      
      try {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ReportPreviewPage(
              invoices: historyState.invoices,
              settings: settingsState.settings!,
              dateRange: _selectedRange != null 
                ? InvReportDateRange(start: _selectedRange!.start, end: _selectedRange!.end)
                : null,
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
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please wait for data to load before exporting.')),
      );
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          const Text(
            'TOTAL SALES FOR PERIOD',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.blueGrey,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            CurrencyFormatter.formatWithSymbol(
              state.totalSales,
              symbol: currency,
            ),
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${state.invoices.length} Invoices',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  void _showRestoreDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sync & Merge Data'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('This will safely merge the selected backup into your current data.', 
              style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Text('• Existing invoices will NOT be duplicated.'),
            Text('• New categories and items will be added.'),
            Text('• Local data will NOT be deleted.'),
            SizedBox(height: 16),
            Text('Select a .sqlite file to sync from.'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          ElevatedButton.icon(
            icon: const Icon(Icons.sync),
            onPressed: () async {
              Navigator.pop(ctx);
              final result = await FilePicker.platform.pickFiles(
                type: FileType.any,
              );
              
              if (result != null && result.files.single.path != null && context.mounted) {
                final path = result.files.single.path!;
                context.read<SettingsBloc>().add(RestoreFromPath(path));
              }
            },
            label: const Text('PICK FILE & SYNC'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
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
              value: selectedMethod,
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
}
