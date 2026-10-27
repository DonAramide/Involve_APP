import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/admin/domain/services/internal_wallet_breakdown.dart';

void main() {
  test('internal wallet net is USER_WALLET credits minus debits', () {
    final breakdown = InternalWalletBreakdown.fromApi(
      displayed: 307.22,
      transactions: [
        {
          'account': 'USER_WALLET',
          'type': 'CREDIT',
          'amount': 400.22,
          'reference': 'IN-1',
          'created_at': '2026-10-01T10:00:00Z',
        },
        {
          'account': 'USER_WALLET',
          'type': 'DEBIT',
          'amount': 93,
          'reference': 'OUT-1',
          'created_at': '2026-10-02T10:00:00Z',
        },
        {
          'account': 'QUASAR_CLEARING',
          'type': 'DEBIT',
          'amount': 400.22,
          'reference': 'IN-1',
        },
      ],
    );

    expect(breakdown.credits, 400.22);
    expect(breakdown.debits, 93);
    expect(breakdown.net, 307.22);
    expect(breakdown.lines.map((line) => line.reference), ['IN-1', 'OUT-1']);
  });
}
