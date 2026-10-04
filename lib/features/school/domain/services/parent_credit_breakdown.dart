import 'package:involve_app/features/school/domain/entities/school_entities.dart';

/// Parent credit is the live Quasar balance on this parent's virtual account,
/// plus cash, school-account, and card money that never hit that account,
/// minus credit already mapped onto children.
class ParentCreditParts {
  final double quasarBalance;
  final double cash;
  final double schoolAccount;
  final double card;
  final double mappedToChildren;

  const ParentCreditParts({
    required this.quasarBalance,
    required this.cash,
    required this.schoolAccount,
    required this.card,
    required this.mappedToChildren,
  });

  double get additional => _round(cash + schoolAccount + card);

  double get recalculated {
    final total = _round(quasarBalance + additional - mappedToChildren);
    return total < 0 ? 0 : total;
  }

  static ParentCreditParts fromPayments({
    required double quasarBalance,
    required List<ParentPaymentRecord> payments,
  }) {
    double cash = 0;
    double schoolAccount = 0;
    double card = 0;
    double mapped = 0;
    for (final payment in payments) {
      switch (payment.source) {
        case 'cash':
          cash += payment.toCredit;
        case 'company_account':
          schoolAccount += payment.toCredit;
        case 'pos':
          card += payment.toCredit;
        case 'credit_map':
          mapped += payment.amount;
        default:
          break;
      }
    }
    return ParentCreditParts(
      quasarBalance: _round(quasarBalance),
      cash: _round(cash),
      schoolAccount: _round(schoolAccount),
      card: _round(card),
      mappedToChildren: _round(mapped),
    );
  }

  /// Live Quasar balance stamped on this parent's virtual-account rows only.
  /// Returns null when the server did not send a balance.
  static double? quasarBalanceFromRows(List<dynamic> rows) {
    double? live;
    for (final raw in rows) {
      if (raw is! Map) continue;
      final metadata = raw['metadata'];
      if (metadata is! Map) continue;
      final value = metadata['liveBalance'];
      final parsed = value is num ? value.toDouble() : double.tryParse('$value');
      if (parsed == null) continue;
      live = parsed;
    }
    return live == null ? null : _round(live);
  }

  static double _round(double value) => (value * 100).round() / 100.0;
}
