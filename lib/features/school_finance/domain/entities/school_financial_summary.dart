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
  /// Card and virtual-account money already used on a bill, after payouts.
  final double withdrawable;
  /// Successful remittances already taken from the Quasar pool.
  final double quasarRemitted;
  /// True when [withdrawable] came from the shared server balance.
  final bool sharedWithdrawable;

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
    this.withdrawable = 0,
    this.quasarRemitted = 0,
    this.sharedWithdrawable = false,
  });

  bool get needsVaInvestigation => quasarBalanceStatus == 'invify_overstated';

  SchoolFinancialSummary withSharedWithdrawable(double amount) {
    return SchoolFinancialSummary(
      totalRevenue: totalRevenue,
      outstandingFees: outstandingFees,
      paidStudentsCount: paidStudentsCount,
      owingStudentsCount: owingStudentsCount,
      totalStudents: totalStudents,
      lastUpdated: lastUpdated,
      cardCollected: cardCollected,
      vaTransferCollected: vaTransferCollected,
      cashCollected: cashCollected,
      quasarCollected: quasarCollected,
      quasarLiveBalance: quasarLiveBalance,
      invifyLoggedVa: invifyLoggedVa,
      quasarBalanceStatus: quasarBalanceStatus,
      withdrawable: amount,
      quasarRemitted: quasarRemitted,
      sharedWithdrawable: true,
    );
  }

  /// Card plus the live virtual-account balance shown beside it.
  double get quasarCardAndTransfer => cardCollected + vaTransferCollected;

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
        withdrawable,
        quasarRemitted,
        sharedWithdrawable,
      ];
}
