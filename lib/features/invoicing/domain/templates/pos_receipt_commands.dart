import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/services/mpos_service.dart';

/// Thermal POS / card-payment slip lines (standalone or appended under an invoice).
List<PrintCommand> buildPosReceiptCommands({
  required MposTransactionData tx,
  String? merchantName,
  String? terminalId,
  String? currency,
  String? copyType,
  bool isMerged = false,
}) {
  final cur = (currency == null || currency.isEmpty) ? 'NGN' : currency;
  final amount = (tx.amount ?? '').trim().isEmpty ? '0.00' : tx.amount!.trim();
  final pan = _maskPan(tx.maskedPan);
  final holder = (tx.cardHolderName ?? '').trim().isEmpty
      ? 'N/A'
      : tx.cardHolderName!.trim();
  final cardType = (tx.appLabel ?? '').trim().isEmpty
      ? (tx.aid ?? 'CARD')
      : tx.appLabel!.trim();
  final when = (tx.dateTime ?? '').trim().isEmpty
      ? DateTime.now().toString().split('.').first
      : tx.dateTime!.trim();
  final tid = (terminalId ?? '').trim().isEmpty ? 'N/A' : terminalId!.trim();
  final name = (merchantName ?? '').trim();

  return [
    TextCommand('================================', align: 'center'),
    TextCommand('POS PAYMENT RECEIPT', isBold: true, align: 'center'),
    if (copyType != null && copyType.trim().isNotEmpty)
      TextCommand('*** ${copyType.trim()} ***', align: 'center', isBold: true),
    TextCommand('================================', align: 'center'),
    if (!isMerged && name.isNotEmpty) TextCommand(name, align: 'center'),
    TextCommand('Terminal ID: $tid', align: 'center'),
    SizedBoxCommand(height: 1),
    TextCommand('Card Holder: $holder'),
    TextCommand('Card Type: $cardType'),
    TextCommand('PAN: $pan'),
    TextCommand('Amount: $cur $amount', isBold: true),
    TextCommand('Auth Code: ${tx.authCode ?? 'N/A'}'),
    TextCommand('RRN: ${tx.rrn ?? 'N/A'}'),
    TextCommand('STAN: ${tx.stan ?? 'N/A'}'),
    TextCommand('Date: $when'),
    if ((tx.statusCode ?? '').isNotEmpty)
      TextCommand('Resp Code: ${tx.statusCode}'),
    TextCommand('================================', align: 'center'),
    TextCommand(
      tx.paymentSuccess ? 'APPROVED' : (tx.message ?? 'DECLINED'),
      isBold: true,
      align: 'center',
    ),
    TextCommand('================================', align: 'center'),
  ];
}

/// Fill missing receipt fields from EMV map returned by the mPOS SDK.
MposTransactionData enrichPosTransactionFromEmv(
  MposTransactionData? tx,
  EmvData? emv, {
  double? amountFallback,
}) {
  final data = emv?.data ?? const <String, dynamic>{};
  final base = tx ??
      MposTransactionData(
        paymentSuccess: true,
        amount: amountFallback?.toStringAsFixed(2),
      );

  String? pick(String? current, List<String> keys) {
    if (current != null && current.trim().isNotEmpty) return current;
    for (final k in keys) {
      final v = data[k]?.toString().trim();
      if (v != null && v.isNotEmpty) return v;
    }
    return current;
  }

  String? amount = pick(base.amount, ['amount']);
  if (amount == null || amount.isEmpty) {
    final authNum = data['amountAuthorisedNumeric']?.toString().trim();
    if (authNum != null && authNum.isNotEmpty && RegExp(r'^\d+$').hasMatch(authNum)) {
      amount = (int.parse(authNum) / 100).toStringAsFixed(2);
    } else {
      amount = amountFallback?.toStringAsFixed(2);
    }
  }

  final panRaw = pick(base.maskedPan, ['maskedPan', 'cardNo', 'pan', 'cardNumber']);
  return MposTransactionData(
    aid: pick(base.aid, ['aid', 'AID']),
    amount: amount,
    cashbackAmount: base.cashbackAmount,
    appLabel: pick(base.appLabel, ['applicationLabel', 'appLabel', 'cardLabel']),
    authCode: pick(base.authCode, ['authCode', 'authorizationCode', 'auth_code']),
    cardExpireDate: pick(base.cardExpireDate, ['cardExpirationDate', 'cardExpireDate', 'expDate']),
    cardHolderName: pick(base.cardHolderName, ['cardHolderName', 'cardholderName']),
    dateTime: pick(base.dateTime, ['transactionDate', 'dateTime', 'datetime']) ??
        DateTime.now().toString().split('.').first,
    maskedPan: _maskPan(panRaw),
    message: base.message,
    rrn: pick(base.rrn, ['rrn', 'retrievalReferenceNumber']),
    stan: pick(base.stan, ['stan', 'systemTraceAuditNumber']),
    statusCode: base.statusCode ?? '00',
    transactionType: pick(base.transactionType, ['transactionType']),
    paymentSuccess: base.paymentSuccess,
    balance: base.balance,
    currencyCode: base.currencyCode,
  );
}

String _maskPan(String? pan) {
  final p = (pan ?? '').replaceAll(RegExp(r'\s'), '');
  if (p.isEmpty) return 'N/A';
  if (p.contains('*')) return p;
  if (p.length >= 10) {
    return '${p.substring(0, 6)}****${p.substring(p.length - 4)}';
  }
  return p;
}
