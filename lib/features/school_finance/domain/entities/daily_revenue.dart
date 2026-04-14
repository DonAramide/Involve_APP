import 'package:equatable/equatable.dart';

class DailyRevenue extends Equatable {
  final String date;
  final double revenue;

  const DailyRevenue({required this.date, required this.revenue});

  @override
  List<Object?> get props => [date, revenue];
}
