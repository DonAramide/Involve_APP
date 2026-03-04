import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/invoicing/domain/services/report_generator.dart';
import 'package:involve_app/features/invoicing/domain/entities/report_date_range.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:collection/collection.dart';

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
    final settings = context.read<SettingsBloc>().state.settings;
    final currencySymbol = settings?.currency ?? '₦';

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
            icon: const Icon(Icons.print_outlined),
            tooltip: 'Thermal Print',
            onPressed: () {
              final state = context.read<StockBloc>().state;
              final settingsState = context.read<SettingsBloc>().state;
              
              if (state is InventoryReportLoaded && settingsState.settings != null) {
                final commands = ReportGenerator.buildInventoryThermalCommands(
                  reportData: state.report,
                  settings: settingsState.settings!,
                  dateRange: _dateRange != null 
                    ? InvReportDateRange(start: _dateRange!.start, end: _dateRange!.end)
                    : null,
                );
                
                context.read<PrinterBloc>().add(PrintCommandsEvent(
                  commands, 
                  settingsState.settings!.paperWidth
                ));
                
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Sent to printer...')),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please wait for data to load.')),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.print),
            tooltip: 'Print PDF',
            onPressed: () async {
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
                      SnackBar(content: Text('Print failed: ${e.toString()}')),
                    );
                  }
                }
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Please wait for data to load.')),
                );
              }
            },
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
                  return SingleChildScrollView(
                    child: Column(
                      children: [
                        if (settings?.showTopSellingChart == true) ...[
                          _buildTopSellingChart(context, state.report),
                          const SizedBox(height: 16),
                        ],
                        if (settings?.showStockValueChart == true) ...[
                          _buildStockValueChart(context, state.report, currencySymbol),
                          const SizedBox(height: 16),
                        ],
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
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
                      ],
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

  Widget _buildTopSellingChart(BuildContext context, List<Map<String, dynamic>> report) {
    final topSelling = report.where((i) => i['totalSold'] > 0).toList()
      ..sort((a, b) => (b['totalSold'] as num).compareTo(a['totalSold'] as num));
    
    final top5 = topSelling.take(5).toList();
    if (top5.isEmpty) return const SizedBox.shrink();

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Column(
        children: [
          const Text('Top Selling Items (Quantity)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 20),
          Expanded(
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: (top5.map((e) => e['totalSold'] as num).reduce((a, b) => a > b ? a : b) * 1.3).toDouble(),
                barTouchData: BarTouchData(
                  enabled: false,
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => Colors.transparent,
                    tooltipPadding: EdgeInsets.zero,
                    tooltipMargin: 4,
                    getTooltipItem: (group, groupIndex, rod, rodIndex) {
                      return BarTooltipItem(
                        rod.toY.round().toString(),
                        const TextStyle(
                          color: Colors.blueGrey,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      );
                    },
                  ),
                ),
                titlesData: FlTitlesData(
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= top5.length) return const SizedBox.shrink();
                        final name = top5[idx]['name'] as String;
                        return Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Text(name.length > 8 ? '${name.substring(0, 5)}...' : name, style: const TextStyle(fontSize: 10)),
                        );
                      },
                    ),
                  ),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                barGroups: top5.asMap().entries.map((e) {
                  return BarChartGroupData(
                    x: e.key,
                    barRods: [
                      BarChartRodData(
                        toY: (e.value['totalSold'] as num).toDouble(),
                        color: Theme.of(context).colorScheme.primary,
                        width: 16,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                    showingTooltipIndicators: [0],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockValueChart(BuildContext context, List<Map<String, dynamic>> report, String currencySymbol) {
    // Top 5 by Value (Stock * Price)
    final withValue = report.map((i) => {
      ...i,
      'stockValue': (i['stockQty'] as num) * (i['price'] as num)
    }).toList()..sort((a, b) => (b['stockValue'] as num).compareTo(a['stockValue'] as num));

    final top5 = withValue.take(5).toList();
    if (top5.isEmpty) return const SizedBox.shrink();

    final totalValue = top5.fold<double>(0, (sum, item) => sum + (item['stockValue'] as num).toDouble());

    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
    ];

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 30,
                sections: top5.asMap().entries.map((e) {
                  final val = (e.value['stockValue'] as num).toDouble();
                  final percentage = val / totalValue * 100;
                  return PieChartSectionData(
                    value: val,
                    color: colors[e.key % colors.length],
                    radius: 50,
                    showTitle: true,
                    title: '${percentage.toStringAsFixed(0)}%',
                    titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Stock Value Analysis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 10),
                ...top5.asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Container(width: 8, height: 8, color: colors[e.key % colors.length]),
                      const SizedBox(width: 8),
                      Expanded(child: Text(e.value['name'], style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis)),
                      Text(
                        CurrencyFormatter.formatWithSymbol(e.value['stockValue'], symbol: currencySymbol), 
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)
                      ),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
