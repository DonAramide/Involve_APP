import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/stock_bloc.dart';
import '../bloc/stock_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:collection/collection.dart';
import '../../../../core/utils/currency_formatter.dart';
import 'expense_logs_page.dart';
import '../../domain/entities/expense.dart';
import '../../../invoicing/domain/services/report_generator.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';

class ProfitReportPage extends StatefulWidget {
  const ProfitReportPage({super.key});

  @override
  State<ProfitReportPage> createState() => _ProfitReportPageState();
}

class _ProfitReportPageState extends State<ProfitReportPage> {
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = DateTime(now.year, now.month, now.day);
    _endDate = DateTime(now.year, now.month, now.day, 23, 59, 59);
    _loadReport();
  }

  void _loadReport() {
    context.read<StockBloc>().add(LoadProfitReportRequested(
      start: _startDate,
      end: _endDate,
    ));
  }

  void _exportToPdf(ProfitReportLoaded state) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;

    final pdf = await ReportGenerator.buildProfitReportPDF(
      report: state.report,
      totalExpenses: state.totalExpenses,
      expenses: state.expenses,
      settings: settings,
      start: _startDate,
      end: _endDate,
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  // Removed _buildPdfSummaryRow as it's now in ReportGenerator

  void _printThermal(ProfitReportLoaded state) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;
    
    final commands = ReportGenerator.buildProfitThermalCommands(
      report: state.report,
      totalExpenses: state.totalExpenses,
      settings: settings,
      start: _startDate,
      end: _endDate,
    );

    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, settings.paperWidth));
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sending to printer...')),
    );
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _loadReport();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final currency = settingsState.settings?.currency ?? '₦';
        
        return Scaffold(
          appBar: AppBar(
            title: const Text('Profit Report'),
            actions: [
              IconButton(
                icon: const Icon(Icons.picture_as_pdf),
                tooltip: 'Export PDF',
                onPressed: () {
                  final state = context.read<StockBloc>().state;
                  if (state is ProfitReportLoaded) _exportToPdf(state);
                },
              ),
              IconButton(
                icon: const Icon(Icons.print),
                tooltip: 'Print Thermal',
                onPressed: () {
                  final state = context.read<StockBloc>().state;
                  if (state is ProfitReportLoaded) _printThermal(state);
                },
              ),
              IconButton(
                icon: const Icon(Icons.calendar_today),
                onPressed: () => _selectDateRange(context),
              ),
            ],
          ),
          body: BlocBuilder<StockBloc, StockState>(
            builder: (context, state) {
              if (state is StockLoading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (state is ProfitReportLoaded) {
                final report = state.report;
                final totalExpenses = state.totalExpenses;
                
                double totalGrossProfit = 0;
                for (var item in report) {
                  totalGrossProfit += (item['totalProfit'] as num).toDouble();
                }

                final netProfit = totalGrossProfit - totalExpenses;

                return SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildSummaryCard(totalGrossProfit, totalExpenses, netProfit, currency),
                      if (state.expenses.isNotEmpty && settingsState.settings?.showExpensePieChart == true) ...[
                        _buildExpensePieChart(state.expenses, currency),
                        const SizedBox(height: 16),
                      ],
                      const Divider(),
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Text(
                        'Period: ${_startDate.day}/${_startDate.month} - ${_endDate.day}/${_endDate.month}/${_endDate.year}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: report.length,
                      itemBuilder: (context, index) {
                        final item = report[index];
                        final qtySold = item['totalSold'] ?? 0;
                        final profit = (item['totalProfit'] as num).toDouble();
                        
                        if (qtySold == 0 && profit == 0) return const SizedBox.shrink();

                        return ListTile(
                          title: Text(item['name']),
                          subtitle: Text('Sold: $qtySold | Price: ${CurrencyFormatter.formatWithSymbol(item['price'], symbol: currency)} | Cost: ${CurrencyFormatter.formatWithSymbol(item['costPrice'], symbol: currency)}'),
                          trailing: Text(
                            CurrencyFormatter.formatWithSymbol(profit, symbol: currency),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: profit >= 0 ? Colors.green : Colors.red,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              );
              }

              if (state is StockError) {
                return Center(child: Text(state.message));
              }

              return const Center(child: Text('No report data found for this period.'));
            },
          ),
        );
      },
    );
  }

  Widget _buildSummaryCard(double gross, double expenses, double net, String currency) {
    return Card(
      margin: const EdgeInsets.all(16),
      elevation: 4,
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            _buildSummaryRow('Gross Profit:', gross, currency),
            const SizedBox(height: 8),
            _buildSummaryRow(
              'Total Expenses:', 
              -expenses, 
              currency, 
              color: Colors.red,
              onTapDetails: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ExpenseLogsPage(
                      initialStart: _startDate,
                      initialEnd: _endDate,
                    ),
                  ),
                );
                if (mounted) _loadReport();
              },
            ),
            const Divider(),
            _buildSummaryRow(
              'Net Profit:', 
              net, 
              currency, 
              isBold: true, 
              color: net >= 0 ? Colors.green[800] : Colors.red[800],
              fontSize: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, double value, String currency, {bool isBold = false, Color? color, double fontSize = 16, VoidCallback? onTapDetails}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
            if (onTapDetails != null) ...[
              const SizedBox(width: 8),
              InkWell(
                onTap: onTapDetails,
                child: const Text(
                  '(View Details)',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.blue,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ],
        ),
        Text(
          CurrencyFormatter.formatWithSymbol(value, symbol: currency),
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildExpensePieChart(List<Expense> expenses, String currency) {
    if (expenses.isEmpty) return const SizedBox.shrink();

    final grouped = groupBy(expenses, (Expense e) => e.category ?? 'Other');
    final totals = grouped.map((cat, list) => MapEntry(cat, list.fold(0.0, (sum, e) => sum + e.amount)));
    final totalAmount = totals.values.fold(0.0, (sum, amount) => sum + amount);

    final List<Color> colors = [
      Colors.blue,
      Colors.red,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.amber,
    ];

    final sections = totals.entries.mapIndexed((idx, entry) {
      final percentage = (entry.value / totalAmount) * 100;
      return PieChartSectionData(
        value: (entry.value / totalAmount) * 100,
        title: '${percentage.toStringAsFixed(0)}%',
        color: colors[idx % colors.length],
        radius: 50,
        titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      );
    }).toList();

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: PieChart(
              PieChartData(
                sections: sections,
                centerSpaceRadius: 40,
                sectionsSpace: 2,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: totals.entries.mapIndexed((idx, entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Container(width: 12, height: 12, color: colors[idx % colors.length]),
                    const SizedBox(width: 8),
                    Expanded(child: Text(entry.key, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
                    Text(CurrencyFormatter.formatWithSymbol(entry.value, symbol: currency), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              )).toList(),
            ),
          ),
        ],
      ),
    );
  }
}
