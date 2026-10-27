/// Internal Wallet on Admin Hub is USER_WALLET credits minus USER_WALLET debits.
/// It is not invoice collected and not parent credit.
class InternalWalletLine {
  final String reference;
  final String kind;
  final double amount;
  final DateTime? at;
  final String label;

  const InternalWalletLine({
    required this.reference,
    required this.kind,
    required this.amount,
    this.at,
    this.label = '',
  });

  bool get isCredit => kind == 'CREDIT';
}

class InternalWalletBreakdown {
  final List<InternalWalletLine> lines;
  final double displayed;

  const InternalWalletBreakdown({required this.lines, required this.displayed});

  double get credits => lines.where((line) => line.isCredit).fold(0.0, (sum, line) => sum + line.amount);

  double get debits => lines.where((line) => !line.isCredit).fold(0.0, (sum, line) => sum + line.amount);

  double get net => credits - debits;

  static InternalWalletBreakdown fromApi({
    required List<dynamic> transactions,
    required double displayed,
  }) {
    final lines = <InternalWalletLine>[];
    for (final raw in transactions) {
      if (raw is! Map) continue;
      final map = Map<String, dynamic>.from(raw);
      final account = '${map['account'] ?? ''}';
      if (account.isNotEmpty && account != 'USER_WALLET') continue;
      final kind = _kind(map);
      if (kind == null) continue;
      final amount = _amount(map);
      if (!(amount > 0)) continue;
      lines.add(InternalWalletLine(
        reference: '${map['reference'] ?? map['idempotency_key'] ?? map['ledger_id'] ?? '—'}',
        kind: kind,
        amount: amount,
        at: DateTime.tryParse('${map['created_at'] ?? ''}'),
        label: _label(map),
      ));
    }
    lines.sort((a, b) {
      final aAt = a.at ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bAt = b.at ?? DateTime.fromMillisecondsSinceEpoch(0);
      return aAt.compareTo(bAt);
    });
    return InternalWalletBreakdown(lines: lines, displayed: displayed);
  }

  static String? _kind(Map<String, dynamic> map) {
    final signed = _num(map['signed_amount']);
    if (signed != null && signed < 0) return 'DEBIT';
    if (signed != null && signed > 0) return 'CREDIT';
    final raw = '${map['entry_type'] ?? map['type'] ?? map['presentation_kind'] ?? ''}'.toUpperCase();
    if ([
      'CREDIT',
      'VIRTUAL_ACCOUNT_CREDIT',
      'DEPOSIT',
      'INWARD',
      'INWARD_PAYMENT',
      'CARD_PAYMENT',
      'INBOUND_CREDIT',
    ].contains(raw)) {
      return 'CREDIT';
    }
    if (['DEBIT', 'WITHDRAWAL', 'SWEEP', 'PAYOUT_PRINCIPAL', 'FEE_DEBIT'].contains(raw)) {
      return 'DEBIT';
    }
    return null;
  }

  static double _amount(Map<String, dynamic> map) {
    final signed = _num(map['signed_amount']);
    if (signed != null) return signed.abs();
    return _num(map['amount']) ?? 0;
  }

  static double? _num(dynamic value) {
    if (value is num) return value.toDouble();
    return double.tryParse('${value ?? ''}');
  }

  static String _label(Map<String, dynamic> map) {
    final meta = map['metadata'];
    if (meta is Map) {
      final source = '${meta['source'] ?? meta['type'] ?? meta['paidVia'] ?? ''}'.trim();
      if (source.isNotEmpty) return source;
    }
    return '${map['presentation_kind'] ?? map['type'] ?? ''}'.trim();
  }
}
