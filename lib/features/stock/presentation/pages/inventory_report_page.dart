import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/invoicing/domain/services/report_generator.dart';
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';

class InventoryReportPage extends StatefulWidget {
  const InventoryReportPage({super.key});

  @override
  State<InventoryReportPage> createState() => _InventoryReportPageState();
}

class _InventoryReportPageState extends State<InventoryReportPage> {
  DateTimeRange? _dateRange;

  @override
  void initState() {
    super.initState();
    _loadReport();
  }

  void _loadReport() {
    context.read<StockBloc>().add(LoadInventoryReportRequested(
      start: _dateRange?.start,
      end: _dateRange?.end,
    ));
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _dateRange,
    );
    if (picked != null) {
      setState(() => _dateRange = picked);
      _loadReport();
    }
  }

  void _exportReport(BuildContext context) async {
    final state = context.read<StockBloc>().state;
    final settingsState = context.read<SettingsBloc>().state;
    
    if (state is InventoryReportLoaded && settingsState.settings != null) {
      try {
        await ReportGenerator.generateInventoryReport(
          reportData: state.report,
          settings: settingsState.settings!,
          dateRange: _dateRange != null 
            ? InvReportDateRange(start: _dateRange!.start, end: _dateRange!.end)
            : null,
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
        const SnackBar(content: Text('Please wait for data to load.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Export CSV',
            onPressed: () => _exportReport(context),
          ),
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
          if (_dateRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                setState(() => _dateRange = null);
                _loadReport();
              },
            ),
        ],
      ),
      body: Column(
        children: [
          if (_dateRange != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              width: double.infinity,
              child: Text(
                'Range: ${DateFormat('MMM dd').format(_dateRange!.start)} - ${DateFormat('MMM dd').format(_dateRange!.end)}',
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          Expanded(
            child: BlocBuilder<StockBloc, StockState>(
              builder: (context, state) {
                if (state is StockLoading) {
                  return const Center(child: CircularProgressIndicator());
                } else if (state is InventoryReportLoaded) {
                  if (state.report.isEmpty) {
                    return const Center(child: Text('No products found.'));
                  }

                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SingleChildScrollView(
                      child: DataTable(
                        columns: const [
                          DataColumn(label: Text('Product')),
                          DataColumn(label: Text('Price'), numeric: true),
                          DataColumn(label: Text('Stock'), numeric: true),
                          DataColumn(label: Text('Sold'), numeric: true),
                          DataColumn(label: Text('Revenue'), numeric: true),
                        ],
                        rows: state.report.map((item) {
                          return DataRow(cells: [
                            DataCell(Text(item['name'])),
                            DataCell(Text(CurrencyFormatter.formatWithSymbol(item['price'], symbol: currencySymbol))),
                            DataCell(Text(item['stockQty'].toString())),
                            DataCell(Text(item['totalSold'].toString())),
                            DataCell(Text(CurrencyFormatter.formatWithSymbol(item['totalRevenue'], symbol: currencySymbol))),
                          ]);
                        }).toList(),
                      ),
                    ),
                  );
                } else if (state is StockError) {
                  return Center(child: Text(state.message));
                }
                return const SizedBox();
              },
            ),
          ),
        ],
      ),
    );
  }
}
