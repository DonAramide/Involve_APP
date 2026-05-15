import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:involve_app/core/utils/currency_formatter.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';
import '../../domain/entities/service_analytics.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import '../../../../core/widgets/invify_loading_indicator.dart';

class ServicesAnalyticsPage extends StatefulWidget {
  const ServicesAnalyticsPage({super.key});

  @override
  State<ServicesAnalyticsPage> createState() => _ServicesAnalyticsPageState();
}

class _ServicesAnalyticsPageState extends State<ServicesAnalyticsPage> {
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _endDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
    context.read<ServicesBloc>().add(const LoadServiceExpenseCategories());
  }

  void _loadAnalytics() {
    context.read<ServicesBloc>().add(LoadServicesAnalytics(
          start: DateTime(_startDate.year, _startDate.month, _startDate.day),
          end: DateTime(_endDate.year, _endDate.month, _endDate.day, 23, 59, 59),
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_chart),
            tooltip: 'Log Service Expense',
            onPressed: _showLogExpenseDialog,
          ),
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _selectDateRange,
          ),
        ],
      ),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          if (state.status == ServicesStatus.loading && state.analytics == null) {
            return const InvifyLoadingIndicator(message: 'ANALYZING SERVICE MATRICES...');
          }

          if (state.analytics != null) {
            return _buildContent(state.analytics!);
          }

          if (state.status == ServicesStatus.error) {
            return Center(child: Text(state.errorMessage ?? 'Error loading analytics'));
          }

          return const Center(child: Text('Loading analytics...'));
        },
      ),
    );
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _loadAnalytics();
    }
  }

  Widget _buildContent(ServiceAnalytics analytics) {
    final currency = context.read<SettingsBloc>().state.settings?.currency ?? '₦';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCards(analytics, currency),
          const SizedBox(height: 24),
          const Text('Revenue Trend', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildRevenueChart(analytics),
          const SizedBox(height: 32),
          const Text('Expense Breakdown', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildExpenseChart(analytics, currency),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(ServiceAnalytics analytics, String currency) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Revenue',
            analytics.grossRevenue,
            currency,
            Colors.blue,
            Icons.account_balance_wallet,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Expenses',
            analytics.totalExpenses,
            currency,
            Colors.red,
            Icons.trending_down,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Profit',
            analytics.netProfit,
            currency,
            Colors.green,
            Icons.trending_up,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, double amount, String currency, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(color: color.withOpacity(0.8), fontSize: 12)),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(
              CurrencyFormatter.formatWithSymbol(amount, symbol: currency),
              style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueChart(ServiceAnalytics analytics) {
    if (analytics.revenueTrend.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('No data for this period')));
    }

    final spots = analytics.revenueTrend.asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.amount);
    }).toList();

    final maxY = spots.isEmpty ? 100.0 : spots.map((e) => e.y).reduce((a, b) => a > b ? a : b);
    final chartMaxY = maxY < 1000 ? 1000.0 : maxY * 1.2;

    return Container(
      height: 250,
      padding: const EdgeInsets.only(left: 8, right: 24, top: 16, bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: LineChart(
        LineChartData(
          minY: 0,
          maxY: chartMaxY,
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (val) => FlLine(color: Colors.grey.withOpacity(0.1), strokeWidth: 1),
          ),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 22,
                interval: (analytics.revenueTrend.length / 4).clamp(1, 30).toDouble(),
                getTitlesWidget: (val, meta) {
                  int idx = val.toInt();
                  if (idx >= 0 && idx < analytics.revenueTrend.length) {
                    final d = analytics.revenueTrend[idx].date;
                    return Text('${d.day}/${d.month}', style: const TextStyle(fontSize: 10, color: Colors.grey));
                  }
                  return const Text('');
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: Theme.of(context).primaryColor,
              barWidth: 4,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).primaryColor.withOpacity(0.3),
                    Theme.of(context).primaryColor.withOpacity(0.0),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpenseChart(ServiceAnalytics analytics, String currency) {
    if (analytics.expenseBreakdown.isEmpty) {
      return const Center(child: Text('No expenses recorded for services.'));
    }

    final sections = analytics.expenseBreakdown.entries.map((e) {
      final color = Colors.primaries[analytics.expenseBreakdown.keys.toList().indexOf(e.key) % Colors.primaries.length];
      return PieChartSectionData(
        value: e.value,
        title: '${(e.value / analytics.totalExpenses * 100).toStringAsFixed(0)}%',
        color: color,
        radius: 60,
        titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
      );
    }).toList();

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Row(
        children: [
          Expanded(
            child: PieChart(
              PieChartData(
                sections: sections,
                centerSpaceRadius: 40,
                sectionsSpace: 4,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: analytics.expenseBreakdown.entries.map((e) {
                  final color = Colors.primaries[analytics.expenseBreakdown.keys.toList().indexOf(e.key) % Colors.primaries.length];
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(e.key, style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis)),
                        Text(CurrencyFormatter.formatWithSymbol(e.value, symbol: currency), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogExpenseDialog() {
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String? selectedCategory;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Log Service Expense'),
          content: BlocBuilder<ServicesBloc, ServicesState>(
            builder: (context, state) {
              final cats = state.serviceExpenseCategories.map((c) => c.name).toList();
              if (!cats.contains('Services')) cats.add('Services');

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    value: selectedCategory,
                    decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()),
                    items: cats.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (val) => setDialogState(() => selectedCategory = val),
                    hint: const Text('Select Category'),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: amountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Amount', prefixText: '₦ ', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descCtrl,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Description (e.g. Fuel, Tools)', border: OutlineInputBorder()),
                  ),
                ],
              );
            },
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                final amt = double.tryParse(amountCtrl.text) ?? 0.0;
                if (amt > 0 && descCtrl.text.isNotEmpty && selectedCategory != null) {
                  context.read<ServicesBloc>().add(AddServiceExpense(
                        amount: amt,
                        description: descCtrl.text,
                        category: selectedCategory!,
                        start: _startDate,
                        end: _endDate,
                      ));
                  Navigator.pop(context);
                } else if (selectedCategory == null) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a category')));
                }
              },
              child: const Text('Save Expense'),
            ),
          ],
        ),
      ),
    );
  }
}
