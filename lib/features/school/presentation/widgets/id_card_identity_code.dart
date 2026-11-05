/// 12-character Invify printed identity: SSSBBBBBBBBB (org + beneficiary).
final _identityCodePattern = RegExp(r'^[A-Z0-9]{12}$');

/// True when [value] is a printable Invify Code 128 identity (not a gate token).
bool isInvifyIdentityCode(String? value) {
  final s = (value ?? '').trim().toUpperCase();
  return _identityCodePattern.hasMatch(s);
}

/// Resolve the Code 128 payload from issue/preview face fields.
/// Never returns the long opaque verification token.
String? resolveCardIdentityCode({
  Map<String, dynamic>? face,
  String? barcodeValue,
  String? cardIdentityCode,
}) {
  final candidates = <String?>[
    face?['cardIdentityCode']?.toString(),
    face?['invifyCode']?.toString(),
    face?['card_identity_code']?.toString(),
    cardIdentityCode,
    // barcodeValue only if it is already the 12-char identity
    face?['barcodeValue']?.toString(),
    barcodeValue,
  ];
  for (final raw in candidates) {
    final s = (raw ?? '').trim().toUpperCase();
    if (isInvifyIdentityCode(s)) return s;
  }
  return null;
}
