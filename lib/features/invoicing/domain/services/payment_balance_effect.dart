import 'package:involve_app/features/invoicing/domain/services/parent_wallet_payment.dart';

/// Unconfirmed Transfer / Virtual Account must not reduce open student or
/// customer balances. Cash, card, POS still do. Parent-wallet paths wait for
/// server acknowledgement before confirmed collected/spendable totals move.
bool isUnconfirmedTransferMethod(String method) {
  final normalized = method.trim().toLowerCase();
  return normalized == 'transfer' ||
      normalized == 'virtualaccount' ||
      normalized == 'va transfer' ||
      normalized == 'virtual_account';
}

bool shouldReduceOpenBalances(
  String method, {
  String? businessMode,
  int? studentId,
}) {
  if (isUnconfirmedTransferMethod(method)) return false;
  if (isSchoolParentWalletPayment(
    method,
    businessMode: businessMode,
    studentId: studentId,
  )) {
    return false;
  }
  return true;
}
