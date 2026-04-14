import 'package:equatable/equatable.dart';

class ServiceAnalytics extends Equatable {
  final double grossRevenue;
  final double totalExpenses;
  final double netProfit;
  final List<RevenueDataPoint> revenueTrend;
  final Map<String, double> expenseBreakdown;

  const ServiceAnalytics({
    required this.grossRevenue,
    required this.totalExpenses,
    required this.netProfit,
    required this.revenueTrend,
    required this.expenseBreakdown,
  });

  @override
  List<Object?> get props => [
        grossRevenue,
        totalExpenses,
        netProfit,
        revenueTrend,
        expenseBreakdown,
      ];
}

class RevenueDataPoint extends Equatable {
  final DateTime date;
  final double amount;

  const RevenueDataPoint(this.date, this.amount);

  @override
  List<Object?> get props => [date, amount];
}
