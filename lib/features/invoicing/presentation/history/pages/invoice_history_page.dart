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
import '../../../domain/services/report_generator.dart' as reports hide DateTimeRange;
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
            onPressed: () => context.read<SettingsBloc>().add(CreateBackup()),
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
            builder: (context) => const Center(child: CircularProgressIndicator()),
          );
        } else if (state.successMessage != null && state.successMessage!.contains('Backup')) {
          // Dismiss dialog if open
          Navigator.of(context, rootNavigator: true).popUntil((route) => route.settings.name != null); 
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.successMessage!), backgroundColor: Colors.green),
          );
        } else if (state.error != null && state.error!.contains('Backup')) {
           Navigator.of(context, rootNavigator: true).popUntil((route) => route.settings.name != null);
           ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.error!), backgroundColor: Colors.red),
          );
        }
      },
      child: Column(
        children: [
          _buildFilterHeader(context),
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
      ),
    );
  }

  Widget _buildFilterHeader(BuildContext context) {
    final state = context.watch<HistoryBloc>().state;
    String currentQuery = '';
    double? currentAmount;
    
    if (state is HistoryLoaded) {
      currentQuery = state.query ?? '';
      currentAmount = state.amount;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: TextField(
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
                ));
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: _buildStaffFilter(context, state),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: TextField(
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
                ));
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: _buildPaymentMethodFilter(context, state),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard(BuildContext context, Invoice invoice) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ExpansionTile(
        title: Text('${invoice.invoiceNumber}'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Date: ${invoice.dateCreated.toString().split('.')[0]} • ${invoice.paymentMethod ?? "N/A"}'),
            Text('Total: ${CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')} • Sold By: ${invoice.staffName ?? "N/A"}'),
          ],
        ),
        children: [
          ...invoice.items.map((item) => ListTile(
                dense: true,
                title: Text(item.item.name),
                trailing: Text('${item.quantity} x ${CurrencyFormatter.formatWithSymbol(item.unitPrice, symbol: context.read<SettingsBloc>().state.settings?.currency ?? '₦')}'),
              )),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
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
        child: DataTable(
          columnSpacing: 12,
          horizontalMargin: 0,
          columns: const [
            DataColumn(label: Text('Invoice ID', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Customer', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Method', style: TextStyle(fontWeight: FontWeight.bold))),
            DataColumn(label: Text('Amount', style: TextStyle(fontWeight: FontWeight.bold))),
          ],
          rows: state.invoices.map((invoice) {
            return DataRow(
              cells: [
                DataCell(Text(invoice.invoiceNumber, style: const TextStyle(fontSize: 12))),
                DataCell(Text(invoice.dateCreated.toString().split(' ')[0], style: const TextStyle(fontSize: 12))),
                DataCell(Text(invoice.customerName ?? '-', style: const TextStyle(fontSize: 12))),
                DataCell(Text(invoice.paymentMethod ?? '-', style: const TextStyle(fontSize: 12))),
                DataCell(Text(CurrencyFormatter.formatWithSymbol(invoice.totalAmount, symbol: currency), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold))),
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
      // Logic to reprint using existing printer bloc and template engine
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ReceiptPreviewPage(invoice: invoice),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings not loaded. Cannot print.')),
      );
    }
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
                ? reports.ReportDateRange(start: _selectedRange!.start, end: _selectedRange!.end)
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
}
