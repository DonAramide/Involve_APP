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
import 'package:involve_app/core/utils/terminology.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

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
    final now = DateTime.now();
    _dateRange = DateTimeRange(
      start: DateTime(now.year, now.month, now.day),
      end: DateTime(now.year, now.month, now.day, 23, 59, 59),
    );
    _loadReport();
  }

  void _loadReport() {
    final mode = context.read<SettingsBloc>().state.settings?.businessMode;
    context.read<StockBloc>().add(LoadInventoryReportRequested(
      start: _dateRange?.start,
      end: _dateRange?.end,
      businessMode: mode,
    ));
  }

  Future<void> _selectDateRange() async {
    final theme = Theme.of(context);
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
      initialDateRange: _dateRange,
      builder: (context, child) {
        return Theme(
          data: theme.copyWith(
            colorScheme: theme.colorScheme,
            dialogBackgroundColor: theme.colorScheme.surface,
          ),
          child: child!,
        );
      },
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
        title: Text(settings?.businessMode == 'school' ? 'Fee Analysis' : 'Inventory Report'),
        actions: [
          Tooltip(
            message: 'Export CSV',
            child: InkWell(
              onTap: () => _exportReport(context),
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.share, size: 20),
                    SizedBox(height: 2),
                    Text('Export', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          Tooltip(
            message: 'Thermal Print',
            child: InkWell(
              onTap: () {
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
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.print_outlined, size: 20),
                    SizedBox(height: 2),
                    Text('Print', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          Tooltip(
            message: 'Print PDF',
            child: InkWell(
              onTap: () async {
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
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.picture_as_pdf, size: 20),
                    SizedBox(height: 2),
                    Text('PDF', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          Tooltip(
            message: 'Date Range',
            child: InkWell(
              onTap: _selectDateRange,
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6.0, vertical: 4.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.date_range, size: 20),
                    SizedBox(height: 2),
                    Text('Date', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
          if (_dateRange != null)
            IconButton(
              icon: const Icon(Icons.clear),
              tooltip: 'Clear Date Filter',
              onPressed: () {
                setState(() => _dateRange = null);
                _loadReport();
              },
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          if (_dateRange != null)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFF2C2C2E)
                  : Theme.of(context).primaryColor.withOpacity(0.1),
              width: double.infinity,
              child: Text(
                'Range: ${DateFormat('MMM dd').format(_dateRange!.start)} - ${DateFormat('MMM dd').format(_dateRange!.end)}',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
          Expanded(
            child: BlocBuilder<StockBloc, StockState>(
              builder: (context, state) {
                if (state is StockLoading) {
                  return const InvifyLoadingIndicator(message: 'CALCULATING INVENTORY METRICS...');
                } else if (state is InventoryReportLoaded) {
                  if (state.report.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          settings?.businessMode == 'school'
                              ? 'No fees recorded in this date range.'
                              : 'No inventory activity in this date range.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
                        ),
                      ),
                    );
                  }
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
                        const SizedBox(height: 16),
                        _buildTable(context, state.report, currencySymbol, settings),
                      ],
                    ),
                  );
                } else if (state is StockError) {
                  return Center(child: Text(state.message));
                }
                return Center(
                  child: Text(
                    'Select a date range to view metrics',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7)),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTable(BuildContext context, List<Map<String, dynamic>> report, String currency, AppSettings? settings) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final headerBg = isDark ? const Color(0xFF2C2C2E) : Colors.grey.shade200;
    final evenRow = isDark ? const Color(0xFF121212) : Colors.white;
    final oddRow = isDark ? const Color(0xFF1C1C1E) : Colors.grey.shade50;
    final border = isDark ? cs.outline.withOpacity(0.25) : Colors.grey.shade300;
    final headerStyle = TextStyle(fontWeight: FontWeight.bold, color: cs.onSurface);
    final cellStyle = TextStyle(color: cs.onSurface);
    final mutedStyle = TextStyle(color: cs.onSurface.withOpacity(0.75));

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: headerBg,
            border: Border(bottom: BorderSide(color: border, width: 1)),
          ),
          child: Row(
            children: [
              Expanded(flex: 3, child: Text(settings?.productLabel ?? 'Product', style: headerStyle)),
              Expanded(flex: 2, child: Text(settings?.businessMode == 'school' ? 'Amount' : 'Price', style: headerStyle, textAlign: TextAlign.right)),
              if (settings?.businessMode != 'school')
                Expanded(flex: 2, child: Text('Stock', style: headerStyle, textAlign: TextAlign.right)),
              Expanded(flex: 2, child: Text('Sold', style: headerStyle, textAlign: TextAlign.right)),
              Expanded(flex: 2, child: Text('Revenue', style: headerStyle, textAlign: TextAlign.right)),
            ],
          ),
        ),
        ...report.mapIndexed((index, item) {
          return Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: index % 2 == 0 ? evenRow : oddRow,
              border: Border(bottom: BorderSide(color: border, width: 1)),
            ),
            child: Row(
              children: [
                Expanded(flex: 3, child: Text(item['name'], style: cellStyle.copyWith(fontWeight: FontWeight.w500))),
                Expanded(flex: 2, child: Text(CurrencyFormatter.formatWithSymbol(item['price'], symbol: currency), textAlign: TextAlign.right, style: mutedStyle)),
                if (settings?.businessMode != 'school')
                  Expanded(flex: 2, child: Text(item['stockQty'] >= 999999 ? 'N/A' : item['stockQty'].toString(), textAlign: TextAlign.right, style: mutedStyle)),
                Expanded(flex: 2, child: Text(item['totalSold'].toString(), textAlign: TextAlign.right, style: mutedStyle)),
                Expanded(flex: 2, child: Text(CurrencyFormatter.formatWithSymbol(item['totalRevenue'], symbol: currency), textAlign: TextAlign.right, style: cellStyle.copyWith(fontWeight: FontWeight.bold))),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildTopSellingChart(BuildContext context, List<Map<String, dynamic>> report) {
    final topSelling = report.where((i) => i['totalSold'] > 0).toList()
      ..sort((a, b) => (b['totalSold'] as num).compareTo(a['totalSold'] as num));
    
    final top5 = topSelling.take(5).toList();
    if (top5.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final titleStyle = TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: cs.onSurface);
    final axisStyle = TextStyle(fontSize: 10, color: cs.onSurface.withOpacity(0.75));

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outline.withOpacity(isDark ? 0.25 : 0.12)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(isDark ? 0.35 : 0.08), blurRadius: 4),
        ],
      ),
      child: Column(
        children: [
          Text(
            context.read<SettingsBloc>().state.settings?.businessMode == 'school' 
              ? 'Top Revenue Fees/Items' 
              : 'Top Selling Items (Quantity)', 
            style: titleStyle,
          ),
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
                          child: Text(name.length > 8 ? '${name.substring(0, 5)}...' : name, style: axisStyle),
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
    final isSchool = context.read<SettingsBloc>().state.settings?.businessMode == 'school';
    final withValue = report.map((i) {
      final value = isSchool
          ? (i['totalRevenue'] as num? ?? 0)
          : (i['stockQty'] as num) * (i['price'] as num);
      return {...i, 'stockValue': value};
    }).toList()
      ..sort((a, b) => (b['stockValue'] as num).compareTo(a['stockValue'] as num));

    final top5 = withValue.where((i) => (i['stockValue'] as num) > 0).take(5).toList();
    if (top5.isEmpty) return const SizedBox.shrink();

    final totalValue = top5.fold<double>(0, (sum, item) => sum + (item['stockValue'] as num).toDouble());
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1C1C1E) : Colors.white;
    final labelStyle = TextStyle(fontSize: 10, color: cs.onSurface);
    final titleStyle = TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: cs.onSurface);

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
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outline.withOpacity(isDark ? 0.25 : 0.12)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(isDark ? 0.35 : 0.08), blurRadius: 4),
        ],
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
                Text(
                  isSchool ? 'Revenue Analysis' : 'Stock Value Analysis',
                  style: titleStyle,
                ),
                const SizedBox(height: 10),
                ...top5.asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Container(width: 8, height: 8, color: colors[e.key % colors.length]),
                      const SizedBox(width: 8),
                      Expanded(child: Text(e.value['name'], style: labelStyle, overflow: TextOverflow.ellipsis)),
                      Text(
                        CurrencyFormatter.formatWithSymbol(e.value['stockValue'], symbol: currencySymbol),
                        style: labelStyle.copyWith(fontWeight: FontWeight.bold),
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
