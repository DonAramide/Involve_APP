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
      .replaceAll(RegExp(r'[\s-]+'), '_');
  if (method.isEmpty) return InvoicePaymentRail.other;
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
  if (method == 'cash') return InvoicePaymentRail.cash;
  if (method == 'card' || method == 'pos') return InvoicePaymentRail.card;
  if (method == 'virtualaccount' ||
      method == 'virtual_account' ||
      method == 'va' ||
      method == 'va_transfer' ||
      method == 'parent_account' ||
      method == 'parent_transfer') {
    return InvoicePaymentRail.vaTransfer;
  }
  if (method == 'transfer' ||
      method == 'bank_transfer' ||
      method == 'company_bank' ||
      method == 'company_account') {
    return InvoicePaymentRail.bankTransfer;
  }
  return InvoicePaymentRail.other;
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
