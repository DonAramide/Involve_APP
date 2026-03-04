import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_bloc.dart';
import 'package:involve_app/features/stock/presentation/bloc/stock_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import 'package:collection/collection.dart';
import 'package:involve_app/features/stock/domain/entities/expense.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../invoicing/domain/services/report_generator.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_state.dart';

class ExpenseLogsPage extends StatefulWidget {
  final DateTime? initialStart;
  final DateTime? initialEnd;

  const ExpenseLogsPage({super.key, this.initialStart, this.initialEnd});

  @override
  State<ExpenseLogsPage> createState() => _ExpenseLogsPageState();
}

class _ExpenseLogsPageState extends State<ExpenseLogsPage> {
  late DateTime _startDate;
  late DateTime _endDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = widget.initialStart ?? DateTime(now.year, now.month, now.day);
    _endDate = widget.initialEnd ?? DateTime(now.year, now.month, now.day, 23, 59, 59);
    _loadExpenses();
  }

  void _loadExpenses() {
    context.read<StockBloc>().add(LoadExpensesRequested(
      start: _startDate,
      end: _endDate,
    ));
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
      _loadExpenses();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsBloc, SettingsState>(
      builder: (context, settingsState) {
        final currency = settingsState.settings?.currency ?? '₦';

        return Scaffold(
          appBar: AppBar(
            title: const Text('Expense Logs'),
            actions: [
              IconButton(
                icon: const Icon(Icons.picture_as_pdf),
                tooltip: 'Export PDF',
                onPressed: () {
                  final state = context.read<StockBloc>().state;
                  if (state is ExpensesLoaded) _exportToPdf(state);
                },
              ),
              IconButton(
                icon: const Icon(Icons.print),
                tooltip: 'Print Thermal',
                onPressed: () {
                  final state = context.read<StockBloc>().state;
                  if (state is ExpensesLoaded) _printThermal(state);
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

              if (state is ExpensesLoaded) {
                if (state.expenses.isEmpty) {
                  return const Center(child: Text('No expenses found for this period.'));
                }

                final grouped = groupBy(state.expenses, (Expense e) {
                  return DateTime(e.date.year, e.date.month, e.date.day);
                });

                final sortedDates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

                return ListView.builder(
                  itemCount: sortedDates.length,
                  itemBuilder: (context, index) {
                    final date = sortedDates[index];
                    final dailyExpenses = grouped[date]!;
                    final dailyTotal = dailyExpenses.fold(0.0, (sum, e) => sum + e.amount);

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: double.infinity,
                          color: Colors.grey[200],
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${date.day}/${date.month}/${date.year}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Total: ${CurrencyFormatter.formatWithSymbol(dailyTotal, symbol: currency)}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
                              ),
                            ],
                          ),
                        ),
                        ...dailyExpenses.map((expense) => ListTile(
                          title: Text(expense.category ?? 'Other'),
                          subtitle: Text(expense.description),
                          trailing: Text(
                            CurrencyFormatter.formatWithSymbol(expense.amount, symbol: currency),
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
                          ),
                        )),
                      ],
                    );
                  },
                );
              }

              if (state is StockError) {
                return Center(child: Text(state.message));
              }

              return const Center(child: Text('Enter a date range to view expenses.'));
            },
          ),
        );
      },
    );
  }
  void _exportToPdf(ExpensesLoaded state) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;

    final pdf = await ReportGenerator.buildExpenseLogsPDF(
      expenses: state.expenses,
      settings: settings,
      start: _startDate,
      end: _endDate,
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }

  void _printThermal(ExpensesLoaded state) async {
    final settings = context.read<SettingsBloc>().state.settings;
    if (settings == null) return;
    
    final commands = ReportGenerator.buildExpenseLogsThermalCommands(
      expenses: state.expenses,
      settings: settings,
      start: _startDate,
      end: _endDate,
    );

    context.read<PrinterBloc>().add(PrintCommandsEvent(commands, settings.paperWidth));
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sending to printer...')),
    );
  }
}
