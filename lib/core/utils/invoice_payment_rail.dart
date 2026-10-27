/// Pay later has no cash, transfer, card, or wallet yet — still outstanding.
bool isPayLaterPaymentMethod(String? raw) {
  final method = (raw ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
  if (method.isEmpty) return false;
  if (method.contains('wallet') ||
      method.contains('cash') ||
      method.contains('pos') ||
      method.contains('card') ||
      method.contains('transfer') ||
      method.contains('virtual')) {
    return false;
  }
  return method == 'deferred' ||
      method == 'pay_later' ||
      method == 'paylater' ||
      method.contains('pay_later') ||
      method.contains('deferred');
}

/// Payment rails for dashboards. Quasar = card (POS) + virtual-account transfer.
enum InvoicePaymentRail {
  cash,
  card,
  vaTransfer,
  bankTransfer,
  wallet,
  other,
}

InvoicePaymentRail classifyInvoicePaymentRail(String? raw) {
  final method = (raw ?? '')
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
      .replaceAll(RegExp(r'^_+|_+$'), '');
  if (method.isEmpty) return InvoicePaymentRail.other;
  if (method == 'parent_credit' || method.contains('parent_credit')) {
    return InvoicePaymentRail.wallet;
  }
  if (method == 'wallet' ||
      method == 'customer_wallet' ||
      method.endsWith('_wallet') ||
      method.contains('wallet')) {
    if (method == 'wallet' ||
        method == 'customer_wallet' ||
        method.contains('deferred') ||
        (!method.contains('cash') &&
            !method.contains('pos') &&
            !method.contains('card') &&
            !method.contains('transfer') &&
            !method.contains('virtual'))) {
      return InvoicePaymentRail.wallet;
    }
  }
  if (method.contains('virtualaccount') ||
      method.contains('virtual_account') ||
      method == 'va' ||
      method.contains('va_transfer') ||
      method == 'parent_account' ||
      method == 'parent_transfer') {
    return InvoicePaymentRail.vaTransfer;
  }
  if (method == 'cash') return InvoicePaymentRail.cash;
  if (method == 'card' ||
      method == 'pos' ||
      method.contains('pos') ||
      method.contains('card') ||
      method.contains('mpos') ||
      method.contains('nibss')) {
    return InvoicePaymentRail.card;
  }
  if (method == 'transfer' ||
      method == 'bank_transfer' ||
      method == 'company_bank' ||
      method == 'company_account' ||
      method.contains('company_bank') ||
      method.contains('company_account') ||
      method.contains('transfer')) {
    return InvoicePaymentRail.bankTransfer;
  }
  return InvoicePaymentRail.other;
}

/// Parent-wallet bills stay on the school wallet.
/// VA transfer is only a virtual account created for the school or its staff.
/// Cash and company-bank transfer stay on their own rails.
InvoicePaymentRail classifySalesRail(String? method, {String? originRail}) {
  return classifyInvoicePaymentRail(method);
}

bool isQuasarPaymentRail(InvoicePaymentRail rail) {
  return rail == InvoicePaymentRail.card || rail == InvoicePaymentRail.vaTransfer;
}

/// Live-transaction chip: Card and Quasar VA both count as Quasar rails.
String paymentRailChannelLabel(String? raw) {
  switch (classifyInvoicePaymentRail(raw)) {
    case InvoicePaymentRail.card:
      return 'Card';
    case InvoicePaymentRail.vaTransfer:
      return 'Transfer';
    case InvoicePaymentRail.bankTransfer:
      return 'Bank';
    case InvoicePaymentRail.cash:
      return 'Cash';
    case InvoicePaymentRail.wallet:
      return 'Wallet';
    case InvoicePaymentRail.other:
      return (raw ?? 'Other').trim().isEmpty ? 'Other' : raw!.trim();
  }
}
