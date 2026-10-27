/// Canonical parent-wallet classification shared by every school payment path.
/// Mirrors `isSchoolParentWalletPayment` in virtual-account-ownership.ts.
bool isParentWalletPaymentMethod(String? method) {
  final value = (method ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  return value == 'parent_credit' ||
      value.contains('parent_credit') ||
      value == 'parent_wallet' ||
      value.contains('parent_wallet');
}

bool isSchoolParentWalletPayment(
  String? method, {
  String? businessMode,
  int? studentId,
  String? studentIdRaw,
}) {
  if (isParentWalletPaymentMethod(method)) return true;
  final value = (method ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_');
  if (value != 'wallet' && value != 'parent_wallet') return false;
  final mode = (businessMode ?? '').trim().toLowerCase();
  if (mode == 'school') return true;
  final raw = (studentIdRaw ?? '').trim();
  return studentId != null || raw.isNotEmpty;
}
