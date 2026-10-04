import 'package:equatable/equatable.dart';

class SchoolFinancialSummary extends Equatable {
  final double totalRevenue;
  final double outstandingFees;
  final int paidStudentsCount;
  final int owingStudentsCount;
  final int totalStudents;
  final DateTime lastUpdated;
  /// POS / card collected through Quasar.
  final double cardCollected;
  /// Virtual-account transfer collected through Quasar.
  final double vaTransferCollected;
  final double cashCollected;
  /// Quasar collective = card + VA transfer.
  final double quasarCollected;
  /// Live PSP VA total (null when Quasar could not be queried).
  final double? quasarLiveBalance;
  /// Invify transactions_log unswept VA (can be doubled by tablet + webhook).
  final double invifyLoggedVa;
  /// ok | quasar_ahead | invify_overstated
  final String quasarBalanceStatus;

  const SchoolFinancialSummary({
    required this.totalRevenue,
    required this.outstandingFees,
    required this.paidStudentsCount,
    required this.owingStudentsCount,
    required this.totalStudents,
    required this.lastUpdated,
    this.cardCollected = 0,
    this.vaTransferCollected = 0,
    this.cashCollected = 0,
    this.quasarCollected = 0,
    this.quasarLiveBalance,
    this.invifyLoggedVa = 0,
    this.quasarBalanceStatus = 'ok',
  });

  bool get needsVaInvestigation => quasarBalanceStatus == 'invify_overstated';

  double get quasarCardAndTransfer =>
      quasarCollected > 0.001 ? quasarCollected : cardCollected + vaTransferCollected;

  @override
  List<Object?> get props => [
        totalRevenue,
        outstandingFees,
        paidStudentsCount,
        owingStudentsCount,
        totalStudents,
        lastUpdated,
        cardCollected,
        vaTransferCollected,
        cashCollected,
        quasarCollected,
        quasarLiveBalance,
        invifyLoggedVa,
        quasarBalanceStatus,
      ];
}
